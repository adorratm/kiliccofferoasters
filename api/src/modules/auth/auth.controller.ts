import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as passport from 'passport';
import { AuthService } from '@modules/auth/auth.service';
import { LoginDto, RegisterDto } from '@modules/auth/dto/auth.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'E-posta/şifre ile kayıt' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'E-posta/şifre ile giriş' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Oturumdaki kullanıcı' })
  me(@CurrentUser() user: User) {
    return this.authService.me(user.id);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth başlat' })
  googleAuth() {
    return;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.redirectWithToken(req.user as User, res, 'frontend');
  }

  @Public()
  @Get('google/admin')
  @UseGuards(AuthGuard('google-admin'))
  @ApiOperation({ summary: 'Admin Google OAuth başlat' })
  googleAdminAuth() {
    return;
  }

  @Public()
  @Get('google/admin/callback')
  @ApiOperation({ summary: 'Admin Google OAuth callback' })
  googleAdminCallback(@Req() req: Request, @Res() res: Response) {
    const adminBase = (
      this.config.get<string>('adminUrl') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    return passport.authenticate(
      'google-admin',
      (
        err: Error | null,
        user: User | false,
        info: { message?: string } | undefined,
      ) => {
        if (err || !user) {
          const raw =
            err?.message || info?.message || 'Admin girişi reddedildi';
          const message = /allowlist/i.test(raw)
            ? 'Bu e-posta admin allowlist’te değil'
            : raw;
          return res.redirect(
            `${adminBase}/login?error=${encodeURIComponent(message)}`,
          );
        }
        return this.redirectWithToken(user, res, 'admin');
      },
    )(req, res, (() => undefined) as NextFunction);
  }

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth başlat' })
  facebookAuth() {
    return;
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  facebookCallback(@Req() req: Request, @Res() res: Response) {
    return this.redirectWithToken(req.user as User, res, 'frontend');
  }

  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth başlat' })
  appleAuth() {
    return;
  }

  @Public()
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  appleCallback(@Req() req: Request, @Res() res: Response) {
    return this.redirectWithToken(req.user as User, res, 'frontend');
  }

  private redirectWithToken(
    user: User,
    res: Response,
    target: 'frontend' | 'admin',
  ) {
    const { accessToken } = this.authService.buildAuthResponse(user);
    const base =
      target === 'admin'
        ? this.config.get<string>('adminUrl') || 'http://localhost:3001'
        : this.config.get<string>('frontendUrl') || 'http://localhost:3000';
    const url = `${base}/auth/callback?token=${encodeURIComponent(accessToken)}`;
    return res.redirect(url);
  }
}
