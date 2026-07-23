import {
  ShippingProviderCode,
  ShipmentStatus,
} from '@entities/shipment.entity';

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  address: Record<string, string>;
  weightKg?: number;
  credentials: Record<string, string>;
  /** false ise credentials yokken mock oluşturma */
  allowMock?: boolean;
}

export interface CreateShipmentResult {
  trackingNumber: string;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  status: ShipmentStatus;
  rawResponse: Record<string, unknown>;
  mock: boolean;
}

export interface TrackShipmentResult {
  trackingNumber: string;
  status: ShipmentStatus;
  events: { date: string; description: string; location?: string }[];
  rawResponse: Record<string, unknown>;
  mock: boolean;
}

export interface IShippingAdapter {
  readonly code: ShippingProviderCode;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(
    trackingNumber: string,
    credentials: Record<string, string>,
  ): Promise<TrackShipmentResult>;
}

export function hasCredentials(credentials: Record<string, string>): boolean {
  return Object.values(credentials || {}).some(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
}

export function mockTrackingNumber(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}${Date.now().toString().slice(-6)}${rand}`;
}
