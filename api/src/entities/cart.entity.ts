import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { User } from '@entities/user.entity';
import { CartItem } from '@entities/cart-item.entity';

@Entity('carts')
export class Cart extends BaseEntity {
  @ManyToOne(() => User, (user) => user.carts, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 120, nullable: true })
  sessionId!: string | null;

  /** Abandoned cart hatırlatması gönderildiğinde set edilir */
  @Column({ name: 'abandoned_reminder_at', type: 'timestamptz', nullable: true })
  abandonedReminderAt!: Date | null;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items!: CartItem[];
}
