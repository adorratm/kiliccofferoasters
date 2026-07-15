import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MarketplaceAccount } from '@entities/marketplace-account.entity';
import { MarketplaceService } from '@modules/marketplace/marketplace.service';

@Injectable()
export class MarketplaceSyncService {
  private readonly logger = new Logger(MarketplaceSyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly marketplace: MarketplaceService,
    private readonly config: ConfigService,
  ) {}

  async syncAllEnabled(options?: {
    mode?: 'stock' | 'orders' | 'all';
    dryRun?: boolean;
  }): Promise<{
    scanned: number;
    ok: number;
    failed: number;
    results: Array<{ accountId: string; storeName: string; ok: boolean; error?: string }>;
  }> {
    const enabled = this.config.get<boolean>('marketplaceSync.enabled');
    if (enabled === false) {
      this.logger.log('Marketplace auto-sync disabled by config');
      return { scanned: 0, ok: 0, failed: 0, results: [] };
    }

    const accounts = await this.em.find(MarketplaceAccount, {
      where: { isEnabled: true },
      order: { updatedAt: 'ASC' },
      take: 50,
    });

    const mode = options?.mode || 'all';
    const dryRun = options?.dryRun === true;
    const results: Array<{
      accountId: string;
      storeName: string;
      ok: boolean;
      error?: string;
    }> = [];
    let ok = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        await this.marketplace.syncAccount(account.id, { mode, dryRun });
        ok += 1;
        results.push({
          accountId: account.id,
          storeName: account.storeName,
          ok: true,
        });
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Auto-sync failed for ${account.platform}/${account.storeName}: ${message}`,
        );
        results.push({
          accountId: account.id,
          storeName: account.storeName,
          ok: false,
          error: message,
        });
      }
    }

    this.logger.log(
      `Marketplace auto-sync done scanned=${accounts.length} ok=${ok} failed=${failed}`,
    );
    return { scanned: accounts.length, ok, failed, results };
  }
}
