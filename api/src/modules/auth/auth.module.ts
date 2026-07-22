import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/auth.service';
import { AuthController } from '@modules/auth/auth.controller';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { GoogleStrategy } from '@modules/auth/strategies/google.strategy';
import { GoogleAdminStrategy } from '@modules/auth/strategies/google-admin.strategy';
import { FacebookStrategy } from '@modules/auth/strategies/facebook.strategy';
import { AppleStrategy } from '@modules/auth/strategies/apple.strategy';
import { GoogleAdminOauthFilter } from '@modules/auth/filters/google-admin-oauth.filter';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') || 'change-me-in-production',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') || '7d') as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    GoogleAdminStrategy,
    FacebookStrategy,
    AppleStrategy,
    GoogleAdminOauthFilter,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
