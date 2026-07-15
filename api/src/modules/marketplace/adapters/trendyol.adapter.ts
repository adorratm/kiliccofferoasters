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
  basicAuthHeader,
  marketplaceFetch,
  MarketplaceHttpError,
  requireCreds,
} from '@modules/marketplace/adapters/marketplace-http';

@Injectable()
export class TrendyolAdapter implements IMarketplaceAdapter {
  readonly platform = MarketplacePlatform.TRENDYOL;
  private readonly logger = new Logger(TrendyolAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('marketplace.trendyol.baseUrl') ||
      'https://apigw.trendyol.com/integration'
    ).replace(/\/$/, '');
  }

  private storeFrontCode(credentials: Record<string, string>): string {
    return credentials.storeFrontCode || 'TR';
  }

  private authHeaders(credentials: Record<string, string>) {
    const { apiKey, apiSecret, sellerId } = requireCreds(
      credentials,
      ['apiKey', 'apiSecret', 'sellerId'],
      'Trendyol',
    );
    return {
      Authorization: basicAuthHeader(apiKey, apiSecret),
      'User-Agent': `${sellerId} - KilicCoffeeRoasters`,
      storeFrontCode: this.storeFrontCode(credentials),
      sellerId,
    };
  }

  async syncStock(
    credentials: Record<string, string>,
    items: SyncStockItem[],
  ) {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        synced: items.length,
        ...asMockNoCredentials('Trendyol'),
        raw: { mock: true, items: items.map((i) => i.externalListingId) },
      };
    }

    const headers = this.authHeaders(credentials);
    const sellerId = headers.sellerId;
    const payload = {
      items: items.map((item) => ({
        barcode: item.externalListingId || item.sku,
        quantity: Math.max(0, item.stock),
      })),
    };

    try {
      const res = await marketplaceFetch<{ batchRequestId?: string }>(
        `${this.baseUrl()}/inventory/sellers/${sellerId}/products/price-and-inventory`,
        {
          method: 'POST',
          headers: {
            Authorization: headers.Authorization,
            'User-Agent': headers['User-Agent'],
            storeFrontCode: headers.storeFrontCode,
          },
          body: payload,
          label: 'trendyol.syncStock',
        },
      );
      return {
        synced: items.length,
        mock: false,
        stub: false,
        message: `Stok güncelleme kuyruğa alındı (batch: ${res.data?.batchRequestId || '—'})`,
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
            externalOrderId: `MOCK-TRENDYOL-${Date.now()}`,
            externalStatus: 'Created',
            payload: { mock: true, platform: this.platform },
          },
        ] as PulledOrder[],
        ...asMockNoCredentials('Trendyol'),
      };
    }

    const headers = this.authHeaders(credentials);
    const sellerId = headers.sellerId;
    const endDate = Date.now();
    const startDate = endDate - 7 * 24 * 60 * 60 * 1000;
    const qs = new URLSearchParams({
      startDate: String(startDate),
      endDate: String(endDate),
      page: '0',
      size: '50',
      orderByField: 'PackageLastModifiedDate',
      orderByDirection: 'DESC',
    });

    try {
      const res = await marketplaceFetch<{
        content?: Array<Record<string, unknown>>;
      }>(`${this.baseUrl()}/order/sellers/${sellerId}/orders?${qs}`, {
        method: 'GET',
        headers: {
          Authorization: headers.Authorization,
          'User-Agent': headers['User-Agent'],
          storeFrontCode: headers.storeFrontCode,
        },
        label: 'trendyol.pullOrders',
      });

      const content = res.data?.content || [];
      const orders: PulledOrder[] = content.map((pkg) => {
        const id =
          String(pkg.id ?? pkg.orderNumber ?? pkg.shipmentPackageId ?? '') ||
          `ty-${Date.now()}`;
        return {
          externalOrderId: id,
          externalStatus: String(pkg.status || pkg.shipmentPackageStatus || 'Unknown'),
          payload: pkg,
        };
      });

      return {
        orders,
        mock: false,
        stub: false,
        message: `${orders.length} sipariş paketi çekildi`,
      };
    } catch (err) {
      throw this.wrap(err, 'Sipariş çekme');
    }
  }

  async pushProduct(
    credentials: Record<string, string>,
    input: PushProductInput,
  ): Promise<PushProductResult> {
    if (!hasMarketplaceCredentials(credentials)) {
      const externalListingId = `trendyol-mock-${input.productId.slice(0, 8)}-${Date.now()}`;
      return {
        externalListingId,
        mock: true,
        stub: false,
        message: 'Credentials yok — listing ID simüle edildi',
        rawResponse: { mock: true, input },
      };
    }

    const brandId = credentials.brandId;
    const categoryId = credentials.categoryId;
    if (!brandId?.trim() || !categoryId?.trim()) {
      return {
        externalListingId: '',
        mock: false,
        stub: false,
        message:
          'Ürün gönderimi için credentials içinde brandId ve categoryId gerekli (Trendyol kategori/marka eşlemesi). Stok sync için listing’i panelden eşleyebilirsiniz.',
        rawResponse: {
          error: 'missing_brand_or_category',
          hint: 'Admin credentials JSON: brandId, categoryId ekleyin',
        },
      };
    }

    const headers = this.authHeaders(credentials);
    const sellerId = headers.sellerId;
    const barcode = (input.sku || input.productId).slice(0, 40);
    const price = Number(input.price) || 0;

    const body = {
      items: [
        {
          barcode,
          title: input.name.slice(0, 100),
          productMainId: input.productId.slice(0, 40),
          brandId: Number(brandId),
          categoryId: Number(categoryId),
          quantity: Math.max(0, input.stock),
          stockCode: (input.sku || barcode).slice(0, 100),
          dimensionalWeight: Number(credentials.dimensionalWeight || 1),
          description: input.description || input.name,
          currencyType: 'TRY',
          listPrice: price,
          salePrice: price,
          vatRate: Number(credentials.vatRate || 20),
          cargoCompanyId: credentials.cargoCompanyId
            ? Number(credentials.cargoCompanyId)
            : undefined,
          images: credentials.imageUrl
            ? [{ url: credentials.imageUrl }]
            : undefined,
          attributes: [],
        },
      ],
    };

    try {
      const res = await marketplaceFetch<Record<string, unknown>>(
        `${this.baseUrl()}/product/sellers/${sellerId}/v2/products`,
        {
          method: 'POST',
          headers: {
            Authorization: headers.Authorization,
            'User-Agent': headers['User-Agent'],
            storeFrontCode: headers.storeFrontCode,
          },
          body,
          label: 'trendyol.pushProduct',
        },
      );
      return {
        externalListingId: barcode,
        mock: false,
        stub: false,
        message:
          'Ürün oluşturma isteği Trendyol kuyruğuna gönderildi (barcode = externalListingId)',
        rawResponse: res.data as Record<string, unknown>,
      };
    } catch (err) {
      throw this.wrap(err, 'Ürün gönderimi');
    }
  }

  private wrap(err: unknown, action: string): never {
    if (err instanceof MarketplaceHttpError) {
      this.logger.warn(`Trendyol ${action}: ${err.message}`);
      throw err;
    }
    throw err;
  }
}
