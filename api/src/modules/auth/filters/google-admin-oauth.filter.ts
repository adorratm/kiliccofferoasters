import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

/**
 * Admin Google OAuth hatalarında JSON yerine login sayfasına yönlendirir.
 * headersSent ise ikinci yanıt yazılmaz.
 */
@Catch(UnauthorizedException, ForbiddenException)
export class GoogleAdminOauthFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) {
      return;
    }

    const adminBase = (
      this.config.get<string>('adminUrl') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    const raw =
      (typeof exception.message === 'string' && exception.message) ||
      'Admin girişi reddedildi';
    const responseBody = exception.getResponse();
    const fromBody =
      typeof responseBody === 'string'
        ? responseBody
        : typeof responseBody === 'object' &&
            responseBody &&
            'message' in responseBody
          ? String(
              Array.isArray((responseBody as { message: unknown }).message)
                ? (responseBody as { message: string[] }).message[0]
                : (responseBody as { message: string }).message,
            )
          : raw;

    const message = /allowlist/i.test(fromBody)
      ? 'Bu e-posta admin allowlist’te değil'
      : fromBody;

    res.redirect(
      `${adminBase}/login?error=${encodeURIComponent(message)}`,
    );
  }
}
