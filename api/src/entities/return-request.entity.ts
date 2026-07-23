import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';
import { Order } from '@entities/order.entity';
import { User } from '@entities/user.entity';

export enum ReturnRequestType {
  /** Kargoya verilmeden iptal */
  CANCEL = 'cancel',
  /** Teslim sonrası cayma / iade */
  RETURN = 'return',
}

export enum ReturnRequestStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

@Entity('return_requests')
export class ReturnRequest extends BaseEntity {
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({
    type: 'enum',
    enum: ReturnRequestType,
  })
  type!: ReturnRequestType;

  @Index()
  @Column({
    type: 'enum',
    enum: ReturnRequestStatus,
    default: ReturnRequestStatus.REQUESTED,
  })
  status!: ReturnRequestStatus;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote!: string | null;

  /** Onaylanan iade tutarı (TRY) */
  @Column({
    name: 'refund_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  refundAmount!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById!: string | null;
}
