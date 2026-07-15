import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MarketplaceService } from '@modules/marketplace/marketplace.service';
import { MarketplaceController } from '@modules/marketplace/marketplace.controller';
import { MarketplaceSyncService } from '@modules/marketplace/marketplace-sync.service';
import { MarketplaceSyncProcessor } from '@modules/marketplace/marketplace-sync.processor';
import { MarketplaceSyncScheduler } from '@modules/marketplace/marketplace-sync.scheduler';
import { MarketplaceOrderImportService } from '@modules/marketplace/marketplace-order-import.service';
import {
  TrendyolAdapter,
  HepsiburadaAdapter,
  N11Adapter,
} from '@modules/marketplace/adapters/providers';
import { QUEUE_MARKETPLACE_SYNC } from '@modules/queues/queue.constants';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_MARKETPLACE_SYNC }),
    CatalogModule,
  ],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    MarketplaceSyncService,
    MarketplaceSyncProcessor,
    MarketplaceSyncScheduler,
    MarketplaceOrderImportService,
    TrendyolAdapter,
    HepsiburadaAdapter,
    N11Adapter,
  ],
  exports: [MarketplaceService, MarketplaceSyncService],
})
export class MarketplaceModule {}
