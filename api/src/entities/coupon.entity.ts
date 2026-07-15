import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { CouponRedemption } from '@entities/coupon-redemption.entity';

export enum CouponType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('coupons')
export class Coupon extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title!: string | null;

  @Column({ type: 'enum', enum: CouponType, default: CouponType.PERCENT })
  type!: CouponType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value!: string;

  @Column({ name: 'min_subtotal', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minSubtotal!: string;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'first_order_only', type: 'boolean', default: false })
  firstOrderOnly!: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => CouponRedemption, (r) => r.coupon)
  redemptions!: CouponRedemption[];
}
