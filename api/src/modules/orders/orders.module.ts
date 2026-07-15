import { Module } from '@nestjs/common';
import { OrdersService } from '@modules/orders/orders.service';
import { OrdersController } from '@modules/orders/orders.controller';
import { CheckoutController } from '@modules/orders/checkout.controller';
import { PaymentsModule } from '@modules/payments/payments.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CouponsModule } from '@modules/coupons/coupons.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [PaymentsModule, NotificationsModule, CouponsModule, CatalogModule],
  controllers: [OrdersController, CheckoutController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
