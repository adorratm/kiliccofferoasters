export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_SHIPPING_POLL = 'shipping-poll';
export const QUEUE_ABANDONED_CART = 'abandoned-cart';
export const QUEUE_MARKETPLACE_SYNC = 'marketplace-sync';
export const QUEUE_LOW_STOCK = 'low-stock';

export type NotificationChannelName = 'email' | 'whatsapp' | 'sms';

export type NotificationJobPayload = {
  orderId?: string;
  shipmentId?: string | null;
  template: string;
  channels: NotificationChannelName[];
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

export type MarketplaceSyncJobPayload = {
  reason?: string;
  mode?: 'stock' | 'orders' | 'all';
};

export type LowStockJobPayload = {
  reason?: string;
};
