type DataLayer = Array<Record<string, unknown>>;

declare global {
  interface Window {
    dataLayer?: DataLayer;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function pushDataLayer(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function trackAddToCart(item: {
  id: string;
  name?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  const qty = item.quantity ?? 1;
  const value = (item.price ?? 0) * qty;

  if (typeof window.gtag === "function") {
    window.gtag("event", "add_to_cart", {
      currency: item.currency || "TRY",
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          quantity: qty,
          price: item.price,
        },
      ],
    });
  }

  pushDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: item.currency || "TRY",
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          quantity: qty,
          price: item.price,
        },
      ],
    },
  });

  if (typeof window.fbq === "function") {
    window.fbq("track", "AddToCart", {
      content_ids: [item.id],
      content_name: item.name,
      content_type: "product",
      value,
      currency: item.currency || "TRY",
    });
  }
}

export function trackViewContent(item: {
  id: string;
  name?: string;
  price?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  const value = item.price ?? 0;

  if (typeof window.gtag === "function") {
    window.gtag("event", "view_item", {
      currency: item.currency || "TRY",
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
        },
      ],
    });
  }

  pushDataLayer({
    event: "view_item",
    ecommerce: {
      currency: item.currency || "TRY",
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
        },
      ],
    },
  });

  if (typeof window.fbq === "function") {
    window.fbq("track", "ViewContent", {
      content_ids: [item.id],
      content_name: item.name,
      content_type: "product",
      value,
      currency: item.currency || "TRY",
    });
  }
}

export function trackBeginCheckout(input: {
  value?: number;
  currency?: string;
  itemCount?: number;
}) {
  if (typeof window === "undefined") return;
  const value = input.value ?? 0;

  if (typeof window.gtag === "function") {
    window.gtag("event", "begin_checkout", {
      currency: input.currency || "TRY",
      value,
      items: input.itemCount
        ? [{ quantity: input.itemCount }]
        : undefined,
    });
  }

  pushDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: input.currency || "TRY",
      value,
      item_count: input.itemCount,
    },
  });

  if (typeof window.fbq === "function") {
    window.fbq("track", "InitiateCheckout", {
      value,
      currency: input.currency || "TRY",
      num_items: input.itemCount,
    });
  }
}

export function trackPurchase(order: {
  id: string;
  orderNumber?: string | null;
  value?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  const key = `kilic_purchase_tracked_${order.id}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");

  const value = order.value ?? 0;
  const currency = order.currency || "TRY";

  if (typeof window.gtag === "function") {
    window.gtag("event", "purchase", {
      transaction_id: order.orderNumber || order.id,
      value,
      currency,
    });
  }

  pushDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: order.orderNumber || order.id,
      value,
      currency,
    },
  });

  if (typeof window.fbq === "function") {
    window.fbq("track", "Purchase", {
      value,
      currency,
      content_ids: [order.id],
      content_type: "product",
    });
  }
}
