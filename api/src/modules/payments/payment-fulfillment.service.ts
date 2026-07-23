import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Order, OrderStatus } from '@entities/order.entity';
import { Payment, PaymentStatus } from '@entities/payment.entity';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { statusLabel } from '@modules/notifications/notification.templates';
import { InventoryService } from '@modules/catalog/inventory.service';
import { CartService } from '@modules/cart/cart.service';
import { CouponsService } from '@modules/coupons/coupons.service';

@Injectable()
export class PaymentFulfillmentService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
    private readonly inventory: InventoryService,
    private readonly carts: CartService,
    private readonly coupons: CouponsService,
  ) {}

  async applyResult(
    payment: Payment,
    success: boolean,
    raw: Record<string, unknown>,
    extras?: { paymentId?: string | null },
  ) {
    payment.status = success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    payment.rawResponse = raw;
    if (extras?.paymentId) {
      payment.paymentId = extras.paymentId;
    }
    await this.em.save(payment);

    const order =
      payment.order ||
      (await this.em.findOne(Order, { where: { id: payment.orderId } }));
    if (!order) {
      return {
        success,
        paymentStatus: payment.status,
        orderId: payment.orderId,
        orderNumber: null as string | null,
        orderStatus: undefined as OrderStatus | undefined,
      };
    }

    const previous = order.status;
    order.status = success ? OrderStatus.PAID : OrderStatus.PENDING_PAYMENT;
    await this.em.save(order);

    if (success && previous !== OrderStatus.PAID) {
      await this.inventory.decrementForPaidOrder(order.id);
      await this.coupons.confirmRedemptionForPaidOrder(order.id);
      await this.carts.clearCartById(order.sourceCartId);
      await this.notifications.enqueueOrderStatus(
        order.id,
        'order_paid',
        ['email', 'whatsapp'],
        {
          status: OrderStatus.PAID,
          statusLabel: statusLabel(OrderStatus.PAID),
        },
      );
    }

    return {
      success,
      paymentStatus: payment.status,
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      orderStatus: order.status,
    };
  }
}
