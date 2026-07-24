"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { trackAddToCart } from "@/lib/analytics";
import { cartAddItem } from "@/lib/cart";

type Props = {
  productId: string;
  variantId?: string | null;
  grindOption?: string | null;
  label?: string;
  className?: string;
  disabled?: boolean;
  productName?: string;
  price?: number;
};

export function AddToCartButton({
  productId,
  variantId,
  grindOption = "whole_bean",
  label = "Satın Almayı Başlat",
  className,
  disabled = false,
  productName,
  price,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      await cartAddItem({
        productId,
        variantId,
        grindOption,
        quantity: 1,
      });
      trackAddToCart({
        id: productId,
        name: productName,
        price,
        quantity: 1,
      });
      router.push("/sepet");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Sepete eklenemedi. API bağlantısını kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading || disabled}
        onClick={onClick}
        className={
          className ||
          "btn-cta w-full py-6 font-display text-lg tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading ? "İşleniyor…" : label}
      </button>
      {error ? (
        <p className="mt-3 font-meta text-[10px] uppercase text-error">{error}</p>
      ) : null}
    </div>
  );
}
