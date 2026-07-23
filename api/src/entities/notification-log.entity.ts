import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notification_logs')
export class NotificationLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel!: NotificationChannel;

  @Column({ type: 'varchar', length: 200 })
  recipient!: string;

  @Column({ type: 'varchar', length: 80 })
  template!: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ name: 'shipment_id', type: 'uuid', nullable: true })
  shipmentId!: string | null;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status!: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Index()
  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  providerMessageId!: string | null;
}
