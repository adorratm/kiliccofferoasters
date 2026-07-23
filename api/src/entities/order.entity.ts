import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { User } from '@entities/user.entity';
import { OrderItem } from '@entities/order-item.entity';
import { Payment } from '@entities/payment.entity';
import { Shipment } from '@entities/shipment.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 40 })
  orderNumber!: string;

  @ManyToOne(() => User, (user) => user.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status!: OrderStatus;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 160 })
  customerName!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 40 })
  customerPhone!: string;

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress!: Record<string, string>;

  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress!: Record<string, string> | null;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal!: string;

  @Column({ name: 'shipping_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingFee!: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ name: 'coupon_code', type: 'varchar', length: 40, nullable: true })
  couponCode!: string | null;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total!: string;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ name: 'shipping_provider', type: 'varchar', length: 60, nullable: true })
  shippingProvider!: string | null;

  @Column({ name: 'legal_acceptances', type: 'jsonb', nullable: true })
  legalAcceptances!: Record<string, unknown> | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  /** Checkout sırasında kullanılan sepet; ödeme PAID olunca temizlenir */
  @Column({ name: 'source_cart_id', type: 'uuid', nullable: true })
  sourceCartId!: string | null;

  /**
   * Stok bu sipariş için düşüldüyse true.
   * İptal/iadede iade edilince false olur — çift düşme/iadeyi engeller.
   */
  @Column({ name: 'stock_decremented', type: 'boolean', default: false })
  stockDecremented!: boolean;

  /** Teslim tarihi — cayma süresi için */
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment!: Payment | null;

  @OneToMany(() => Shipment, (shipment) => shipment.order)
  shipments!: Shipment[];
}
