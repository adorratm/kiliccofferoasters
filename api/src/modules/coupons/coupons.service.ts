import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Coupon, CouponType } from '@entities/coupon.entity';
import { CouponRedemption } from '@entities/coupon-redemption.entity';
import { Order, OrderStatus } from '@entities/order.entity';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '@modules/coupons/dto/coupons.dto';

export type CouponPreview = {
  valid: boolean;
  code: string;
  title: string | null;
  type: CouponType;
  value: string;
  discountAmount: string;
  message?: string;
};

@Injectable()
export class CouponsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  listAdmin(): Promise<Coupon[]> {
    return this.em.find(Coupon, { order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const exists = await this.em.findOne(Coupon, { where: { code: dto.code } });
    if (exists) throw new ConflictException('Bu kupon kodu zaten var');
    const coupon = this.em.create(Coupon, {
      code: dto.code,
      title: dto.title ?? null,
      type: dto.type,
      value: String(dto.value),
      minSubtotal: String(dto.minSubtotal ?? 0),
      maxUses: dto.maxUses ?? null,
      usedCount: 0,
      firstOrderOnly: dto.firstOrderOnly ?? false,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      isActive: dto.isActive ?? true,
    });
    return this.em.save(coupon);
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.em.findOne(Coupon, { where: { id } });
    if (!coupon) throw new NotFoundException('Kupon bulunamadı');
    if (dto.code && dto.code !== coupon.code) {
      const exists = await this.em.findOne(Coupon, { where: { code: dto.code } });
      if (exists) throw new ConflictException('Bu kupon kodu zaten var');
      coupon.code = dto.code;
    }
    if (dto.title !== undefined) coupon.title = dto.title || null;
    if (dto.type !== undefined) coupon.type = dto.type;
    if (dto.value !== undefined) coupon.value = String(dto.value);
    if (dto.minSubtotal !== undefined) coupon.minSubtotal = String(dto.minSubtotal);
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.firstOrderOnly !== undefined) coupon.firstOrderOnly = dto.firstOrderOnly;
    if (dto.startsAt !== undefined) {
      coupon.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      coupon.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;
    return this.em.save(coupon);
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.em.findOne(Coupon, { where: { id } });
    if (!coupon) throw new NotFoundException('Kupon bulunamadı');
    await this.em.remove(coupon);
  }

  async validate(
    dto: ValidateCouponDto,
    userId?: string | null,
  ): Promise<CouponPreview> {
    const coupon = await this.em.findOne(Coupon, {
      where: { code: dto.code },
    });
    if (!coupon || !coupon.isActive) {
      return invalid(dto.code, 'Geçersiz kupon kodu');
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return invalid(dto.code, 'Kupon henüz başlamadı');
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return invalid(dto.code, 'Kupon süresi dolmuş');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return invalid(dto.code, 'Kupon kullanım limiti dolmuş');
    }
    if (dto.subtotal < Number(coupon.minSubtotal)) {
      return invalid(
        dto.code,
        `Minimum sepet tutarı ₺${Number(coupon.minSubtotal).toFixed(2)}`,
      );
    }

    if (coupon.firstOrderOnly) {
      const email = dto.email?.toLowerCase().trim();
      if (!email && !userId) {
        return invalid(dto.code, 'İlk sipariş kuponu için e-posta gerekli');
      }
      const qb = this.em
        .createQueryBuilder(Order, 'o')
        .where('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
        });
      if (userId) qb.andWhere('o.user_id = :userId', { userId });
      else if (email) qb.andWhere('LOWER(o.customer_email) = :email', { email });
      const prior = await qb.getCount();
      if (prior > 0) {
        return invalid(dto.code, 'Bu kupon yalnızca ilk siparişte geçerli');
      }
    }

    const discountAmount = this.computeDiscount(coupon, dto.subtotal);
    if (discountAmount <= 0) {
      return invalid(dto.code, 'Bu kupon uygulanamadı');
    }

    return {
      valid: true,
      code: coupon.code,
      title: coupon.title,
      type: coupon.type,
      value: coupon.value,
      discountAmount: discountAmount.toFixed(2),
    };
  }

  computeDiscount(coupon: Coupon, subtotal: number): number {
    let discount = 0;
    if (coupon.type === CouponType.PERCENT) {
      discount = (subtotal * Number(coupon.value)) / 100;
    } else {
      discount = Number(coupon.value);
    }
    return Math.min(Math.max(0, discount), subtotal);
  }

  /**
   * Ödeme başarılı olduktan sonra kupon kullanımını kaydet.
   * Checkout'ta yalnızca validate edilir; buraya kadar harcanmış sayılmaz.
   */
  async confirmRedemptionForPaidOrder(orderId: string): Promise<void> {
    const order = await this.em.findOne(Order, { where: { id: orderId } });
    if (!order?.couponCode) return;

    const existing = await this.em.findOne(CouponRedemption, {
      where: { orderId },
    });
    if (existing) return;

    await this.em.transaction(async (tx) => {
      const coupon = await tx
        .createQueryBuilder(Coupon, 'c')
        .setLock('pessimistic_write')
        .where('c.code = :code', { code: order.couponCode })
        .getOne();
      if (!coupon) return;

      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return;
      }

      coupon.usedCount += 1;
      await tx.save(coupon);
      await tx.save(
        tx.create(CouponRedemption, {
          couponId: coupon.id,
          orderId: order.id,
          userId: order.userId ?? null,
          email: order.customerEmail.toLowerCase().trim(),
          discountAmount: order.discountAmount || '0',
        }),
      );
    });
  }
}

function invalid(code: string, message: string): CouponPreview {
  return {
    valid: false,
    code,
    title: null,
    type: CouponType.PERCENT,
    value: '0',
    discountAmount: '0.00',
    message,
  };
}
