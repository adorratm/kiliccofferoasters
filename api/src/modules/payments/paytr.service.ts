import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createHmac, randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { Order, OrderStatus } from '@entities/order.entity';
import { Payment, PaymentStatus } from '@entities/payment.entity';
import { User, UserRole } from '@entities/user.entity';
import {
  InitializePaymentDto,
  RetryPaymentDto,
} from '@modules/payments/dto/payments.dto';
import { PaymentFulfillmentService } from '@modules/payments/payment-fulfillment.service';

type PaytrTokenResponse = {
  status: string;
  token?: string;
  reason?: string;
};

@Injectable()
export class PaytrService {
  private readonly logger = new Logger(PaytrService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly fulfillment: PaymentFulfillmentService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('paytr.merchantId') &&
        this.config.get<string>('paytr.merchantKey') &&
        this.config.get<string>('paytr.merchantSalt'),
    );
  }

  async retryCheckout(
    dto: RetryPaymentDto,
    user?: User | null,
    userIp?: string,
  ) {
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

    return this.initializeCheckout({ orderId: order.id }, userIp);
  }

  async initializeCheckout(
    dto: InitializePaymentDto,
    userIp?: string,
  ) {
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

    const merchantOid = this.buildMerchantOid(order);
    const frontend = (
      this.config.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const apiUrl = (
      this.config.get<string>('apiUrl') || 'http://localhost:4000'
    ).replace(/\/$/, '');

    const qs = new URLSearchParams({
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
    const merchantOkUrl = `${frontend}/odeme/basarili?${qs}`;
    const merchantFailUrl = `${frontend}/odeme/basarisiz?${qs}`;

    if (!this.isConfigured()) {
      const mockToken = `mock-paytr-${randomUUID()}`;
      order.payment.provider = 'paytr';
      order.payment.status = PaymentStatus.PENDING;
      order.payment.conversationId = merchantOid;
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
        provider: 'paytr',
        token: mockToken,
        conversationId: merchantOid,
        paymentPageUrl: `${apiUrl}/payments/paytr/mock-complete?merchant_oid=${merchantOid}&status=success`,
        iframeUrl: null as string | null,
      };
    }

    const merchantId = this.config.get<string>('paytr.merchantId')!;
    const merchantKey = this.config.get<string>('paytr.merchantKey')!;
    const merchantSalt = this.config.get<string>('paytr.merchantSalt')!;
    const testMode = this.config.get<string>('paytr.testMode') || '0';
    const debugOn = this.config.get<string>('paytr.debugOn') || '1';
    const noInstallment = this.config.get<string>('paytr.noInstallment') || '0';
    const maxInstallment = this.config.get<string>('paytr.maxInstallment') || '0';
    const currency = 'TL';
    const timeoutLimit = '30';
    const lang = 'tr';

    const email = this.asciiEmail(order.customerEmail);
    const paymentAmount = Math.round(Number(order.total) * 100).toString();
    const userBasket = this.buildUserBasket(order);
    const ip = this.sanitizeIp(userIp);

    const hashStr =
      merchantId +
      ip +
      merchantOid +
      email +
      paymentAmount +
      userBasket +
      noInstallment +
      maxInstallment +
      currency +
      testMode;
    const paytrToken = createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    const body = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: ip,
      merchant_oid: merchantOid,
      email,
      payment_amount: paymentAmount,
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: debugOn,
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: order.customerName.slice(0, 60),
      user_address: (
        order.shippingAddress?.addressLine ||
        order.shippingAddress?.city ||
        'Adres'
      ).slice(0, 400),
      user_phone: (order.customerPhone || '').slice(0, 20),
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: timeoutLimit,
      currency,
      test_mode: testMode,
      lang,
    });

    let result: PaytrTokenResponse;
    try {
      const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      result = (await res.json()) as PaytrTokenResponse;
    } catch (err) {
      this.logger.error('PayTR get-token bağlantı hatası', err);
      throw new ServiceUnavailableException('PayTR bağlantısı kurulamadı');
    }

    if (result.status !== 'success' || !result.token) {
      this.logger.warn(`PayTR get-token başarısız: ${result.reason}`);
      throw new BadRequestException(
        result.reason || 'PayTR ödeme formu oluşturulamadı',
      );
    }

    order.payment.provider = 'paytr';
    order.payment.status = PaymentStatus.PENDING;
    order.payment.conversationId = merchantOid;
    order.payment.token = result.token;
    order.payment.rawResponse = result as unknown as Record<string, unknown>;
    await this.em.save(order.payment);

    const iframeUrl = `https://www.paytr.com/odeme/guvenli/${result.token}`;

    return {
      status: 'success',
      mock: false,
      provider: 'paytr',
      token: result.token,
      conversationId: merchantOid,
      paymentPageUrl: `${frontend}/odeme/paytr?token=${encodeURIComponent(result.token)}&orderId=${order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`,
      iframeUrl,
    };
  }

  /**
   * PayTR bildirim URL — yalnızca "OK" dönülmeli.
   */
  async handleNotification(body: Record<string, string>) {
    const merchantOid = body.merchant_oid;
    const status = body.status;
    const totalAmount = body.total_amount;
    const hash = body.hash;

    if (!merchantOid || !status || !totalAmount || !hash) {
      throw new BadRequestException('Eksik PayTR bildirimi');
    }

    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('PayTR yapılandırılmamış');
    }

    const merchantKey = this.config.get<string>('paytr.merchantKey')!;
    const merchantSalt = this.config.get<string>('paytr.merchantSalt')!;
    const expected = createHmac('sha256', merchantKey)
      .update(merchantOid + merchantSalt + status + totalAmount)
      .digest('base64');

    if (expected !== hash) {
      this.logger.warn(`PayTR hash uyuşmazlığı oid=${merchantOid}`);
      throw new BadRequestException('PAYTR notification failed: bad hash');
    }

    const payment = await this.em.findOne(Payment, {
      where: { conversationId: merchantOid },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Ödeme kaydı bulunamadı');
    }

    // Tekrarlayan bildirimi yoksay
    if (payment.status === PaymentStatus.SUCCESS) {
      return { ok: true, duplicate: true };
    }

    const success = status === 'success';
    await this.fulfillment.applyResult(payment, success, { ...body }, {
      paymentId: body.payment_id || body.failed_reason_code || null,
    });

    return { ok: true, duplicate: false };
  }

  async handleMockComplete(merchantOid: string, status: string) {
    const payment = await this.em.findOne(Payment, {
      where: { conversationId: merchantOid },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Ödeme kaydı bulunamadı');
    }
    const success = status === 'success';
    return this.fulfillment.applyResult(
      payment,
      success,
      { mock: true, status },
    );
  }

  /**
   * PayTR iade API — https://www.paytr.com/odeme/iade
   * return_amount: "199.90" formatında (TL, noktalı)
   */
  async refund(input: {
    merchantOid: string;
    returnAmount: string;
    referenceNo?: string;
  }): Promise<{ status: string; is_test?: number; err_msg?: string; mock?: boolean }> {
    const amount = Number(input.returnAmount).toFixed(2);
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new BadRequestException('Geçersiz iade tutarı');
    }

    if (!this.isConfigured()) {
      this.logger.log(
        `[mock-paytr-refund] oid=${input.merchantOid} amount=${amount}`,
      );
      return { status: 'success', mock: true };
    }

    const merchantId = this.config.get<string>('paytr.merchantId')!;
    const merchantKey = this.config.get<string>('paytr.merchantKey')!;
    const merchantSalt = this.config.get<string>('paytr.merchantSalt')!;

    const paytrToken = createHmac('sha256', merchantKey)
      .update(merchantId + input.merchantOid + amount + merchantSalt)
      .digest('base64');

    const body = new URLSearchParams({
      merchant_id: merchantId,
      merchant_oid: input.merchantOid,
      return_amount: amount,
      paytr_token: paytrToken,
    });
    if (input.referenceNo) {
      body.set('reference_no', input.referenceNo.slice(0, 64));
    }

    let result: { status: string; is_test?: number; err_msg?: string };
    try {
      const res = await fetch('https://www.paytr.com/odeme/iade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      result = (await res.json()) as typeof result;
    } catch (err) {
      this.logger.error('PayTR iade bağlantı hatası', err);
      throw new ServiceUnavailableException('PayTR iade bağlantısı kurulamadı');
    }

    if (result.status !== 'success') {
      this.logger.warn(
        `PayTR iade başarısız oid=${input.merchantOid}: ${result.err_msg}`,
      );
      throw new BadRequestException(
        result.err_msg || 'PayTR iade işlemi başarısız',
      );
    }

    return result;
  }

  private buildMerchantOid(order: Order): string {
    // PayTR: alfanümerik, max 64
    const base = `${order.orderNumber}${Date.now()}`.replace(
      /[^a-zA-Z0-9]/g,
      '',
    );
    return base.slice(0, 64);
  }

  private buildUserBasket(order: Order): string {
    const items = order.items || [];
    const shipping = Number(order.shippingFee || 0);
    const discount = Number(order.discountAmount || 0);
    const goodsGross = items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );
    const goodsNet = Math.max(0, goodsGross - discount);
    const basket: Array<[string, string, number]> = [];

    if (items.length && goodsGross > 0) {
      let allocated = 0;
      items.forEach((item, index) => {
        const share = Number(item.lineTotal) / goodsGross;
        let lineNet =
          index === items.length - 1
            ? Number((goodsNet - allocated).toFixed(2))
            : Number((goodsNet * share).toFixed(2));
        if (lineNet < 0) lineNet = 0;
        allocated += lineNet;
        const qty = Math.max(1, item.quantity);
        const unit = Number((lineNet / qty).toFixed(2));
        basket.push([
          (item.productName || 'Ürün').slice(0, 100),
          unit.toFixed(2),
          qty,
        ]);
      });
    }

    if (shipping > 0) {
      basket.push(['Kargo', shipping.toFixed(2), 1]);
    }

    if (!basket.length) {
      basket.push([
        `Sipariş ${order.orderNumber}`,
        Number(order.total).toFixed(2),
        1,
      ]);
    }

    return Buffer.from(JSON.stringify(basket)).toString('base64');
  }

  private asciiEmail(email: string): string {
    // PayTR e-postada Türkçe karakter istemez
    return email
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ğ/gi, 'g')
      .replace(/ü/gi, 'u')
      .replace(/ş/gi, 's')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/gi, 'o')
      .replace(/ç/gi, 'c')
      .slice(0, 100);
  }

  private sanitizeIp(ip?: string): string {
    const fallback =
      this.config.get<string>('paytr.fallbackIp') || '85.34.78.112';
    if (!ip) return fallback;
    // X-Forwarded-For: ilk IP
    const first = ip.split(',')[0]?.trim() || fallback;
    if (first === '::1' || first === '127.0.0.1') return fallback;
    return first.slice(0, 39);
  }
}
