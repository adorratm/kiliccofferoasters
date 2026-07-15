import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Cart } from "@/lib/types";

const SESSION_KEY = "kilic_cart_session";

function canUseDom() {
  return typeof window !== "undefined";
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCartSessionId(): string {
  if (!canUseDom()) return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function setCartSessionId(id: string) {
  if (!canUseDom()) return;
  window.localStorage.setItem(SESSION_KEY, id);
}

export async function fetchCart(): Promise<Cart | null> {
  const sessionId = getCartSessionId();
  if (!sessionId) return null;
  // Hata yukarı fırlatılır — boş sepet ile karıştırılmaz (login merge dahil)
  return getCart(sessionId, getToken());
}

export async function cartAddItem(payload: {
  productId: string;
  variantId?: string | null;
  grindOption?: string | null;
  quantity?: number;
}) {
  const sessionId = getCartSessionId();
  return addCartItem(
    sessionId,
    {
      productId: payload.productId,
      variantId: payload.variantId ?? null,
      grindOption: payload.grindOption ?? "whole_bean",
      quantity: payload.quantity ?? 1,
    },
    getToken(),
  );
}

export async function cartUpdateQuantity(itemId: string, quantity: number) {
  const sessionId = getCartSessionId();
  return updateCartItem(sessionId, itemId, quantity, getToken());
}

export async function cartRemoveItem(itemId: string) {
  const sessionId = getCartSessionId();
  return removeCartItem(sessionId, itemId, getToken());
}

export function cartItemCount(cart: Cart | null | undefined) {
  if (!cart?.items?.length) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(cart: Cart | null | undefined) {
  if (!cart?.items?.length) return 0;
  if (cart.subtotal) return Number(cart.subtotal);
  return cart.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
}
