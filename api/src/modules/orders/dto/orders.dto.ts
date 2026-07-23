import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@entities/order.entity';
import {
  ReturnRequestStatus,
  ReturnRequestType,
} from '@entities/return-request.entity';

export class AddressPayloadDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  district!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty()
  @IsString()
  addressLine!: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsEmail()
  customerEmail!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  customerPhone!: string;

  @ApiProperty({ type: AddressPayloadDto })
  @ValidateNested()
  @Type(() => AddressPayloadDto)
  shippingAddress!: AddressPayloadDto;

  @ApiPropertyOptional({ type: AddressPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressPayloadDto)
  billingAddress?: AddressPayloadDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  legalAcceptances?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Kupon kodu' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsString()
  status!: OrderStatus;
}

export class OrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GuestOrderLookupDto {
  @ApiProperty({ example: 'KLC-20260716-ABCD' })
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  orderNumber!: string;

  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ enum: ReturnRequestType })
  @IsEnum(ReturnRequestType)
  type!: ReturnRequestType;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}

export class ReviewReturnRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn([ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED])
  status!: ReturnRequestStatus.APPROVED | ReturnRequestStatus.REJECTED;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  /** Kısmi iade tutarı (TRY). Boşsa sipariş toplamı */
  @ApiPropertyOptional({ example: 199.9 })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0.01)
  refundAmount?: number;
}
