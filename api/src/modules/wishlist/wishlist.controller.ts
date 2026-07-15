import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WishlistService } from '@modules/wishlist/wishlist.service';
import { AddWishlistItemDto } from '@modules/wishlist/dto/wishlist.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Favori ürünler' })
  list(@CurrentUser() user: User) {
    return this.wishlistService.list(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Favori ürün ID listesi' })
  ids(@CurrentUser() user: User) {
    return this.wishlistService.listProductIds(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Favoriye ekle' })
  add(@CurrentUser() user: User, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.add(user.id, dto);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Favori ekle/çıkar' })
  toggle(@CurrentUser() user: User, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.toggle(user.id, dto.productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Favoriden çıkar' })
  remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}
