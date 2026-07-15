import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CategoriesService } from '@modules/catalog/categories.service';
import { ProductsService } from '@modules/catalog/products.service';
import { LowStockService } from '@modules/catalog/low-stock.service';
import { InventoryService } from '@modules/catalog/inventory.service';
import { LowStockProcessor } from '@modules/catalog/low-stock.processor';
import { LowStockScheduler } from '@modules/catalog/low-stock.scheduler';
import { CategoriesController } from '@modules/catalog/categories.controller';
import { ProductsController } from '@modules/catalog/products.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { QUEUE_LOW_STOCK } from '@modules/queues/queue.constants';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: QUEUE_LOW_STOCK }),
  ],
  controllers: [CategoriesController, ProductsController],
  providers: [
    CategoriesService,
    ProductsService,
    LowStockService,
    InventoryService,
    LowStockProcessor,
    LowStockScheduler,
  ],
  exports: [
    CategoriesService,
    ProductsService,
    LowStockService,
    InventoryService,
  ],
})
export class CatalogModule {}
