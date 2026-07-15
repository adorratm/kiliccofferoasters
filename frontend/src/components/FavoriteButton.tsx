"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  ensureWishlistIds,
  subscribeWishlist,
  toggleWishlistProduct,
} from "@/lib/wishlist";

type Props = {
  productId: string;
  size?: "sm" | "lg";
  /** Kart üzerinde Link içindeyse tıklanınca gezinmeyi engeller */
  stopPropagation?: boolean;
};

export function FavoriteButton({
  productId,
  size = "sm",
  stopPropagation = true,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureWishlistIds();
    return subscribeWishlist((ids) => setActive(ids.has(productId)));
  }, [productId]);

  async function onClick(e: MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await toggleWishlistProduct(productId);
      if ("needsAuth" in result) {
        router.push("/giris");
        return;
      }
      setActive(result.inWishlist);
    } catch {
      /* sessiz: buton önceki durumda kalır */
    } finally {
      setBusy(false);
    }
  }

  const sizeClass =
    size === "lg"
      ? "h-auto min-h-14 w-14"
      : "h-10 w-10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={active}
      className={`inline-flex items-center justify-center border transition-colors ${sizeClass} ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/50 bg-surface/90 text-on-surface hover:border-primary"
      } disabled:opacity-60`}
    >
      <HeartIcon filled={active} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M12 21s-6.5-4.35-9.33-8.11C.8 10.35.7 7.2 2.7 5.35A4.6 4.6 0 0 1 9 5.2L12 8l3-2.8a4.6 4.6 0 0 1 6.3.15c2 1.85 1.9 5-.07 7.54C18.5 16.65 12 21 12 21z" />
    </svg>
  );
}
