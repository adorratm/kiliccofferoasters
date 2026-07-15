import {
  getWishlistIds,
  toggleWishlist as toggleWishlistApi,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

type Listener = (ids: Set<string>) => void;

let cache: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;
const listeners = new Set<Listener>();

function emit() {
  if (!cache) return;
  for (const l of listeners) l(cache);
}

export function subscribeWishlist(listener: Listener): () => void {
  listeners.add(listener);
  if (cache) listener(cache);
  return () => listeners.delete(listener);
}

export function getWishlistCache(): Set<string> | null {
  return cache;
}

export function clearWishlistCache() {
  cache = null;
  loading = null;
  emit();
}

export async function ensureWishlistIds(): Promise<Set<string>> {
  const token = getToken();
  if (!token) {
    cache = new Set();
    emit();
    return cache;
  }
  if (cache) return cache;
  if (!loading) {
    loading = getWishlistIds(token)
      .then((ids) => {
        cache = new Set(ids);
        emit();
        return cache;
      })
      .catch(() => {
        cache = new Set();
        emit();
        return cache!;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export async function toggleWishlistProduct(
  productId: string,
): Promise<{ inWishlist: boolean } | { needsAuth: true }> {
  const token = getToken();
  if (!token) return { needsAuth: true };

  const result = await toggleWishlistApi(productId, token);
  if (!cache) cache = new Set();
  if (result.inWishlist) cache.add(productId);
  else cache.delete(productId);
  emit();
  return { inWishlist: result.inWishlist };
}
