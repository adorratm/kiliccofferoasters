import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { Address } from '@entities/address.entity';
import { Order } from '@entities/order.entity';
import { Cart } from '@entities/cart.entity';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 120, nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 120, nullable: true })
  lastName!: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({
    name: 'password_reset_token_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  passwordResetTokenHash!: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt!: Date | null;

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts!: Cart[];
}
