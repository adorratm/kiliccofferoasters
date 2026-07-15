import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddWishlistItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;
}
