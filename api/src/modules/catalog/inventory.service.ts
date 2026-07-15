import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CartItem } from '@entities/cart-item.entity';
import { Order, OrderStatus } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { LowStockService } from '@modules/catalog/low-stock.service';

const TERMINAL_RESTOCK = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly lowStock: LowStockService,
  ) {}

  async assertCartStock(items: CartItem[]): Promise<void> {
    for (const item of items) {
      const name = item.product?.name || 'Ürün';
      if (item.variantId) {
        const variant = await this.em.findOne(ProductVariant, {
          where: { id: item.variantId, isActive: true },
        });
        if (!variant) {
          throw new BadRequestException(`${name} varyantı bulunamadı`);
        }
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `${name}${variant.weightLabel ? ` (${variant.weightLabel})` : ''} için yetersiz stok (kalan: ${variant.stock})`,
          );
        }
      } else if (item.productId) {
        const product = await this.em.findOne(Product, {
          where: { id: item.productId, isActive: true },
        });
        if (!product) {
          throw new BadRequestException(`${name} bulunamadı`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `${name} için yetersiz stok (kalan: ${product.stock})`,
          );
        }
      }
    }
  }

  /**
   * Ödeme başarılı olduğunda sipariş kalemlerinden stok düşer.
   * `stockDecremented` true ise no-op (çift düşmeyi engeller).
   */
  async decrementForPaidOrder(orderId: string): Promise<void> {
    const order = await this.em.findOne(Order, {
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order?.items?.length) return;
    if (order.stockDecremented) {
      this.logger.debug(`Stock already decremented for order ${orderId}`);
      return;
    }

    const touchedProductIds = new Set<string>();

    await this.em.transaction(async (tx) => {
      const locked = await tx.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.stockDecremented) return;

      for (const item of order.items as OrderItem[]) {
        if (item.variantId) {
          const variant = await tx.findOne(ProductVariant, {
            where: { id: item.variantId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!variant) {
            this.logger.warn(
              `Stock skip: variant ${item.variantId} missing (order ${orderId})`,
            );
            continue;
          }
          variant.stock = Math.max(0, variant.stock - item.quantity);
          await tx.save(variant);
          touchedProductIds.add(variant.productId);
        } else if (item.productId) {
          const product = await tx.findOne(Product, {
            where: { id: item.productId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            this.logger.warn(
              `Stock skip: product ${item.productId} missing (order ${orderId})`,
            );
            continue;
          }
          product.stock = Math.max(0, product.stock - item.quantity);
          await tx.save(product);
          touchedProductIds.add(product.id);
        }
      }

      locked.stockDecremented = true;
      await tx.save(locked);
    });

    for (const productId of touchedProductIds) {
      try {
        await this.lowStock.checkAndAlert(productId);
      } catch (err) {
        this.logger.warn(
          `Low stock check failed for ${productId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  /**
   * İptal/iade: daha önce düşülmüş stoku geri yükler.
   * `stockDecremented` false ise no-op.
   */
  async restoreForCancelledOrder(orderId: string): Promise<boolean> {
    const order = await this.em.findOne(Order, {
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order?.items?.length) return false;
    if (!order.stockDecremented) {
      this.logger.debug(`Stock restore skip (not decremented): ${orderId}`);
      return false;
    }

    await this.em.transaction(async (tx) => {
      const locked = await tx.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || !locked.stockDecremented) return;

      for (const item of order.items as OrderItem[]) {
        if (item.variantId) {
          const variant = await tx.findOne(ProductVariant, {
            where: { id: item.variantId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!variant) {
            this.logger.warn(
              `Stock restore skip: variant ${item.variantId} missing (order ${orderId})`,
            );
            continue;
          }
          variant.stock += item.quantity;
          await tx.save(variant);
        } else if (item.productId) {
          const product = await tx.findOne(Product, {
            where: { id: item.productId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            this.logger.warn(
              `Stock restore skip: product ${item.productId} missing (order ${orderId})`,
            );
            continue;
          }
          product.stock += item.quantity;
          await tx.save(product);
        }
      }

      locked.stockDecremented = false;
      await tx.save(locked);
    });

    this.logger.log(`Stock restored for order ${orderId}`);
    return true;
  }

  /** Önceki durum → yeni durum: stok iadesi gerekiyorsa uygular */
  async maybeRestoreOnStatusChange(
    orderId: string,
    previous: OrderStatus,
    next: OrderStatus,
  ): Promise<boolean> {
    if (previous === next) return false;
    if (!TERMINAL_RESTOCK.has(next)) return false;
    if (TERMINAL_RESTOCK.has(previous)) return false;
    return this.restoreForCancelledOrder(orderId);
  }
}
