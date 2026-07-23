import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Order } from '@entities/order.entity';
import { Shipment } from '@entities/shipment.entity';
import {
  NotificationChannel,
  NotificationLog,
  NotificationStatus,
} from '@entities/notification-log.entity';
import {
  QUEUE_NOTIFICATIONS,
  NotificationJobPayload,
  NotificationChannelName,
} from '@modules/queues/queue.constants';
import { EmailProvider } from '@modules/notifications/providers/email.provider';
import { WhatsAppProviderRouter } from '@modules/notifications/providers/whatsapp.provider';
import {
  buildAbandonedCartEmail,
  buildEmailContent,
  buildLowStockEmail,
  buildWhatsAppBody,
  resolveFrontendUrl,
  statusLabel,
} from '@modules/notifications/notification.templates';
import { ConfigService } from '@nestjs/config';
import { normalizePhoneE164 } from '@common/utils/phone';

const DEFAULT_ORDER_CHANNELS: NotificationChannelName[] = [
  'email',
  'whatsapp',
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(QUEUE_NOTIFICATIONS) private readonly notifyQueue: Queue,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly email: EmailProvider,
    private readonly whatsapp: WhatsAppProviderRouter,
    private readonly config: ConfigService,
  ) {}

  async enqueueOrderStatus(
    orderId: string,
    template: string,
    channels: NotificationChannelName[] = DEFAULT_ORDER_CHANNELS,
    context: Record<string, unknown> = {},
  ) {
    const payload: NotificationJobPayload = {
      orderId,
      template,
      channels,
      context,
    };
    await this.notifyQueue.add(template, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  async enqueueShipmentStatus(
    orderId: string,
    shipmentId: string,
    template: string,
    channels: NotificationChannelName[] = DEFAULT_ORDER_CHANNELS,
    context: Record<string, unknown> = {},
  ) {
    const payload: NotificationJobPayload = {
      orderId,
      shipmentId,
      template,
      channels,
      context,
    };
    await this.notifyQueue.add(template, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  async enqueueAbandonedCart(input: {
    cartId: string;
    email: string;
    name?: string | null;
    itemCount: number;
  }) {
    const payload: NotificationJobPayload = {
      cartId: input.cartId,
      template: 'abandoned_cart',
      channels: ['email'],
      recipientEmail: input.email,
      recipientName: input.name || undefined,
      context: { itemCount: input.itemCount },
    };
    await this.notifyQueue.add('abandoned_cart', payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    });
  }

  async enqueueLowStockAlert(
    row: {
      productId: string;
      variantId: string | null;
      name: string;
      sku: string | null;
      weightLabel: string | null;
      stock: number;
    },
    emails: string[],
  ) {
    for (const email of emails) {
      const payload: NotificationJobPayload = {
        template: 'low_stock',
        channels: ['email'],
        recipientEmail: email,
        context: { ...row },
      };
      await this.notifyQueue.add('low_stock', payload, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      });
    }
  }

  async processJob(payload: NotificationJobPayload): Promise<void> {
    if (payload.template === 'abandoned_cart') {
      await this.processAbandonedCart(payload);
      return;
    }

    if (payload.template === 'low_stock') {
      await this.processLowStock(payload);
      return;
    }

    if (!payload.orderId) {
      this.logger.warn('Notification missing orderId');
      return;
    }

    const order = await this.em.findOne(Order, {
      where: { id: payload.orderId },
    });
    if (!order) {
      this.logger.warn(`Order not found for notification: ${payload.orderId}`);
      return;
    }

    let shipment: Shipment | null = null;
    if (payload.shipmentId) {
      shipment = await this.em.findOne(Shipment, {
        where: { id: payload.shipmentId },
      });
    }

    const frontendUrl = resolveFrontendUrl(this.config);
    const ctx = {
      order,
      shipment,
      statusLabel:
        typeof payload.context?.statusLabel === 'string'
          ? payload.context.statusLabel
          : statusLabel(
              (payload.context?.status as string) ||
                shipment?.status ||
                order.status,
            ),
      trackingUrl:
        typeof payload.context?.trackingUrl === 'string'
          ? payload.context.trackingUrl
          : undefined,
      frontendUrl,
    };

    for (const channel of payload.channels) {
      if (channel === 'email') {
        await this.sendEmail(order, shipment, payload.template, ctx);
      } else if (channel === 'whatsapp' || channel === 'sms') {
        // sms kanalı geriye dönük işler için WhatsApp'a yönlendirilir
        await this.sendWhatsApp(order, shipment, payload.template, ctx);
      }
    }
  }

  private async sendEmail(
    order: Order,
    shipment: Shipment | null,
    template: string,
    ctx: Parameters<typeof buildEmailContent>[1],
  ) {
    const log = this.em.create(NotificationLog, {
      channel: NotificationChannel.EMAIL,
      recipient: order.customerEmail,
      template,
      orderId: order.id,
      shipmentId: shipment?.id ?? null,
      status: NotificationStatus.PENDING,
      payload: { template },
    });
    await this.em.save(log);

    try {
      const content = buildEmailContent(template, ctx);
      const result = await this.email.send({
        to: order.customerEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      log.status = NotificationStatus.SENT;
      log.providerMessageId = result.id ?? null;
      await this.em.save(log);
    } catch (err) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = err instanceof Error ? err.message : String(err);
      await this.em.save(log);
      throw err;
    }
  }

  private async sendWhatsApp(
    order: Order,
    shipment: Shipment | null,
    template: string,
    ctx: Parameters<typeof buildWhatsAppBody>[1],
  ) {
    if (!order.customerPhone) {
      this.logger.warn(`Order ${order.id} has no phone — skip WhatsApp`);
      return;
    }

    const to = normalizePhoneE164(order.customerPhone) || order.customerPhone;

    const log = this.em.create(NotificationLog, {
      channel: NotificationChannel.WHATSAPP,
      recipient: to,
      template,
      orderId: order.id,
      shipmentId: shipment?.id ?? null,
      status: NotificationStatus.PENDING,
      payload: { template },
    });
    await this.em.save(log);

    try {
      const body = buildWhatsAppBody(template, ctx);
      const result = await this.whatsapp.send({ to, body });
      log.status = NotificationStatus.SENT;
      log.providerMessageId = result.id ?? null;
      await this.em.save(log);
    } catch (err) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = err instanceof Error ? err.message : String(err);
      await this.em.save(log);
      throw err;
    }
  }

  async listForOrder(orderId: string): Promise<NotificationLog[]> {
    return this.em.find(NotificationLog, {
      where: { orderId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private async processAbandonedCart(
    payload: NotificationJobPayload,
  ): Promise<void> {
    const email = payload.recipientEmail;
    if (!email) {
      this.logger.warn('Abandoned cart notification missing email');
      return;
    }
    const frontendUrl = resolveFrontendUrl(this.config);
    const name = payload.recipientName || 'Kahve sever';
    const itemCount =
      typeof payload.context?.itemCount === 'number'
        ? payload.context.itemCount
        : 1;
    const cartUrl = `${frontendUrl}/sepet`;

    const log = this.em.create(NotificationLog, {
      channel: NotificationChannel.EMAIL,
      recipient: email,
      template: 'abandoned_cart',
      orderId: null,
      shipmentId: null,
      status: NotificationStatus.PENDING,
      payload: { cartId: payload.cartId, itemCount },
    });
    await this.em.save(log);

    try {
      const content = buildAbandonedCartEmail({ name, itemCount, cartUrl });
      const result = await this.email.send({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      log.status = NotificationStatus.SENT;
      log.providerMessageId = result.id ?? null;
      await this.em.save(log);
    } catch (err) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = err instanceof Error ? err.message : String(err);
      await this.em.save(log);
      throw err;
    }
  }

  private async processLowStock(
    payload: NotificationJobPayload,
  ): Promise<void> {
    const email = payload.recipientEmail;
    if (!email) {
      this.logger.warn('Low stock notification missing email');
      return;
    }

    const ctx = payload.context || {};
    const productName = typeof ctx.name === 'string' ? ctx.name : 'Ürün';
    const variantLabel =
      typeof ctx.weightLabel === 'string' ? ctx.weightLabel : null;
    const sku = typeof ctx.sku === 'string' ? ctx.sku : null;
    const stock = typeof ctx.stock === 'number' ? ctx.stock : 0;
    const productId = typeof ctx.productId === 'string' ? ctx.productId : null;
    const variantId =
      typeof ctx.variantId === 'string' ? ctx.variantId : null;
    const adminUrl =
      this.config.get<string>('adminUrl') || 'http://localhost:3001';
    const label = variantLabel
      ? `${productName} · ${variantLabel}`
      : productName;

    const log = this.em.create(NotificationLog, {
      channel: NotificationChannel.EMAIL,
      recipient: email,
      template: 'low_stock',
      orderId: null,
      shipmentId: null,
      status: NotificationStatus.PENDING,
      payload: {
        productId,
        variantId,
        name: productName,
        sku,
        weightLabel: variantLabel,
        stock,
      },
    });
    await this.em.save(log);

    try {
      const content = buildLowStockEmail({
        label,
        stock,
        sku,
        adminUrl,
      });
      const result = await this.email.send({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      log.status = NotificationStatus.SENT;
      log.providerMessageId = result.id ?? null;
      await this.em.save(log);
    } catch (err) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = err instanceof Error ? err.message : String(err);
      await this.em.save(log);
      throw err;
    }
  }
}
