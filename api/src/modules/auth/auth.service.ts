import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  User,
  AuthProvider,
  UserRole,
} from '@entities/user.entity';
import { AdminAllowlist } from '@entities/admin-allowlist.entity';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '@modules/auth/dto/auth.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { resolveFrontendUrl } from '@modules/notifications/notification.templates';

export interface AuthTokens {
  accessToken: string;
  user: PublicUser;
}

export type PublicUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  provider: AuthProvider;
  providerId: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface OAuthProfileInput {
  email: string;
  provider: AuthProvider;
  providerId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  asAdmin?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.em.findOne(User, { where: { email } });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = await this.resolveRole(email, false);
    const user = this.em.create(User, {
      email,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      provider: AuthProvider.LOCAL,
      role,
      emailVerified: false,
      isActive: true,
    });
    await this.em.save(user);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.em.findOne(User, { where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Hesap pasif');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Her zaman aynı yanıt — e-posta numaralandırmayı engeller.
   * Yerel şifresi olmayan (yalnızca OAuth) hesaplara mail gönderilmez.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.em.findOne(User, { where: { email } });

    if (user?.isActive && user.passwordHash) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = this.hashToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.em.save(user);

      const frontendUrl = resolveFrontendUrl(this.config);
      const resetUrl = `${frontendUrl}/sifre-sifirla?token=${encodeURIComponent(token)}`;
      const name = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      try {
        await this.notifications.sendPasswordResetEmail({
          email: user.email,
          name: name || null,
          resetUrl,
        });
      } catch (err) {
        this.logger.warn(
          `Password reset email failed for ${email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    const tokenHash = this.hashToken(dto.token.trim());
    const user = await this.em.findOne(User, {
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Sıfırlama bağlantısı geçersiz veya süresi dolmuş',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesap pasif');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.provider = AuthProvider.LOCAL;
    await this.em.save(user);
    return { ok: true };
  }

  /**
   * Yerel şifre varsa mevcut şifre doğrulanır.
   * Yalnızca Google ile kayıtlıysa (passwordHash yok) JWT yeterli — ilk şifre belirlenir.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ ok: true; hasPassword: true }> {
    const user = await this.em.findOne(User, {
      where: { id: userId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new UnauthorizedException('Mevcut şifre gerekli');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Mevcut şifre hatalı');
      }
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    // Google bağlı kalsın; e-posta/şifre + Google birlikte kullanılabilir
    user.provider = AuthProvider.LOCAL;
    await this.em.save(user);
    return { ok: true, hasPassword: true };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.em.findOne(User, {
      where: { id: userId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    return this.sanitize(user);
  }

  /**
   * Google (OAuth) girişi:
   * - Aynı Google kimliği varsa o kullanıcı
   * - Yoksa aynı e-posta ile kayıtlı hesap varsa ona bağlanır (ayrı kullanıcı açılmaz)
   * - Hiçbiri yoksa yeni kullanıcı oluşturulur
   * Yerel şifre varsa korunur; hem e-posta/şifre hem Google ile giriş mümkün kalır
   */
  async findOrCreateOAuthUser(input: OAuthProfileInput): Promise<User> {
    const email = input.email.toLowerCase().trim();
    if (input.asAdmin) {
      const allowed = await this.isAdminEmail(email);
      if (!allowed) {
        throw new ForbiddenException(
          'Bu e-posta admin allowlist’te değil',
        );
      }
    }

    let user =
      (await this.em.findOne(User, {
        where: {
          provider: input.provider,
          providerId: input.providerId,
        },
      })) || null;

    if (!user && input.providerId) {
      user = await this.em.findOne(User, {
        where: { providerId: input.providerId },
      });
    }

    if (!user) {
      user = await this.em.findOne(User, { where: { email } });
    }

    if (!user) {
      const role = await this.resolveRole(email, !!input.asAdmin);
      user = this.em.create(User, {
        email,
        passwordHash: null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        provider: input.provider,
        providerId: input.providerId,
        avatarUrl: input.avatarUrl ?? null,
        role,
        emailVerified: true,
        isActive: true,
      });
      await this.em.save(user);
      return user;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesap pasif');
    }

    user.providerId = input.providerId;
    user.emailVerified = true;
    if (user.passwordHash) {
      user.provider = AuthProvider.LOCAL;
    } else {
      user.provider = input.provider;
    }
    if (input.firstName && !user.firstName) user.firstName = input.firstName;
    if (input.lastName && !user.lastName) user.lastName = input.lastName;
    if (input.avatarUrl && !user.avatarUrl) user.avatarUrl = input.avatarUrl;

    if (input.asAdmin || (await this.isAdminEmail(email))) {
      user.role = UserRole.ADMIN;
    }

    await this.em.save(user);
    return user;
  }

  buildAuthResponse(user: User): AuthTokens {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: this.sanitize(user) };
  }

  private sanitize(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      provider: user.provider,
      providerId: user.providerId,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      hasPassword: Boolean(user.passwordHash),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async isAdminEmail(email: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const envList = this.config.get<string[]>('adminAllowlist') || [];
    if (envList.includes(normalized)) {
      return true;
    }
    const row = await this.em.findOne(AdminAllowlist, {
      where: { email: normalized, active: true },
    });
    return !!row;
  }

  private async resolveRole(
    email: string,
    forceAdmin: boolean,
  ): Promise<UserRole> {
    if (forceAdmin || (await this.isAdminEmail(email))) {
      return UserRole.ADMIN;
    }
    return UserRole.CUSTOMER;
  }
}
