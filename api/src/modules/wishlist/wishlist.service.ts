import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { WishlistItem } from '@entities/wishlist-item.entity';
import { Product } from '@entities/product.entity';
import { AddWishlistItemDto } from '@modules/wishlist/dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async list(userId: string): Promise<WishlistItem[]> {
    return this.em.find(WishlistItem, {
      where: { userId },
      relations: { product: { variants: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async listProductIds(userId: string): Promise<string[]> {
    const rows = await this.em
      .createQueryBuilder(WishlistItem, 'w')
      .select('w.product_id', 'productId')
      .where('w.user_id = :userId', { userId })
      .getRawMany<{ productId: string }>();
    return rows.map((r) => r.productId);
  }

  async add(userId: string, dto: AddWishlistItemDto): Promise<WishlistItem> {
    const product = await this.em.findOne(Product, {
      where: { id: dto.productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı');

    const existing = await this.em.findOne(WishlistItem, {
      where: { userId, productId: product.id },
    });
    if (existing) throw new ConflictException('Ürün zaten favorilerde');

    const item = this.em.create(WishlistItem, {
      userId,
      productId: product.id,
    });
    return this.em.save(item);
  }

  async remove(userId: string, productId: string): Promise<void> {
    const item = await this.em.findOne(WishlistItem, {
      where: { userId, productId },
    });
    if (!item) throw new NotFoundException('Favori bulunamadı');
    await this.em.remove(item);
  }

  async toggle(
    userId: string,
    productId: string,
  ): Promise<{ inWishlist: boolean; productId: string }> {
    const existing = await this.em.findOne(WishlistItem, {
      where: { userId, productId },
    });
    if (existing) {
      await this.em.remove(existing);
      return { inWishlist: false, productId };
    }
    await this.add(userId, { productId });
    return { inWishlist: true, productId };
  }
}
