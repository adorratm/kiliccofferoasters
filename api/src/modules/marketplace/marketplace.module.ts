import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MarketplaceService } from '@modules/marketplace/marketplace.service';
import { MarketplaceController } from '@modules/marketplace/marketplace.controller';
import { MarketplaceSyncService } from '@modules/marketplace/marketplace-sync.service';
import { MarketplaceSyncProcessor } from '@modules/marketplace/marketplace-sync.processor';
import { MarketplaceSyncScheduler } from '@modules/marketplace/marketplace-sync.scheduler';
import {
  TrendyolAdapter,
  HepsiburadaAdapter,
  N11Adapter,
} from '@modules/marketplace/adapters/providers';
import { QUEUE_MARKETPLACE_SYNC } from '@modules/queues/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_MARKETPLACE_SYNC })],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    MarketplaceSyncService,
    MarketplaceSyncProcessor,
    MarketplaceSyncScheduler,
    TrendyolAdapter,
    HepsiburadaAdapter,
    N11Adapter,
  ],
  exports: [MarketplaceService, MarketplaceSyncService],
})
export class MarketplaceModule {}
