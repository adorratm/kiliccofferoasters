export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_SHIPPING_POLL = 'shipping-poll';
export const QUEUE_ABANDONED_CART = 'abandoned-cart';

export type NotificationJobPayload = {
  orderId?: string;
  shipmentId?: string | null;
  template: string;
  channels: Array<'email' | 'sms'>;
  context?: Record<string, unknown>;
  recipientEmail?: string;
  recipientName?: string;
  recipientPhone?: string;
  cartId?: string;
};

export type ShippingPollJobPayload = {
  reason?: string;
};

export type AbandonedCartJobPayload = {
  reason?: string;
};
