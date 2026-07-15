export type ProductVariant = {
  id?: string;
  sku: string;
  weightLabel: string;
  price: string | number;
  stock: number;
  isActive?: boolean;
};

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
  variants?: ProductVariant[];
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
  variantLabel?: string | null;
  grindLabel?: string | null;
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

export type OrderPayment = {
  id?: string;
  provider?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  paymentId?: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress?: Record<string, string>;
  billingAddress?: Record<string, string> | null;
  subtotal: string | number;
  shippingFee?: string | number;
  discountAmount?: string | number;
  couponCode?: string | null;
  taxAmount?: string | number;
  total: string | number;
  currency?: string;
  shippingProvider?: string | null;
  notes?: string | null;
  legalAcceptances?: Record<string, unknown> | null;
  payment?: OrderPayment | null;
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
  revenueToday?: number;
  pendingOrders?: number;
  marketplaceSync?: {
    platform: string;
    storeName: string;
    lastSyncAt?: string | null;
    lastSyncStatus?: string | null;
  }[];
};

export type Coupon = {
  id: string;
  code: string;
  title: string | null;
  type: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxUses: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt?: string;
  product?: { id: string; name: string; slug?: string } | null;
};
