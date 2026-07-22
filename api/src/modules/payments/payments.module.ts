import { Module } from '@nestjs/common';
import { IyzicoService } from '@modules/payments/iyzico.service';
import { PaytrService } from '@modules/payments/paytr.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { PaymentFulfillmentService } from '@modules/payments/payment-fulfillment.service';
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
  providers: [
    PaymentFulfillmentService,
    IyzicoService,
    PaytrService,
    PaymentsService,
  ],
  exports: [PaymentsService, IyzicoService, PaytrService],
})
export class PaymentsModule {}
