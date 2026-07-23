import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';

/**
 * Flash / indirim kampanyası.
 * productIds boşsa tüm aktif ürünlere uygulanır.
 */
@Entity('campaigns')
export class Campaign extends BaseEntity {
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug!: string;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  discountPercent!: string;

  /** Boş dizi = tüm ürünler */
  @Column({ name: 'product_ids', type: 'jsonb', default: [] })
  productIds!: string[];

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
