export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  weightLabel: string;
  price: string;
  stock: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  originCountry: string | null;
  originRegion: string | null;
  altitude: string | null;
  process: string | null;
  varietal: string | null;
  batchId: string | null;
  roastLevel: string | null;
  flavorNotes: string[];
  flavorGeometry: Record<string, number> | null;
  roastLog: Record<string, unknown> | null;
  imageUrl: string | null;
  gallery: string[];
  badge: string | null;
  basePrice: string;
  currency: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  variants?: ProductVariant[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductQuery = {
  q?: string;
  categorySlug?: string;
  roastLevel?: string;
  originCountry?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "name" | "price" | "createdAt" | "stock";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchResponse = {
  q: string;
  groups: { type: string; label: string; items: SearchHit[] }[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
  product?: Product;
  variant?: ProductVariant | null;
};

export type Cart = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItem[];
  subtotal?: string;
  currency?: string;
};

export type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type ShippingProvider = {
  id: string;
  code: string;
  name: string;
  fee: string;
  estimatedDays?: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string> | null;
  subtotal: string;
  shippingFee: string;
  taxAmount: string;
  total: string;
  currency: string;
  shippingProvider: string | null;
  items: OrderItem[];
  createdAt?: string;
  shipments?: Shipment[];
};

export type Address = {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export type AddressPayload = {
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood?: string;
  addressLine: string;
  postalCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
};

export type Shipment = {
  id: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  provider: string;
  status: string;
};

export type TrackingResult = {
  code: string;
  status: string;
  provider?: string;
  trackingUrl?: string | null;
  events?: Array<{ at: string; description: string; location?: string }>;
  order?: Pick<Order, "orderNumber" | "status" | "customerName">;
};

export type LegalDocument = {
  slug: string;
  title: string;
  content: string;
  version: string;
  locale: string;
  publishedAt?: string | null;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  authorName: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  locale: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BlogQuery = {
  q?: string;
  tag?: string;
  sort?: "publishedAt" | "createdAt" | "updatedAt" | "title";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type CheckoutPayload = {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    neighborhood?: string;
    addressLine: string;
    postalCode: string;
  };
  billingAddress?: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    neighborhood?: string;
    addressLine: string;
    postalCode: string;
  };
  shippingProvider: string;
  legalAcceptances: {
    mesafeliSatis: boolean;
    onBilgilendirme: boolean;
    kvkk: boolean;
  };
  notes?: string;
};

export type PaymentInitResponse = {
  orderId: string;
  orderNumber: string;
  paymentPageUrl?: string;
  token?: string;
  checkoutFormContent?: string;
};
