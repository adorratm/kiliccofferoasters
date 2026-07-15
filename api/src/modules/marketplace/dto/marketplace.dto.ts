import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MarketplacePlatform } from '@entities/marketplace-account.entity';

export class CreateMarketplaceAccountDto {
  @ApiProperty({ enum: MarketplacePlatform })
  @IsEnum(MarketplacePlatform)
  platform!: MarketplacePlatform;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  storeName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;
}

export class UpdateMarketplaceAccountDto extends PartialType(
  CreateMarketplaceAccountDto,
) {}

export class SyncMarketplaceDto {
  @ApiPropertyOptional({ description: 'stock | orders | all' })
  @IsOptional()
  @IsString()
  mode?: 'stock' | 'orders' | 'all';

  @ApiPropertyOptional({
    description: 'true ise DB yazılmaz; adaptör sonucu döner',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description: 'true ise sync-all için Bull kuyruğuna ekler',
  })
  @IsOptional()
  @IsBoolean()
  enqueue?: boolean;
}

export class PushMarketplaceProductDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
