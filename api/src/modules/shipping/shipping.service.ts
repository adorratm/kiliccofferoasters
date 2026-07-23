import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  Shipment,
  ShippingProviderCode,
  ShipmentStatus,
} from '@entities/shipment.entity';
import { ShippingProviderConfig } from '@entities/shipping-provider-config.entity';
import { Order, OrderStatus } from '@entities/order.entity';
import { IShippingAdapter } from '@modules/shipping/adapters/shipping.adapter';
import {
  YurticiAdapter,
  KolayGelsinAdapter,
  DhlAdapter,
  SuratAdapter,
  PttAdapter,
  HepsijetAdapter,
  TrendyolExpressAdapter,
} from '@modules/shipping/adapters/providers';
import {
  CreateShipmentDto,
  TrackShipmentDto,
  UpdateShippingProviderConfigDto,
} from '@modules/shipping/dto/shipping.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { TrackingGateway } from '@modules/tracking/tracking.gateway';
import { statusLabel } from '@modules/notifications/notification.templates';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShippingService {
  private readonly adapters: Map<ShippingProviderCode, IShippingAdapter>;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
    private readonly trackingGateway: TrackingGateway,
    private readonly config: ConfigService,
    yurtici: YurticiAdapter,
    kolayGelsin: KolayGelsinAdapter,
    dhl: DhlAdapter,
    surat: SuratAdapter,
    ptt: PttAdapter,
    hepsijet: HepsijetAdapter,
    trendyolExpress: TrendyolExpressAdapter,
  ) {
    this.adapters = new Map<ShippingProviderCode, IShippingAdapter>([
      [ShippingProviderCode.YURTICI, yurtici],
      [ShippingProviderCode.KOLAY_GELSIN, kolayGelsin],
      [ShippingProviderCode.DHL, dhl],
      [ShippingProviderCode.SURAT, surat],
      [ShippingProviderCode.PTT, ptt],
      [ShippingProviderCode.HEPSIJET, hepsijet],
      [ShippingProviderCode.TRENDYOL_EXPRESS, trendyolExpress],
    ]);
  }

  private getAdapter(code: ShippingProviderCode): IShippingAdapter {
    const adapter = this.adapters.get(code);
    if (!adapter) {
      throw new BadRequestException(`Desteklenmeyen kargo: ${code}`);
    }
    return adapter;
  }

  private mapEvents(
    events: { date: string; description: string; location?: string }[] = [],
  ) {
    return events.map((ev) => ({
      at: ev.date,
      description: ev.description,
      location: ev.location,
    }));
  }

  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    const order = await this.em.findOne(Order, { where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    const config = await this.em.findOne(ShippingProviderConfig, {
      where: { provider: dto.provider },
    });
    const credentials = config?.credentials || {};
    const adapter = this.getAdapter(dto.provider);

    const result = await adapter.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      recipientName: order.customerName,
      recipientPhone: order.customerPhone,
      address: order.shippingAddress,
      credentials,
    });

    const shipment = this.em.create(Shipment, {
      orderId: order.id,
      provider: dto.provider,
      status: result.status,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl ?? null,
      labelUrl: result.labelUrl ?? null,
      rawResponse: result.rawResponse,
    });
    await this.em.save(shipment);

    order.status = OrderStatus.SHIPPED;
    order.shippingProvider = dto.provider;
    await this.em.save(order);

    const frontendUrl = (
      this.config.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const trackPath = shipment.trackingNumber
      ? `${frontendUrl}/takip/${encodeURIComponent(shipment.trackingNumber)}`
      : undefined;

    await this.notifications.enqueueShipmentStatus(
      order.id,
      shipment.id,
      'shipment_created',
      ['email', 'whatsapp'],
      {
        status: shipment.status,
        statusLabel: statusLabel(shipment.status),
        trackingUrl: trackPath,
      },
    );

    if (shipment.trackingNumber) {
      this.trackingGateway.emitTrackUpdate({
        code: shipment.trackingNumber,
        status: shipment.status,
        provider: shipment.provider,
        trackingUrl: shipment.trackingUrl,
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          customerName: order.customerName,
        },
      });
    }

    return shipment;
  }

  async trackShipment(dto: TrackShipmentDto) {
    const config = await this.em.findOne(ShippingProviderConfig, {
      where: { provider: dto.provider },
    });
    const adapter = this.getAdapter(dto.provider);
    const result = await adapter.trackShipment(
      dto.trackingNumber,
      config?.credentials || {},
    );

    const shipment = await this.em.findOne(Shipment, {
      where: {
        provider: dto.provider,
        trackingNumber: dto.trackingNumber,
      },
      relations: { order: true },
    });

    const previousStatus = shipment?.status;
    const mappedEvents = this.mapEvents(result.events);

    if (shipment) {
      const statusChanged = previousStatus !== result.status;
      shipment.status = result.status;
      shipment.rawResponse = {
        ...(shipment.rawResponse || {}),
        track: result.rawResponse,
      };
      await this.em.save(shipment);

      if (
        result.status === ShipmentStatus.DELIVERED &&
        shipment.order &&
        shipment.order.status !== OrderStatus.DELIVERED
      ) {
        shipment.order.status = OrderStatus.DELIVERED;
        await this.em.save(shipment.order);
      }

      if (statusChanged) {
        await this.notifications.enqueueShipmentStatus(
          shipment.orderId,
          shipment.id,
          'shipment_status',
          ['email', 'whatsapp'],
          {
            status: result.status,
            statusLabel: statusLabel(result.status),
          },
        );
      }

      this.trackingGateway.emitTrackUpdate({
        code: dto.trackingNumber,
        status: result.status,
        provider: dto.provider,
        trackingUrl: shipment.trackingUrl,
        events: mappedEvents,
        order: shipment.order
          ? {
              id: shipment.order.id,
              orderNumber: shipment.order.orderNumber,
              status: shipment.order.status,
              customerName: shipment.order.customerName,
            }
          : undefined,
      });
    }

    return {
      ...result,
      code: dto.trackingNumber,
      provider: dto.provider,
      trackingUrl: shipment?.trackingUrl,
      events: mappedEvents,
      order: shipment?.order
        ? {
            id: shipment.order.id,
            orderNumber: shipment.order.orderNumber,
            status: shipment.order.status,
            customerName: shipment.order.customerName,
          }
        : undefined,
    };
  }

  async trackByCode(code: string) {
    const shipment = await this.em.findOne(Shipment, {
      where: { trackingNumber: code },
      relations: { order: true },
    });
    if (!shipment) {
      throw new NotFoundException('Takip numarası bulunamadı');
    }
    return this.trackShipment({
      provider: shipment.provider,
      trackingNumber: code,
    });
  }

  async listEnabledProvidersPublic() {
    const configs = await this.em.find(ShippingProviderConfig, {
      where: { isEnabled: true },
      order: { displayName: 'ASC' },
    });
    const feeDefault = '89.90';
    return configs.map((c) => ({
      id: c.provider,
      code: c.provider,
      name: c.displayName,
      fee:
        typeof c.settings?.fee === 'string' || typeof c.settings?.fee === 'number'
          ? String(c.settings.fee)
          : feeDefault,
      estimatedDays:
        typeof c.settings?.estimatedDays === 'string'
          ? c.settings.estimatedDays
          : '2-5 gün',
    }));
  }

  async listProviderConfigs(): Promise<ShippingProviderConfig[]> {
    return this.em.find(ShippingProviderConfig, {
      order: { displayName: 'ASC' },
    });
  }

  async updateProviderConfig(
    provider: ShippingProviderCode,
    dto: UpdateShippingProviderConfigDto,
  ): Promise<ShippingProviderConfig> {
    const config = await this.em.findOne(ShippingProviderConfig, {
      where: { provider },
    });
    if (!config) {
      throw new NotFoundException('Kargo sağlayıcı yapılandırması yok');
    }
    if (dto.displayName !== undefined) config.displayName = dto.displayName;
    if (dto.isEnabled !== undefined) config.isEnabled = dto.isEnabled;
    if (dto.credentials !== undefined) config.credentials = dto.credentials;
    if (dto.settings !== undefined) config.settings = dto.settings;
    return this.em.save(config);
  }
}
