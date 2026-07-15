import { Module } from '@nestjs/common';
import { IyzicoService } from '@modules/payments/iyzico.service';
import { PaymentsController } from '@modules/payments/payments.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CartModule } from '@modules/cart/cart.module';
import { CouponsModule } from '@modules/coupons/coupons.module';

@Module({
  imports: [
    NotificationsModule,
    CatalogModule,
    CartModule,
    CouponsModule,
  ],
  controllers: [PaymentsController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class PaymentsModule {}
