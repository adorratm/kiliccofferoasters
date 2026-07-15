import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketplacePlatform } from '@entities/marketplace-account.entity';
import {
  IMarketplaceAdapter,
  PushProductInput,
  PushProductResult,
  PulledOrder,
  SyncStockItem,
  hasMarketplaceCredentials,
} from '@modules/marketplace/adapters/marketplace.adapter';
import {
  asMockNoCredentials,
  marketplaceFetch,
  MarketplaceHttpError,
  requireCreds,
} from '@modules/marketplace/adapters/marketplace-http';

@Injectable()
export class N11Adapter implements IMarketplaceAdapter {
  readonly platform = MarketplacePlatform.N11;
  private readonly logger = new Logger(N11Adapter.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('marketplace.n11.baseUrl') ||
      'https://api.n11.com'
    ).replace(/\/$/, '');
  }

  private integrator(): string {
    return (
      this.config.get<string>('marketplace.n11.integrator') ||
      'KilicCoffeeRoasters'
    );
  }

  private headers(credentials: Record<string, string>) {
    const { appKey, appSecret } = requireCreds(
      credentials,
      ['appKey', 'appSecret'],
      'N11',
    );
    return {
      appkey: appKey,
      appsecret: appSecret,
      Accept: 'application/json',
    };
  }

  async syncStock(
    credentials: Record<string, string>,
    items: SyncStockItem[],
  ) {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        synced: items.length,
        ...asMockNoCredentials('N11'),
        raw: { mock: true, items: items.map((i) => i.externalListingId) },
      };
    }

    const headers = this.headers(credentials);
    const body = {
      payload: {
        integrator: this.integrator(),
        skus: items.map((item) => ({
          stockCode: item.sku || item.externalListingId,
          quantity: Math.max(0, item.stock),
          currencyType: 'TL',
        })),
      },
    };

    try {
      const res = await marketplaceFetch<{ id?: number | string }>(
        `${this.baseUrl()}/ms/product/tasks/price-stock-update`,
        {
          method: 'POST',
          headers,
          body,
          label: 'n11.syncStock',
        },
      );
      return {
        synced: items.length,
        mock: false,
        stub: false,
        message: `Stok güncelleme task’i oluşturuldu (id: ${res.data?.id ?? '—'})`,
        raw: res.data as Record<string, unknown>,
      };
    } catch (err) {
      throw this.wrap(err, 'Stok sync');
    }
  }

  async pullOrders(credentials: Record<string, string>) {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        orders: [
          {
            externalOrderId: `MOCK-N11-${Date.now()}`,
            externalStatus: 'Created',
            payload: { mock: true, platform: this.platform },
          },
        ] as PulledOrder[],
        ...asMockNoCredentials('N11'),
      };
    }

    const headers = this.headers(credentials);
    const endDate = Date.now();
    const startDate = endDate - 7 * 24 * 60 * 60 * 1000;
    const qs = new URLSearchParams({
      startDate: String(startDate),
      endDate: String(endDate),
      page: '0',
      size: '50',
      status: 'Created',
      orderByDirection: 'DESC',
    });

    const paths = [
      `/rest/delivery/v1/shipmentPackages?${qs}`,
      `/oms/shipmentPackage?${qs}`,
    ];

    let lastErr: unknown;
    for (const path of paths) {
      try {
        const res = await marketplaceFetch<{
          content?: Array<Record<string, unknown>>;
          data?: Array<Record<string, unknown>>;
        }>(`${this.baseUrl()}${path}`, {
          method: 'GET',
          headers,
          label: 'n11.pullOrders',
        });
        const list = res.data?.content || res.data?.data || [];
        const orders: PulledOrder[] = list.map((pkg) => ({
          externalOrderId: String(
            pkg.orderNumber || pkg.id || `n11-${Date.now()}`,
          ),
          externalStatus: String(
            pkg.status || pkg.shipmentPackageStatus || 'Unknown',
          ),
          payload: pkg,
        }));
        return {
          orders,
          mock: false,
          stub: false,
          message: `${orders.length} sipariş paketi çekildi`,
        };
      } catch (err) {
        lastErr = err;
        if (err instanceof MarketplaceHttpError && err.status === 404) {
          continue;
        }
        throw this.wrap(err, 'Sipariş çekme');
      }
    }
    throw this.wrap(lastErr, 'Sipariş çekme');
  }

  async pushProduct(
    credentials: Record<string, string>,
    input: PushProductInput,
  ): Promise<PushProductResult> {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        externalListingId: `n11-mock-${input.productId.slice(0, 8)}-${Date.now()}`,
        mock: true,
        stub: false,
        message: 'Credentials yok — listing ID simüle edildi',
        rawResponse: { mock: true, input },
      };
    }

    const categoryId = credentials.categoryId;
    const shipmentTemplate = credentials.shipmentTemplate;
    if (!categoryId?.trim() || !shipmentTemplate?.trim()) {
      return {
        externalListingId: '',
        mock: false,
        stub: false,
        message:
          'N11 ürün oluşturma için credentials içinde categoryId ve shipmentTemplate gerekli. Listing’i panelden açıp stockCode ile eşleyin.',
        rawResponse: { error: 'missing_category_or_template' },
      };
    }

    const headers = this.headers(credentials);
    const stockCode = (input.sku || input.productId).slice(0, 255);
    const price = Number(input.price) || 0;

    const body = {
      payload: {
        integrator: this.integrator(),
        skus: [
          {
            title: input.name.slice(0, 255),
            description: input.description || input.name,
            categoryId: Number(categoryId),
            currencyType: 'TL',
            salePrice: price,
            listPrice: price,
            quantity: Math.max(0, input.stock),
            stockCode,
            productMainId: input.productId,
            preparingDay: Number(credentials.preparingDay || 3),
            shipmentTemplate,
            barcode: credentials.barcode || undefined,
          },
        ],
      },
    };

    try {
      const res = await marketplaceFetch<{ id?: number | string }>(
        `${this.baseUrl()}/ms/product/tasks/product-create`,
        {
          method: 'POST',
          headers,
          body,
          label: 'n11.pushProduct',
        },
      );
      return {
        externalListingId: stockCode,
        mock: false,
        stub: false,
        message: `Ürün create task’i oluşturuldu (id: ${res.data?.id ?? '—'})`,
        rawResponse: res.data as Record<string, unknown>,
      };
    } catch (err) {
      throw this.wrap(err, 'Ürün gönderimi');
    }
  }

  private wrap(err: unknown, action: string): never {
    if (err instanceof MarketplaceHttpError) {
      this.logger.warn(`N11 ${action}: ${err.message}`);
      throw err;
    }
    throw err;
  }
}
