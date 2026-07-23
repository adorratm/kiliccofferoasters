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

  /** Abandoned cart 1. hatırlatma */
  @Column({ name: 'abandoned_reminder_at', type: 'timestamptz', nullable: true })
  abandonedReminderAt!: Date | null;

  /** Abandoned cart 2. hatırlatma */
  @Column({
    name: 'abandoned_reminder2_at',
    type: 'timestamptz',
    nullable: true,
  })
  abandonedReminder2At!: Date | null;

  /** Misafir sepet hatırlatması için e-posta */
  @Column({ name: 'guest_email', type: 'varchar', length: 255, nullable: true })
  guestEmail!: string | null;

  /** cascade verme: boş items ile save kalemleri silebilir */
  @OneToMany(() => CartItem, (item) => item.cart)
  items!: CartItem[];
}
