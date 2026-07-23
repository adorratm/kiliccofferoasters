import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CartService } from '@modules/cart/cart.service';
import { CartController } from '@modules/cart/cart.controller';
import { AbandonedCartService } from '@modules/cart/abandoned-cart.service';
import { AbandonedCartProcessor } from '@modules/cart/abandoned-cart.processor';
import { AbandonedCartScheduler } from '@modules/cart/abandoned-cart.scheduler';
import { QUEUE_ABANDONED_CART } from '@modules/queues/queue.constants';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';

@Module({
  imports: [
    NotificationsModule,
    CampaignsModule,
    BullModule.registerQueue({ name: QUEUE_ABANDONED_CART }),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    AbandonedCartService,
    AbandonedCartProcessor,
    AbandonedCartScheduler,
  ],
  exports: [CartService],
})
export class CartModule {}
