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
import { PaymentFulfillmentService } from '@modules/payments/payment-fulfillment.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require('iyzipay');

@Injectable()
export class IyzicoService {
  private readonly iyzipay: InstanceType<typeof Iyzipay> | null;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly fulfillment: PaymentFulfillmentService,
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
      order.payment.provider = 'iyzico';
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
        provider: 'iyzico',
        token: mockToken,
        conversationId,
        checkoutFormContent: `<div>Mock iyzico checkout — token: ${mockToken}</div>`,
        paymentPageUrl: `${callbackUrl}?token=${mockToken}`,
      };
    }

    const basketItems = this.buildBasketItems(order);
    const basketSum = basketItems
      .reduce((sum, item) => sum + Number(item.price), 0)
      .toFixed(2);

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: basketSum,
      paidPrice: Number(order.total).toFixed(2),
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
      basketItems,
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

    order.payment.provider = 'iyzico';
    order.payment.conversationId = conversationId;
    order.payment.token = (result.token as string) || null;
    order.payment.rawResponse = result;
    await this.em.save(order.payment);

    return { ...result, provider: 'iyzico' };
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
    let paymentId: string | null = null;

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
        paymentId = String(result.paymentId);
      }
    }

    if (dto.paymentId) paymentId = dto.paymentId;

    return this.fulfillment.applyResult(payment, success, raw, { paymentId });
  }

  /**
   * iyzico: basket kalemleri toplamı `price` ile eşit olmalı.
   * İndirim ürün kalemlerine oransal dağıtılır; kargo ayrı satır.
   */
  private buildBasketItems(order: Order) {
    const shipping = Number(order.shippingFee || 0);
    const discount = Number(order.discountAmount || 0);
    const items = order.items || [];
    const goodsGross = items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );
    const goodsNet = Math.max(0, goodsGross - discount);

    const basketItems: Array<{
      id: string;
      name: string;
      category1: string;
      itemType: string;
      price: string;
    }> = [];

    if (items.length && goodsGross > 0) {
      let allocated = 0;
      items.forEach((item, index) => {
        const share = Number(item.lineTotal) / goodsGross;
        let price =
          index === items.length - 1
            ? Number((goodsNet - allocated).toFixed(2))
            : Number((goodsNet * share).toFixed(2));
        if (price < 0) price = 0;
        allocated += price;
        basketItems.push({
          id: item.id,
          name: item.productName,
          category1: 'Coffee',
          itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price: price.toFixed(2),
        });
      });
    }

    if (shipping > 0) {
      basketItems.push({
        id: `shipping-${order.id}`,
        name: 'Kargo',
        category1: 'Shipping',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: shipping.toFixed(2),
      });
    }

    if (!basketItems.length) {
      basketItems.push({
        id: order.id,
        name: `Sipariş ${order.orderNumber}`,
        category1: 'Coffee',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(order.total).toFixed(2),
      });
    }

    return basketItems;
  }
}
