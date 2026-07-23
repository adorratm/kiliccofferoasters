import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ornek@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ornek@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ornek@email.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'E-postadaki sıfırlama token’ı' })
  @IsString()
  @MinLength(20)
  @MaxLength(128)
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class ChangePasswordDto {
  /** Yerel şifre yoksa (yalnızca Google) boş bırakılabilir */
  @ApiPropertyOptional({
    description: 'Mevcut şifre — yalnızca hesabında zaten şifre varsa zorunlu',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
