import { Module } from '@nestjs/common';
import { WishlistController } from '@modules/wishlist/wishlist.controller';
import { WishlistService } from '@modules/wishlist/wishlist.service';

@Module({
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
