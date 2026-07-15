export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  originCountry?: string | null;
  originRegion?: string | null;
  process?: string | null;
  varietal?: string | null;
  batchId?: string | null;
  roastLevel?: string | null;
  flavorNotes?: string[];
  imageUrl?: string | null;
  gallery?: string[];
  badge?: string | null;
  basePrice: string | number;
  currency?: string;
  stock: number;
  isActive: boolean;
  isFeatured?: boolean;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

export type Shipment = {
  id: string;
  provider: string;
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress?: Record<string, string>;
  subtotal: string | number;
  shippingFee?: string | number;
  taxAmount?: string | number;
  total: string | number;
  currency?: string;
  shippingProvider?: string | null;
  notes?: string | null;
  items?: OrderItem[];
  shipments?: Shipment[];
  createdAt?: string;
};

export type ShippingProviderConfig = {
  id: string;
  provider: string;
  displayName: string;
  isEnabled: boolean;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
};

export type MarketplaceAccount = {
  id: string;
  platform: string;
  storeName: string;
  isEnabled: boolean;
  credentials?: Record<string, string>;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
};

export type LegalDocument = {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: string;
  isPublished: boolean;
  publishedAt?: string | null;
  locale?: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  locale?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ContactMessage = {
  id: string;
  senderName: string;
  senderEmail: string;
  protocolType: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  isActive: boolean;
  source?: string;
  createdAt?: string;
};

export type DashboardStats = {
  ordersToday?: number;
  lowStockCount?: number;
  marketplaceSync?: {
    platform: string;
    storeName: string;
    lastSyncAt?: string | null;
    lastSyncStatus?: string | null;
  }[];
};
