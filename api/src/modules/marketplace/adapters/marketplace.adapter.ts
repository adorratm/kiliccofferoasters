import { MarketplacePlatform } from '@entities/marketplace-account.entity';

export interface SyncStockItem {
  externalListingId: string;
  stock: number;
  sku?: string;
}

export interface PulledOrder {
  externalOrderId: string;
  externalStatus: string;
  payload: Record<string, unknown>;
}

export interface PushProductInput {
  productId: string;
  name: string;
  price: string;
  stock: number;
  sku?: string;
  description?: string;
}

export interface PushProductResult {
  externalListingId: string;
  rawResponse: Record<string, unknown>;
  mock: boolean;
  stub?: boolean;
  message?: string;
}

export interface IMarketplaceAdapter {
  readonly platform: MarketplacePlatform;
  syncStock(
    credentials: Record<string, string>,
    items: SyncStockItem[],
  ): Promise<{
    synced: number;
    mock: boolean;
    stub?: boolean;
    message?: string;
    raw: Record<string, unknown>;
  }>;
  pullOrders(
    credentials: Record<string, string>,
  ): Promise<{
    orders: PulledOrder[];
    mock: boolean;
    stub?: boolean;
    message?: string;
  }>;
  pushProduct(
    credentials: Record<string, string>,
    input: PushProductInput,
  ): Promise<PushProductResult>;
}

export function hasMarketplaceCredentials(
  credentials: Record<string, string>,
): boolean {
  return Object.values(credentials || {}).some(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
}
