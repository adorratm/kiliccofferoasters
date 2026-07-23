import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User,
  AuthProvider,
  UserRole,
} from '@entities/user.entity';
import { AdminAllowlist } from '@entities/admin-allowlist.entity';
import { LoginDto, RegisterDto } from '@modules/auth/dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  user: Omit<User, 'passwordHash'>;
}

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
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
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

    // Mevcut hesaba Google’ı bağla — şifreyi silme
    user.providerId = input.providerId;
    user.emailVerified = true;
    if (user.passwordHash) {
      // Yerel kayıt kalır; şifre + Google birlikte kullanılabilir
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

  private sanitize(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...rest } = user;
    return rest;
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
