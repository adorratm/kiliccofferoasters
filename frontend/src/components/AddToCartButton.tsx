"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cartAddItem } from "@/lib/cart";

type Props = {
  productId: string;
  variantId?: string | null;
  grindOption?: string | null;
  label?: string;
  className?: string;
};

export function AddToCartButton({
  productId,
  variantId,
  grindOption = "whole_bean",
  label = "Satın Almayı Başlat",
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      await cartAddItem({
        productId,
        variantId,
        grindOption,
        quantity: 1,
      });
      router.push("/sepet");
    } catch {
      setError("Sepete eklenemedi. API bağlantısını kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className={
          className ||
          "btn-cta w-full py-6 font-display text-lg tracking-widest"
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
