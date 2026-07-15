import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { Category } from '@entities/category.entity';
import { ProductVariant } from '@entities/product-variant.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 180 })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 400, nullable: true })
  shortDescription!: string | null;

  @Column({ name: 'origin_country', type: 'varchar', length: 80, nullable: true })
  originCountry!: string | null;

  @Column({ name: 'origin_region', type: 'varchar', length: 120, nullable: true })
  originRegion!: string | null;

  @Column({ name: 'altitude', type: 'varchar', length: 80, nullable: true })
  altitude!: string | null;

  @Column({ name: 'process', type: 'varchar', length: 80, nullable: true })
  process!: string | null;

  @Column({ name: 'varietal', type: 'varchar', length: 120, nullable: true })
  varietal!: string | null;

  @Column({ name: 'batch_id', type: 'varchar', length: 80, nullable: true })
  batchId!: string | null;

  @Column({ name: 'roast_level', type: 'varchar', length: 60, nullable: true })
  roastLevel!: string | null;

  @Column({ name: 'flavor_notes', type: 'text', array: true, default: '{}' })
  flavorNotes!: string[];

  @Column({ name: 'flavor_geometry', type: 'jsonb', nullable: true })
  flavorGeometry!: Record<string, number> | null;

  @Column({ name: 'roast_log', type: 'jsonb', nullable: true })
  roastLog!: Record<string, unknown> | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'gallery', type: 'text', array: true, default: '{}' })
  gallery!: string[];

  @Column({ name: 'badge', type: 'varchar', length: 80, nullable: true })
  badge!: string | null;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2 })
  basePrice!: string;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ name: 'stock', type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  /** Onaylı yorum ortalaması (1–5) */
  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg!: string;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount!: number;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants!: ProductVariant[];
}
