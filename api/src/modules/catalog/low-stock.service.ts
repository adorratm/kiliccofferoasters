import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, LessThanOrEqual } from 'typeorm';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { AdminAllowlist } from '@entities/admin-allowlist.entity';
import {
  NotificationChannel,
  NotificationLog,
  NotificationStatus,
} from '@entities/notification-log.entity';
import { NotificationsService } from '@modules/notifications/notifications.service';

export type LowStockRow = {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  weightLabel: string | null;
  stock: number;
};

@Injectable()
export class LowStockService {
  private readonly logger = new Logger(LowStockService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  threshold(): number {
    return Number(this.config.get<number>('lowStock.threshold') ?? 10);
  }

  async listLowStock(threshold = this.threshold()): Promise<LowStockRow[]> {
    const rows: LowStockRow[] = [];

    const variants = await this.em
      .createQueryBuilder(ProductVariant, 'v')
      .innerJoinAndSelect('v.product', 'p')
      .where('v.is_active = true')
      .andWhere('p.is_active = true')
      .andWhere('v.stock <= :threshold', { threshold })
      .orderBy('v.stock', 'ASC')
      .getMany();

    for (const v of variants) {
      rows.push({
        productId: v.productId,
        variantId: v.id,
        name: v.product?.name || 'Ürün',
        sku: v.sku,
        weightLabel: v.weightLabel,
        stock: v.stock,
      });
    }

    const products = await this.em.find(Product, {
      where: {
        isActive: true,
        stock: LessThanOrEqual(threshold),
      },
      relations: { variants: true },
    });

    for (const p of products) {
      const hasActiveVariant = (p.variants || []).some((v) => v.isActive);
      if (hasActiveVariant) continue;
      rows.push({
        productId: p.id,
        variantId: null,
        name: p.name,
        sku: null,
        weightLabel: null,
        stock: p.stock,
      });
    }

    return rows;
  }

  async checkAndAlert(productId: string): Promise<void> {
    const threshold = this.threshold();
    const product = await this.em.findOne(Product, {
      where: { id: productId },
      relations: { variants: true },
    });
    if (!product || !product.isActive) return;

    const candidates: LowStockRow[] = [];
    const activeVariants = (product.variants || []).filter((v) => v.isActive);
    if (activeVariants.length) {
      for (const v of activeVariants) {
        if (v.stock <= threshold) {
          candidates.push({
            productId: product.id,
            variantId: v.id,
            name: product.name,
            sku: v.sku,
            weightLabel: v.weightLabel,
            stock: v.stock,
          });
        }
      }
    } else if (product.stock <= threshold) {
      candidates.push({
        productId: product.id,
        variantId: null,
        name: product.name,
        sku: null,
        weightLabel: null,
        stock: product.stock,
      });
    }

    if (!candidates.length) return;
    const emails = await this.resolveRecipients();
    if (!emails.length) {
      this.logger.warn('Low stock alert skipped — no admin recipients');
      return;
    }

    for (const row of candidates) {
      if (await this.wasAlertedRecently(row)) continue;
      await this.notifications.enqueueLowStockAlert(row, emails);
      this.logger.log(
        `Low stock alert queued: ${row.name} (${row.weightLabel || 'base'})=${row.stock}`,
      );
    }
  }

  async scanAndAlertAll(): Promise<void> {
    const rows = await this.listLowStock();
    const productIds = [...new Set(rows.map((r) => r.productId))];
    this.logger.log(
      `Low-stock scan: ${rows.length} row(s), ${productIds.length} product(s)`,
    );
    for (const productId of productIds) {
      await this.checkAndAlert(productId);
    }
  }

  private async resolveRecipients(): Promise<string[]> {
    const envList = this.config.get<string[]>('adminAllowlist') || [];
    const extra = this.config.get<string[]>('lowStock.alertEmails') || [];
    const rows = await this.em.find(AdminAllowlist, {
      where: { active: true },
    });
    return [
      ...new Set(
        [...envList, ...extra, ...rows.map((r) => r.email)]
          .map((e) => e.toLowerCase().trim())
          .filter(Boolean),
      ),
    ];
  }

  private async wasAlertedRecently(row: LowStockRow): Promise<boolean> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.em.find(NotificationLog, {
      where: {
        template: 'low_stock',
        channel: NotificationChannel.EMAIL,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return logs.some((log) => {
      if (log.status === NotificationStatus.FAILED) return false;
      if (log.createdAt < since) return false;
      const payload = log.payload || {};
      return (
        payload.productId === row.productId &&
        (payload.variantId || null) === (row.variantId || null)
      );
    });
  }
}
