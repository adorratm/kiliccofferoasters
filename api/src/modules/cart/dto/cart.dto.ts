import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACCEPTED_GRIND_OPTIONS } from '@common/constants/grind-options';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ enum: ACCEPTED_GRIND_OPTIONS })
  @IsOptional()
  @IsIn([...ACCEPTED_GRIND_OPTIONS])
  grindOption?: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ enum: ACCEPTED_GRIND_OPTIONS })
  @IsOptional()
  @IsIn([...ACCEPTED_GRIND_OPTIONS])
  grindOption?: string;
}

export class SetGuestEmailDto {
  @ApiProperty({ example: 'misafir@email.com' })
  @IsEmail()
  email!: string;
}
