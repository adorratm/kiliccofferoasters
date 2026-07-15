import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CartItem } from '@entities/cart-item.entity';
import { Order } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { LowStockService } from '@modules/catalog/low-stock.service';

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
   * Aynı sipariş için ikinci kez çağrılmamalı (ödeme callback'inde PAID kontrolü).
   */
  async decrementForPaidOrder(orderId: string): Promise<void> {
    const order = await this.em.findOne(Order, {
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order?.items?.length) return;

    const touchedProductIds = new Set<string>();

    await this.em.transaction(async (tx) => {
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
}
