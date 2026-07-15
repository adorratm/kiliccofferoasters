import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { Product } from '@entities/product.entity';
import { User } from '@entities/user.entity';

@Entity('wishlist_items')
@Unique(['userId', 'productId'])
export class WishlistItem extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;
}
