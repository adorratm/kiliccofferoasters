import { Injectable } from '@nestjs/common';
import { MarketplacePlatform } from '@entities/marketplace-account.entity';
import {
  IMarketplaceAdapter,
  PushProductInput,
  PushProductResult,
  PulledOrder,
  SyncStockItem,
  hasMarketplaceCredentials,
} from '@modules/marketplace/adapters/marketplace.adapter';

abstract class BaseMarketplaceAdapter implements IMarketplaceAdapter {
  abstract readonly platform: MarketplacePlatform;

  async syncStock(
    credentials: Record<string, string>,
    items: SyncStockItem[],
  ) {
    const mock = !hasMarketplaceCredentials(credentials);
    return {
      synced: items.length,
      mock,
      stub: true,
      message: mock
        ? 'Credentials yok — stok sync simüle edildi'
        : 'Gerçek platform API henüz bağlı değil — stok sync stub',
      raw: {
        mock,
        stub: true,
        platform: this.platform,
        items: items.map((i) => i.externalListingId),
      },
    };
  }

  async pullOrders(credentials: Record<string, string>) {
    const mock = !hasMarketplaceCredentials(credentials);
    const orders: PulledOrder[] = mock
      ? [
          {
            externalOrderId: `MOCK-${this.platform.toUpperCase()}-${Date.now()}`,
            externalStatus: 'Created',
            payload: { mock: true, stub: true, platform: this.platform },
          },
        ]
      : [];
    return {
      orders,
      mock,
      stub: true,
      message: mock
        ? 'Credentials yok — örnek sipariş üretildi'
        : 'Gerçek API henüz bağlı değil; sipariş çekilmedi (stub)',
    };
  }

  async pushProduct(
    credentials: Record<string, string>,
    input: PushProductInput,
  ): Promise<PushProductResult> {
    const mock = !hasMarketplaceCredentials(credentials);
    const externalListingId = `${this.platform}-${input.productId.slice(0, 8)}-${Date.now()}`;
    return {
      externalListingId,
      mock,
      stub: true,
      message: mock
        ? 'Credentials yok — listing ID simüle edildi'
        : 'Gerçek API henüz bağlı değil — listing ID stub üretildi',
      rawResponse: { mock, stub: true, platform: this.platform, input },
    };
  }
}

@Injectable()
export class TrendyolAdapter extends BaseMarketplaceAdapter {
  readonly platform = MarketplacePlatform.TRENDYOL;
}

@Injectable()
export class HepsiburadaAdapter extends BaseMarketplaceAdapter {
  readonly platform = MarketplacePlatform.HEPSIBURADA;
}

@Injectable()
export class N11Adapter extends BaseMarketplaceAdapter {
  readonly platform = MarketplacePlatform.N11;
}
