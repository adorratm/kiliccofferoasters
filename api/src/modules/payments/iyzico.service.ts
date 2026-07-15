import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { Order, OrderStatus } from '@entities/order.entity';
import { Payment, PaymentStatus } from '@entities/payment.entity';
import { User, UserRole } from '@entities/user.entity';
import {
  InitializePaymentDto,
  PaymentCallbackDto,
  RetryPaymentDto,
} from '@modules/payments/dto/payments.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { statusLabel } from '@modules/notifications/notification.templates';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require('iyzipay');

@Injectable()
export class IyzicoService {
  private readonly iyzipay: InstanceType<typeof Iyzipay> | null;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    const apiKey = this.config.get<string>('iyzico.apiKey') || '';
    const secretKey = this.config.get<string>('iyzico.secretKey') || '';
    if (apiKey && secretKey) {
      this.iyzipay = new Iyzipay({
        apiKey,
        secretKey,
        uri:
          this.config.get<string>('iyzico.baseUrl') ||
          'https://sandbox-api.iyzipay.com',
      });
    } else {
      this.iyzipay = null;
    }
  }

  async retryCheckout(dto: RetryPaymentDto, user?: User | null) {
    const order = await this.em.findOne(Order, {
      where: { id: dto.orderId },
      relations: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Bu sipariş için yeniden ödeme başlatılamaz',
      );
    }

    const isAdmin = user?.role === UserRole.ADMIN;
    const isOwner = Boolean(user && order.userId && order.userId === user.id);
    const email = dto.email?.toLowerCase().trim();
    const emailMatch =
      Boolean(email) && order.customerEmail.toLowerCase() === email;

    if (!isAdmin && !isOwner && !emailMatch) {
      throw new ForbiddenException(
        'Yeniden ödeme için giriş yapın veya sipariş e-postasını doğrulayın',
      );
    }

    return this.initializeCheckout({ orderId: order.id });
  }

  async initializeCheckout(dto: InitializePaymentDto) {
    const order = await this.em.findOne(Order, {
      where: { id: dto.orderId },
      relations: { items: true, payment: true },
    });
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }
    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.payment?.status !== PaymentStatus.PENDING &&
      order.payment?.status !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException('Sipariş ödeme için uygun değil');
    }
    if (!order.payment) {
      throw new BadRequestException('Siparişe bağlı ödeme kaydı yok');
    }

    const conversationId = `conv-${order.orderNumber}-${randomUUID().slice(0, 8)}`;
    const callbackUrl =
      dto.callbackUrl ||
      `${this.config.get<string>('apiUrl')}/payments/callback`;

    if (!this.iyzipay) {
      const mockToken = `mock-token-${randomUUID()}`;
      order.payment.status = PaymentStatus.PENDING;
      order.payment.conversationId = conversationId;
      order.payment.token = mockToken;
      order.payment.rawResponse = {
        mock: true,
        status: 'success',
        token: mockToken,
      };
      await this.em.save(order.payment);
      return {
        status: 'success',
        mock: true,
        token: mockToken,
        conversationId,
        checkoutFormContent: `<div>Mock iyzico checkout — token: ${mockToken}</div>`,
        paymentPageUrl: `${callbackUrl}?token=${mockToken}`,
      };
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: order.subtotal,
      paidPrice: order.total,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: order.orderNumber,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: order.userId || order.id,
        name: order.customerName.split(' ')[0] || order.customerName,
        surname:
          order.customerName.split(' ').slice(1).join(' ') || order.customerName,
        gsmNumber: order.customerPhone,
        email: order.customerEmail,
        identityNumber: '11111111111',
        registrationAddress:
          order.shippingAddress?.addressLine || 'Adres',
        ip: '85.34.78.112',
        city: order.shippingAddress?.city || 'Istanbul',
        country: 'Turkey',
        zipCode: order.shippingAddress?.postalCode || '34000',
      },
      shippingAddress: {
        contactName: order.customerName,
        city: order.shippingAddress?.city || 'Istanbul',
        country: 'Turkey',
        address: order.shippingAddress?.addressLine || 'Adres',
        zipCode: order.shippingAddress?.postalCode || '34000',
      },
      billingAddress: {
        contactName: order.customerName,
        city:
          order.billingAddress?.city ||
          order.shippingAddress?.city ||
          'Istanbul',
        country: 'Turkey',
        address:
          order.billingAddress?.addressLine ||
          order.shippingAddress?.addressLine ||
          'Adres',
        zipCode:
          order.billingAddress?.postalCode ||
          order.shippingAddress?.postalCode ||
          '34000',
      },
      basketItems: (order.items || []).map((item) => ({
        id: item.id,
        name: item.productName,
        category1: 'Coffee',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.lineTotal,
      })),
    };

    const result = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        this.iyzipay!.checkoutFormInitialize.create(
          request,
          (err: Error | null, data: Record<string, unknown>) => {
            if (err) reject(err);
            else resolve(data);
          },
        );
      },
    );

    order.payment.conversationId = conversationId;
    order.payment.token = (result.token as string) || null;
    order.payment.rawResponse = result;
    await this.em.save(order.payment);

    return result;
  }

  async handleCallback(dto: PaymentCallbackDto) {
    let payment: Payment | null = null;

    if (dto.token) {
      payment = await this.em.findOne(Payment, {
        where: { token: dto.token },
        relations: { order: true },
      });
    }
    if (!payment && dto.conversationId) {
      payment = await this.em.findOne(Payment, {
        where: { conversationId: dto.conversationId },
        relations: { order: true },
      });
    }
    if (!payment) {
      throw new NotFoundException('Ödeme kaydı bulunamadı');
    }

    const isMock = !this.iyzipay || dto.token?.startsWith('mock-token-');
    let success = false;
    let raw: Record<string, unknown> = { ...dto };

    if (isMock) {
      success =
        !dto.status ||
        dto.status === 'success' ||
        dto.status === 'SUCCESS';
      raw = { ...raw, mock: true, success };
    } else {
      const result = await new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          this.iyzipay!.checkoutForm.retrieve(
            {
              locale: Iyzipay.LOCALE.TR,
              conversationId: payment!.conversationId,
              token: dto.token,
            },
            (err: Error | null, data: Record<string, unknown>) => {
              if (err) reject(err);
              else resolve(data);
            },
          );
        },
      );
      raw = result;
      success =
        result.paymentStatus === 'SUCCESS' || result.status === 'success';
      if (result.paymentId) {
        payment.paymentId = String(result.paymentId);
      }
    }

    payment.status = success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    payment.rawResponse = raw;
    if (dto.paymentId) payment.paymentId = dto.paymentId;
    await this.em.save(payment);

    if (payment.order) {
      const previous = payment.order.status;
      payment.order.status = success
        ? OrderStatus.PAID
        : OrderStatus.PENDING_PAYMENT;
      await this.em.save(payment.order);

      if (success && previous !== OrderStatus.PAID) {
        await this.notifications.enqueueOrderStatus(
          payment.order.id,
          'order_paid',
          ['email', 'sms'],
          {
            status: OrderStatus.PAID,
            statusLabel: statusLabel(OrderStatus.PAID),
          },
        );
      }
    }

    return {
      success,
      paymentStatus: payment.status,
      orderId: payment.orderId,
      orderNumber: payment.order?.orderNumber ?? null,
      orderStatus: payment.order?.status,
    };
  }
}
