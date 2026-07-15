import type {
  Address,
  AddressPayload,
  AuthResponse,
  BlogPost,
  BlogQuery,
  Cart,
  Category,
  CheckoutPayload,
  CouponPreview,
  GuestOrderLookupResult,
  LegalDocument,
  Order,
  Paginated,
  PaymentInitResponse,
  Product,
  ProductQuery,
  ProductReview,
  ProductReviewsResponse,
  SearchResponse,
  ShippingProvider,
  TrackingResult,
  User,
  WishlistItem,
} from "@/lib/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type FetchOptions = RequestInit & {
  token?: string | null;
  sessionId?: string | null;
  json?: unknown;
};

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, sessionId, json, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (sessionId) {
    headers.set("X-Session-Id", sessionId);
  }

    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      // Mutasyon ve sepet isteklerinde bayat cache kullanma
      cache:
        rest.cache ??
        (json !== undefined || (rest.method && rest.method !== "GET")
          ? "no-store"
          : "default"),
      next:
        rest.next ??
        (json !== undefined || (rest.method && rest.method !== "GET")
          ? { revalidate: 0 }
          : { revalidate: 300 }),
    });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    const message =
      typeof body === "object" &&
      body &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `API error ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

function toQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function getProducts(
  params?: ProductQuery,
): Promise<Product[]> {
  const page = await getProductsPaged(params);
  return page.items;
}

export async function getProductsPaged(
  params?: ProductQuery,
): Promise<Paginated<Product>> {
  try {
    const qs = toQuery({
      q: params?.q,
      categorySlug: params?.categorySlug,
      roastLevel: params?.roastLevel,
      originCountry: params?.originCountry,
      featured: params?.featured,
      minPrice: params?.minPrice,
      maxPrice: params?.maxPrice,
      sort: params?.sort,
      order: params?.order,
      page: params?.page ?? 1,
      limit: params?.limit ?? 12,
    });
    const data = await apiFetch<Product[] | Paginated<Product>>(
      `/products${qs}`,
    );
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        limit: data.length || 12,
        totalPages: 1,
      };
    }
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 12,
      totalPages: data.totalPages ?? 1,
    };
  } catch {
    return { items: [], total: 0, page: 1, limit: 12, totalPages: 1 };
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const data = await apiFetch<Category[] | { items: Category[] }>(
      "/categories",
    );
    return Array.isArray(data) ? data : data.items ?? [];
  } catch {
    return [];
  }
}

export async function globalSearch(
  q: string,
  limit = 8,
): Promise<SearchResponse> {
  try {
    return await apiFetch<SearchResponse>(
      `/search${toQuery({ q, limit })}`,
    );
  } catch {
    return { q, groups: [] };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/products/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getProductReviews(
  slug: string,
  page = 1,
  limit = 20,
): Promise<ProductReviewsResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<ProductReviewsResponse>(
    `/reviews/product/${encodeURIComponent(slug)}?${qs}`,
    { cache: "no-store" },
  );
}

export async function createReview(
  payload: {
    productId: string;
    rating: number;
    title?: string;
    body: string;
  },
  token: string,
): Promise<ProductReview> {
  return apiFetch<ProductReview>("/reviews", {
    method: "POST",
    token,
    json: payload,
    cache: "no-store",
  });
}

export async function getCart(sessionId: string, token?: string | null) {
  return apiFetch<Cart>("/cart", { sessionId, token, cache: "no-store" });
}

export async function addCartItem(
  sessionId: string,
  payload: {
    productId: string;
    variantId?: string | null;
    grindOption?: string | null;
    quantity: number;
  },
  token?: string | null,
) {
  return apiFetch<Cart>("/cart/items", {
    method: "POST",
    sessionId,
    token,
    json: payload,
  });
}

export async function updateCartItem(
  sessionId: string,
  itemId: string,
  quantity: number,
  token?: string | null,
) {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: "PATCH",
    sessionId,
    token,
    json: { quantity },
  });
}

export async function removeCartItem(
  sessionId: string,
  itemId: string,
  token?: string | null,
) {
  return apiFetch<Cart>(`/cart/items/${itemId}`, {
    method: "DELETE",
    sessionId,
    token,
  });
}

export async function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export async function register(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    json: payload,
  });
}

export async function getMe(token: string) {
  return apiFetch<User>("/auth/me", { token });
}

export async function getMyAddresses(token: string): Promise<Address[]> {
  try {
    return await apiFetch<Address[]>("/addresses", { token });
  } catch {
    return [];
  }
}

export async function createAddress(token: string, payload: AddressPayload) {
  return apiFetch<Address>("/addresses", {
    method: "POST",
    token,
    json: payload,
  });
}

export async function updateAddress(
  token: string,
  id: string,
  payload: Partial<AddressPayload>,
) {
  return apiFetch<Address>(`/addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    json: payload,
  });
}

export async function deleteAddress(token: string, id: string) {
  return apiFetch<void>(`/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}

export function oauthUrl(provider: "google" | "facebook" | "apple") {
  return `${API_BASE}/auth/${provider}`;
}

export async function getShippingProviders(): Promise<ShippingProvider[]> {
  try {
    return await apiFetch<ShippingProvider[]>("/shipping/providers/public");
  } catch {
    return [
      { id: "yurtici", code: "yurtici", name: "Yurtiçi Kargo", fee: "89.90" },
      {
        id: "kolay_gelsin",
        code: "kolay_gelsin",
        name: "Kolay Gelsin",
        fee: "79.90",
      },
      { id: "surat", code: "surat", name: "Sürat Kargo", fee: "84.90" },
      { id: "ptt", code: "ptt", name: "PTT Kargo", fee: "69.90" },
      { id: "hepsijet", code: "hepsijet", name: "HepsiJet", fee: "99.90" },
      { id: "dhl", code: "dhl", name: "DHL", fee: "149.90" },
      {
        id: "trendyol_express",
        code: "trendyol_express",
        name: "Trendyol Express",
        fee: "89.90",
      },
    ];
  }
}

export async function checkout(
  sessionId: string,
  payload: CheckoutPayload,
  token?: string | null,
) {
  return apiFetch<PaymentInitResponse>("/checkout", {
    method: "POST",
    sessionId,
    token,
    json: payload,
  });
}

export async function retryPayment(
  orderId: string,
  email?: string,
  token?: string | null,
) {
  return apiFetch<PaymentInitResponse>("/payments/retry", {
    method: "POST",
    token,
    json: { orderId, email: email || undefined },
    cache: "no-store",
  });
}

export async function lookupGuestOrder(
  orderNumber: string,
  email: string,
): Promise<GuestOrderLookupResult> {
  return apiFetch<GuestOrderLookupResult>("/orders/lookup", {
    method: "POST",
    json: {
      orderNumber: orderNumber.trim(),
      email: email.trim().toLowerCase(),
    },
    cache: "no-store",
  });
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  email?: string,
  token?: string | null,
): Promise<CouponPreview> {
  const qs = new URLSearchParams({
    code: code.trim().toUpperCase(),
    subtotal: String(subtotal),
  });
  if (email?.trim()) qs.set("email", email.trim());
  return apiFetch<CouponPreview>(`/coupons/validate?${qs}`, {
    token,
    cache: "no-store",
  });
}

export async function getWishlist(token: string): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>("/wishlist", { token, cache: "no-store" });
}

export async function getWishlistIds(token: string): Promise<string[]> {
  return apiFetch<string[]>("/wishlist/ids", { token, cache: "no-store" });
}

export async function toggleWishlist(
  productId: string,
  token: string,
): Promise<{ inWishlist: boolean; productId: string }> {
  return apiFetch<{ inWishlist: boolean; productId: string }>(
    "/wishlist/toggle",
    {
      method: "POST",
      token,
      json: { productId },
      cache: "no-store",
    },
  );
}

export async function removeWishlistItem(
  productId: string,
  token: string,
): Promise<void> {
  await apiFetch(`/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}

export async function getMyOrders(token: string): Promise<Order[]> {
  try {
    const data = await apiFetch<Order[] | { items: Order[] }>("/orders/me", {
      token,
    });
    return Array.isArray(data) ? data : data.items ?? [];
  } catch {
    return [];
  }
}

export async function getOrderById(
  id: string,
  token: string,
): Promise<Order | null> {
  try {
    return await apiFetch<Order>(`/orders/${encodeURIComponent(id)}`, {
      token,
    });
  } catch {
    return null;
  }
}

export async function trackShipment(code: string): Promise<TrackingResult | null> {
  try {
    return await apiFetch<TrackingResult>(
      `/shipping/track/${encodeURIComponent(code)}`,
    );
  } catch {
    return null;
  }
}

export async function getLegalDocument(
  slug: string,
): Promise<LegalDocument | null> {
  try {
    return await apiFetch<LegalDocument>(`/legal/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getBlogPosts(
  params?: BlogQuery,
): Promise<Paginated<BlogPost>> {
  try {
    const qs = toQuery({
      q: params?.q,
      tag: params?.tag,
      sort: params?.sort,
      order: params?.order,
      page: params?.page ?? 1,
      limit: params?.limit ?? 12,
    });
    const data = await apiFetch<BlogPost[] | Paginated<BlogPost>>(
      `/blog${qs}`,
    );
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        limit: data.length || 12,
        totalPages: 1,
      };
    }
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 12,
      totalPages: data.totalPages ?? 1,
    };
  } catch {
    return { items: [], total: 0, page: 1, limit: 12, totalPages: 1 };
  }
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  try {
    return await apiFetch<BlogPost>(`/blog/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getBlogSlugs(): Promise<
  { slug: string; updatedAt?: string; publishedAt?: string | null }[]
> {
  try {
    return await apiFetch(`/blog/slugs`);
  } catch {
    return [];
  }
}

export async function submitContact(payload: {
  senderName: string;
  senderEmail: string;
  protocolType?: string;
  message: string;
}) {
  return apiFetch<{ ok: boolean }>("/contact", {
    method: "POST",
    json: payload,
  });
}

export async function subscribeNewsletter(email: string) {
  return apiFetch<{ ok: boolean }>("/newsletter", {
    method: "POST",
    json: { email, source: "website" },
  });
}

export async function logCookieConsent(payload: {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  sessionId?: string;
}) {
  try {
    return await apiFetch<{ ok: boolean }>("/legal/cookie-consent", {
      method: "POST",
      json: {
        necessary: payload.necessary,
        analytics: payload.analytics,
        marketing: payload.marketing,
        sessionId: payload.sessionId,
      },
    });
  } catch {
    return { ok: false };
  }
}
