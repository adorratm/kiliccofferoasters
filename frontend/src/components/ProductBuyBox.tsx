"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatMoney } from "@/lib/format";
import { GRIND_OPTIONS, type GrindValue } from "@/lib/grind";
import type { Product, ProductVariant } from "@/lib/types";

type Props = {
  product: Product;
};

export function ProductBuyBox({ product }: Props) {
  const variants = useMemo(
    () => (product.variants || []).filter((v) => v.isActive !== false),
    [product.variants],
  );
  const [variantId, setVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [grind, setGrind] = useState<GrindValue>("whole_bean");

  const selected: ProductVariant | undefined =
    variants.find((v) => v.id === variantId) || variants[0];
  const price = selected?.price ?? product.basePrice;

  return (
    <div className="space-y-6">
      {variants.length > 1 ? (
        <div>
          <p className="mb-2 font-meta text-[10px] uppercase tracking-widest text-on-surface-variant">
            Ağırlık
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = (selected?.id || variantId) === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={`border px-4 py-2 font-meta text-[11px] uppercase tracking-widest transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-outline-variant/40 hover:border-primary"
                  }`}
                >
                  {v.weightLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 font-meta text-[10px] uppercase tracking-widest text-on-surface-variant">
          Öğütme
        </p>
        <div className="flex flex-wrap gap-2">
          {GRIND_OPTIONS.map((g) => {
            const active = grind === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setGrind(g.value)}
                className={`border px-4 py-2 font-meta text-[11px] uppercase tracking-widest transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-outline-variant/40 hover:border-primary"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-meta text-[10px] uppercase text-on-surface-variant">
            Fiyat
          </p>
          <p className="font-display text-3xl">
            {formatMoney(price, product.currency)}
          </p>
        </div>
        {selected?.weightLabel ? (
          <p className="font-meta text-[11px] uppercase text-secondary">
            {selected.weightLabel}
          </p>
        ) : null}
      </div>

      <div className="flex items-stretch gap-3">
        <div className="flex-1">
          <AddToCartButton
            productId={product.id}
            variantId={selected?.id}
            grindOption={grind}
          />
        </div>
        <FavoriteButton productId={product.id} size="lg" />
      </div>
    </div>
  );
}
