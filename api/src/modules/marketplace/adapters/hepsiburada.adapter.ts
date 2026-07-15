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

/**
 * Hepsiburada Merchant API (listing-external + oms-external).
 * Auth: Basic(username:password) + User-Agent "{merchantId} - App"
 * username genelde API anahtarı; password gizli anahtar veya panel şifresi.
 */
@Injectable()
export class HepsiburadaAdapter implements IMarketplaceAdapter {
  readonly platform = MarketplacePlatform.HEPSIBURADA;
  private readonly logger = new Logger(HepsiburadaAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private listingBase(): string {
    return (
      this.config.get<string>('marketplace.hepsiburada.listingBaseUrl') ||
      'https://listing-external.hepsiburada.com'
    ).replace(/\/$/, '');
  }

  private omsBase(): string {
    return (
      this.config.get<string>('marketplace.hepsiburada.omsBaseUrl') ||
      'https://oms-external.hepsiburada.com'
    ).replace(/\/$/, '');
  }

  private auth(credentials: Record<string, string>) {
    const merchantId = credentials.merchantId?.trim();
    const username =
      credentials.username?.trim() || credentials.apiKey?.trim();
    const password =
      credentials.password?.trim() || credentials.apiSecret?.trim();
    if (!merchantId || !username || !password) {
      requireCreds(
        { merchantId: merchantId || '', username: username || '', password: password || '' },
        ['merchantId', 'username', 'password'],
        'Hepsiburada',
      );
    }
    return {
      merchantId: merchantId!,
      Authorization: basicAuthHeader(username!, password!),
      'User-Agent': `${merchantId} - KilicCoffeeRoasters`,
    };
  }

  async syncStock(
    credentials: Record<string, string>,
    items: SyncStockItem[],
  ) {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        synced: items.length,
        ...asMockNoCredentials('Hepsiburada'),
        raw: { mock: true, items: items.map((i) => i.externalListingId) },
      };
    }

    const auth = this.auth(credentials);
    const results: unknown[] = [];
    let synced = 0;

    try {
      for (const item of items) {
        const sku = encodeURIComponent(item.sku || item.externalListingId);
        const res = await marketplaceFetch(
          `${this.listingBase()}/listings/merchantid/${auth.merchantId}/sku/${sku}`,
          {
            method: 'PUT',
            headers: {
              Authorization: auth.Authorization,
              'User-Agent': auth['User-Agent'],
            },
            body: { AvailableStock: Math.max(0, item.stock) },
            label: 'hb.syncStock',
          },
        );
        results.push(res.data);
        synced += 1;
      }
      return {
        synced,
        mock: false,
        stub: false,
        message: `${synced} SKU stok güncellendi`,
        raw: { results },
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
            externalOrderId: `MOCK-HB-${Date.now()}`,
            externalStatus: 'Open',
            payload: { mock: true, platform: this.platform },
          },
        ] as PulledOrder[],
        ...asMockNoCredentials('Hepsiburada'),
      };
    }

    const auth = this.auth(credentials);
    const qs = new URLSearchParams({
      offset: '0',
      limit: '50',
    });

    try {
      const res = await marketplaceFetch<
        | Array<Record<string, unknown>>
        | { items?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> }
      >(
        `${this.omsBase()}/orders/merchantid/${auth.merchantId}?${qs}`,
        {
          method: 'GET',
          headers: {
            Authorization: auth.Authorization,
            'User-Agent': auth['User-Agent'],
          },
          label: 'hb.pullOrders',
        },
      );

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.items || res.data?.data || [];

      const orders: PulledOrder[] = list.map((row) => {
        const id = String(
          row.orderNumber || row.id || row.orderId || `hb-${Date.now()}`,
        );
        return {
          externalOrderId: id,
          externalStatus: String(row.status || row.orderStatus || 'Unknown'),
          payload: row,
        };
      });

      return {
        orders,
        mock: false,
        stub: false,
        message: `${orders.length} sipariş çekildi`,
      };
    } catch (err) {
      // Alternatif path dene
      if (err instanceof MarketplaceHttpError && err.status === 404) {
        try {
          const res = await marketplaceFetch<{
            items?: Array<Record<string, unknown>>;
          }>(`${this.omsBase()}/orders?${qs}`, {
            method: 'GET',
            headers: {
              Authorization: auth.Authorization,
              'User-Agent': auth['User-Agent'],
            },
            label: 'hb.pullOrders.alt',
          });
          const list = res.data?.items || [];
          return {
            orders: list.map((row) => ({
              externalOrderId: String(row.orderNumber || row.id || ''),
              externalStatus: String(row.status || 'Unknown'),
              payload: row,
            })),
            mock: false,
            stub: false,
            message: `${list.length} sipariş çekildi (alt endpoint)`,
          };
        } catch (err2) {
          throw this.wrap(err2, 'Sipariş çekme');
        }
      }
      throw this.wrap(err, 'Sipariş çekme');
    }
  }

  async pushProduct(
    credentials: Record<string, string>,
    input: PushProductInput,
  ): Promise<PushProductResult> {
    if (!hasMarketplaceCredentials(credentials)) {
      return {
        externalListingId: `hb-mock-${input.productId.slice(0, 8)}-${Date.now()}`,
        mock: true,
        stub: false,
        message: 'Credentials yok — listing ID simüle edildi',
        rawResponse: { mock: true, input },
      };
    }

    // HB ürün oluşturma kategori attributeleri gerektirir; stok sync için SKU yeterli
    const sku = input.sku || input.productId;
    return {
      externalListingId: sku,
      mock: false,
      stub: false,
      message:
        'Hepsiburada ürün oluşturma (MPOP catalog) bu sürümde desteklenmiyor. Listing’i merchant panelden açıp externalListingId/SKU olarak kaydedin; stok sync çalışır.',
      rawResponse: {
        skipped: true,
        merchantSku: sku,
        hint: 'PUT listing stock kullanın',
      },
    };
  }

  private wrap(err: unknown, action: string): never {
    if (err instanceof MarketplaceHttpError) {
      this.logger.warn(`Hepsiburada ${action}: ${err.message}`);
      throw err;
    }
    throw err;
  }
}
