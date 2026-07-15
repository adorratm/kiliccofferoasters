import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Cart } from '@entities/cart.entity';
import { CartItem } from '@entities/cart-item.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import {
  AddCartItemDto,
  UpdateCartItemDto,
} from '@modules/cart/dto/cart.dto';

const CART_RELATIONS = {
  items: { product: true, variant: true },
} as const;

@Injectable()
export class CartService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getOrCreateCart(
    userId?: string | null,
    sessionId?: string | null,
  ): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new BadRequestException(
        'Kullanıcı veya X-Session-Id gerekli',
      );
    }

    let cart: Cart | null = null;
    if (userId) {
      const carts = await this.em.find(Cart, {
        where: { userId },
        relations: CART_RELATIONS,
        order: { createdAt: 'DESC' },
        take: 1,
      });
      cart = carts[0] ?? null;
    }
    if (!cart && sessionId) {
      cart = await this.em.findOne(Cart, {
        where: { sessionId },
        relations: CART_RELATIONS,
      });
    }

    if (!cart) {
      cart = this.em.create(Cart, {
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        items: [],
      });
      await this.em.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async getCart(userId?: string | null, sessionId?: string | null) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.withTotals(cart);
  }

  async addItem(
    dto: AddCartItemDto,
    userId?: string | null,
    sessionId?: string | null,
  ) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const product = await this.em.findOne(Product, {
      where: { id: dto.productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    let unitPrice = product.basePrice;
    let variantId: string | null = dto.variantId ?? null;
    if (dto.variantId) {
      const variant = await this.em.findOne(ProductVariant, {
        where: {
          id: dto.variantId,
          productId: product.id,
          isActive: true,
        },
      });
      if (!variant) {
        throw new NotFoundException('Varyant bulunamadı');
      }
      unitPrice = variant.price;
      variantId = variant.id;
    }

    const grindOption = dto.grindOption ?? 'whole_bean';

    const existing = cart.items?.find(
      (i) =>
        i.productId === product.id &&
        (i.variantId ?? null) === variantId &&
        (i.grindOption ?? 'whole_bean') === grindOption,
    );

    if (existing) {
      existing.quantity += dto.quantity;
      existing.unitPrice = unitPrice;
      existing.grindOption = grindOption;
      await this.em.save(existing);
    } else {
      const item = this.em.create(CartItem, {
        cartId: cart.id,
        productId: product.id,
        variantId,
        grindOption,
        quantity: dto.quantity,
        unitPrice,
      });
      await this.em.save(item);
    }

    await this.touchCart(cart);
    return this.getCart(userId, sessionId);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string | null,
    sessionId?: string | null,
  ) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.em.findOne(CartItem, {
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Sepet kalemi bulunamadı');
    }
    item.quantity = dto.quantity;
    if (dto.grindOption !== undefined) {
      item.grindOption = dto.grindOption;
    }
    await this.em.save(item);
    await this.touchCart(cart);
    return this.getCart(userId, sessionId);
  }

  async removeItem(
    itemId: string,
    userId?: string | null,
    sessionId?: string | null,
  ) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.em.findOne(CartItem, {
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Sepet kalemi bulunamadı');
    }
    await this.em.remove(item);
    await this.touchCart(cart);
    return this.getCart(userId, sessionId);
  }

  /** Abandoned cart cron için güncel aktivite zamanı */
  private async touchCart(cart: Cart) {
    // Relation collection'ı kaydetme — boş items + eski cascade kalemleri siliyordu
    await this.em.update(Cart, cart.id, { abandonedReminderAt: null });
  }

  private withTotals(cart: Cart) {
    const items = cart.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    return {
      ...cart,
      items,
      subtotal: subtotal.toFixed(2),
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
    };
  }
}
