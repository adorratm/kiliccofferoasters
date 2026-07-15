import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  MarketplaceAccount,
  MarketplacePlatform,
} from '@entities/marketplace-account.entity';
import { MarketplaceListing } from '@entities/marketplace-listing.entity';
import { MarketplaceOrder } from '@entities/marketplace-order.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { IMarketplaceAdapter } from '@modules/marketplace/adapters/marketplace.adapter';
import {
  TrendyolAdapter,
  HepsiburadaAdapter,
  N11Adapter,
} from '@modules/marketplace/adapters/providers';
import {
  CreateMarketplaceAccountDto,
  UpdateMarketplaceAccountDto,
  SyncMarketplaceDto,
  PushMarketplaceProductDto,
} from '@modules/marketplace/dto/marketplace.dto';

function maskCredentials(
  credentials: Record<string, string> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials || {})) {
    if (!value) {
      out[key] = '';
      continue;
    }
    out[key] = value.length <= 4 ? '****' : `****${value.slice(-4)}`;
  }
  return out;
}

@Injectable()
export class MarketplaceService {
  private readonly adapters: Map<MarketplacePlatform, IMarketplaceAdapter>;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    trendyol: TrendyolAdapter,
    hepsiburada: HepsiburadaAdapter,
    n11: N11Adapter,
  ) {
    this.adapters = new Map<MarketplacePlatform, IMarketplaceAdapter>([
      [MarketplacePlatform.TRENDYOL, trendyol],
      [MarketplacePlatform.HEPSIBURADA, hepsiburada],
      [MarketplacePlatform.N11, n11],
    ]);
  }

  private getAdapter(platform: MarketplacePlatform): IMarketplaceAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new BadRequestException(`Desteklenmeyen platform: ${platform}`);
    }
    return adapter;
  }

  private sanitize(account: MarketplaceAccount): MarketplaceAccount {
    return {
      ...account,
      credentials: maskCredentials(account.credentials),
    } as MarketplaceAccount;
  }

  async listAccounts(): Promise<MarketplaceAccount[]> {
    const rows = await this.em.find(MarketplaceAccount, {
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.sanitize(r));
  }

  async createAccount(
    dto: CreateMarketplaceAccountDto,
  ): Promise<MarketplaceAccount> {
    const account = this.em.create(MarketplaceAccount, {
      platform: dto.platform,
      storeName: dto.storeName,
      isEnabled: dto.isEnabled ?? false,
      credentials: dto.credentials ?? {},
    });
    const saved = await this.em.save(account);
    return this.sanitize(saved);
  }

  async updateAccount(
    id: string,
    dto: UpdateMarketplaceAccountDto,
  ): Promise<MarketplaceAccount> {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    if (dto.platform !== undefined) account.platform = dto.platform;
    if (dto.storeName !== undefined) account.storeName = dto.storeName;
    if (dto.isEnabled !== undefined) account.isEnabled = dto.isEnabled;
    if (dto.credentials !== undefined) {
      account.credentials = dto.credentials;
    }
    const saved = await this.em.save(account);
    return this.sanitize(saved);
  }

  async removeAccount(id: string): Promise<void> {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    await this.em.remove(account);
  }

  async listListings(accountId: string): Promise<MarketplaceListing[]> {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    return this.em.find(MarketplaceListing, {
      where: { accountId },
      relations: { product: true, variant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async listOrders(accountId: string): Promise<MarketplaceOrder[]> {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    return this.em.find(MarketplaceOrder, {
      where: { accountId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async syncAccount(id: string, dto: SyncMarketplaceDto = {}) {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id },
      relations: { listings: true },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    if (!account.isEnabled) {
      throw new BadRequestException('Hesap pasif — senkronizasyon kapalı');
    }

    const dryRun = dto.dryRun === true;
    const adapter = this.getAdapter(account.platform);
    const mode = dto.mode || 'all';
    const result: Record<string, unknown> = { dryRun, stub: true };

    try {
      if (mode === 'stock' || mode === 'all') {
        const listings = await this.em.find(MarketplaceListing, {
          where: { accountId: account.id, syncStock: true, isActive: true },
          relations: { product: true, variant: true },
        });
        const items = listings.map((l) => ({
          externalListingId: l.externalListingId,
          stock: l.variant?.stock ?? l.product?.stock ?? 0,
          sku: l.externalSku || undefined,
        }));
        const stockResult = await adapter.syncStock(
          account.credentials,
          items,
        );
        if (!dryRun) {
          for (const listing of listings) {
            listing.lastSyncedStock =
              listing.variant?.stock ?? listing.product?.stock ?? 0;
            await this.em.save(listing);
          }
        }
        result.stock = stockResult;
      }

      if (mode === 'orders' || mode === 'all') {
        const pulled = await adapter.pullOrders(account.credentials);
        let inserted = 0;
        if (!dryRun) {
          for (const order of pulled.orders) {
            const existing = await this.em.findOne(MarketplaceOrder, {
              where: {
                accountId: account.id,
                externalOrderId: order.externalOrderId,
              },
            });
            if (!existing) {
              const row = this.em.create(MarketplaceOrder, {
                accountId: account.id,
                externalOrderId: order.externalOrderId,
                externalStatus: order.externalStatus,
                payload: order.payload,
              });
              await this.em.save(row);
              inserted += 1;
            }
          }
        }
        result.orders = { ...pulled, inserted: dryRun ? 0 : inserted };
      }

      if (!dryRun) {
        account.lastSyncAt = new Date();
        account.lastSyncStatus = 'success';
        await this.em.save(account);
      }

      return {
        accountId: account.id,
        dryRun,
        status: 'success' as const,
        ...result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!dryRun) {
        account.lastSyncAt = new Date();
        account.lastSyncStatus = 'error';
        await this.em.save(account);
      }
      throw new BadRequestException({
        message: `Senkron başarısız: ${message}`,
        accountId: account.id,
        status: 'error',
        dryRun,
      });
    }
  }

  async pushProduct(accountId: string, dto: PushMarketplaceProductDto) {
    const account = await this.em.findOne(MarketplaceAccount, {
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Pazar yeri hesabı bulunamadı');
    }
    if (!account.isEnabled) {
      throw new BadRequestException('Hesap pasif — ürün gönderimi kapalı');
    }
    const product = await this.em.findOne(Product, {
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    let stock = product.stock;
    let sku: string | undefined;
    let price = product.basePrice;
    if (dto.variantId) {
      const variant = await this.em.findOne(ProductVariant, {
        where: { id: dto.variantId, productId: product.id },
      });
      if (!variant) {
        throw new NotFoundException('Varyant bulunamadı');
      }
      stock = variant.stock;
      sku = variant.sku;
      price = variant.price;
    }

    const adapter = this.getAdapter(account.platform);
    const pushed = await adapter.pushProduct(account.credentials, {
      productId: product.id,
      name: product.name,
      price,
      stock,
      sku,
      description: product.shortDescription || product.description,
    });

    if (dto.dryRun) {
      return { dryRun: true, listing: null, pushed };
    }

    const listing = this.em.create(MarketplaceListing, {
      accountId: account.id,
      productId: product.id,
      variantId: dto.variantId ?? null,
      externalListingId: pushed.externalListingId,
      externalSku: sku ?? null,
      syncStock: true,
      lastSyncedStock: stock,
      isActive: true,
    });
    await this.em.save(listing);
    return { dryRun: false, listing, pushed };
  }
}
