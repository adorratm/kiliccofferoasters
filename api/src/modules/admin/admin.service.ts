import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, MoreThanOrEqual } from 'typeorm';
import { Order, OrderStatus } from '@entities/order.entity';
import { Product } from '@entities/product.entity';
import { MarketplaceAccount } from '@entities/marketplace-account.entity';

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
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getStats(lowStockThreshold = 10): Promise<DashboardStats> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [ordersToday, lowStockCount, revenueRow, pendingOrders, accounts] =
      await Promise.all([
        this.em.count(Order, {
          where: { createdAt: MoreThanOrEqual(start) },
        }),
        this.em
          .createQueryBuilder(Product, 'p')
          .where('p.is_active = true')
          .andWhere('p.stock <= :threshold', { threshold: lowStockThreshold })
          .getCount(),
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
      lowStockCount,
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
