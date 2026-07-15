import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, MoreThanOrEqual } from 'typeorm';
import { Order, OrderStatus } from '@entities/order.entity';
import { MarketplaceAccount } from '@entities/marketplace-account.entity';
import { LowStockService } from '@modules/catalog/low-stock.service';

export type DashboardStats = {
  ordersToday: number;
  lowStockCount: number;
  revenueToday: number;
  pendingOrders: number;
  marketplaceSync: {
    platform: string;
    storeName: string;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
  }[];
};

@Injectable()
export class AdminService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly lowStock: LowStockService,
  ) {}

  async getStats(lowStockThreshold?: number): Promise<DashboardStats> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const threshold =
      lowStockThreshold !== undefined && Number.isFinite(lowStockThreshold)
        ? lowStockThreshold
        : this.lowStock.threshold();

    const [ordersToday, lowStockRows, revenueRow, pendingOrders, accounts] =
      await Promise.all([
        this.em.count(Order, {
          where: { createdAt: MoreThanOrEqual(start) },
        }),
        this.lowStock.listLowStock(threshold),
        this.em
          .createQueryBuilder(Order, 'o')
          .select('COALESCE(SUM(o.total), 0)', 'sum')
          .where('o.created_at >= :start', { start })
          .andWhere("o.status NOT IN ('cancelled', 'pending_payment')")
          .getRawOne<{ sum: string }>(),
        this.em.count(Order, {
          where: { status: OrderStatus.PROCESSING },
        }),
        this.em.find(MarketplaceAccount, {
          order: { updatedAt: 'DESC' },
        }),
      ]);

    return {
      ordersToday,
      lowStockCount: lowStockRows.length,
      revenueToday: Number(revenueRow?.sum || 0),
      pendingOrders,
      marketplaceSync: accounts.map((a) => ({
        platform: a.platform,
        storeName: a.storeName,
        lastSyncAt: a.lastSyncAt ? a.lastSyncAt.toISOString() : null,
        lastSyncStatus: a.lastSyncStatus ?? null,
      })),
    };
  }
}
