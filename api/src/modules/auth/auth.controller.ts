import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/auth.service';
import { LoginDto, RegisterDto } from '@modules/auth/dto/auth.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';
import { GoogleAdminOauthFilter } from '@modules/auth/filters/google-admin-oauth.filter';

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
    this.redirectWithToken(req.user as User, res, 'frontend');
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
  @UseGuards(AuthGuard('google-admin'))
  @UseFilters(GoogleAdminOauthFilter)
  @ApiOperation({ summary: 'Admin Google OAuth callback' })
  googleAdminCallback(@Req() req: Request, @Res() res: Response) {
    if (res.headersSent) {
      return;
    }
    this.redirectWithToken(req.user as User, res, 'admin');
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
    this.redirectWithToken(req.user as User, res, 'frontend');
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
    this.redirectWithToken(req.user as User, res, 'frontend');
  }

  private redirectWithToken(
    user: User,
    res: Response,
    target: 'frontend' | 'admin',
  ): void {
    if (res.headersSent) {
      return;
    }
    const { accessToken } = this.authService.buildAuthResponse(user);
    const base =
      target === 'admin'
        ? this.config.get<string>('adminUrl') || 'http://localhost:3001'
        : this.config.get<string>('frontendUrl') || 'http://localhost:3000';
    const url = `${base}/auth/callback?token=${encodeURIComponent(accessToken)}`;
    res.redirect(url);
  }
}
