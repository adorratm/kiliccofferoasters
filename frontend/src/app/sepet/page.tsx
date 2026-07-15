"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import {
  cartItemCount,
  cartRemoveItem,
  cartSubtotal,
  cartUpdateQuantity,
  fetchCart,
} from "@/lib/cart";
import { formatMoney, productImage } from "@/lib/format";
import type { Cart } from "@/lib/types";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCart();
      setCart(data);
    } catch {
      setCart(null);
      setError("Sepet yüklenemedi. Bağlantıyı kontrol edip yeniden deneyin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function changeQty(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setBusy(itemId);
    setError(null);
    try {
      const next = await cartUpdateQuantity(itemId, quantity);
      setCart(next);
    } catch {
      setError("Miktar güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(itemId: string) {
    setBusy(itemId);
    setError(null);
    try {
      const next = await cartRemoveItem(itemId);
      setCart(next);
    } catch {
      setError("Kalem kaldırılamadı.");
    } finally {
      setBusy(null);
    }
  }

  const count = cartItemCount(cart);
  const subtotal = cartSubtotal(cart);

  return (
    <div className="page-shell technical-grid min-h-screen py-16 md:py-24">
      <header className="mb-16 page-enter">
        <div className="mb-2 font-meta text-xs uppercase tracking-widest text-primary">
          Transaction_Queue / Revision_001
        </div>
        <h1 className="font-display text-5xl leading-none md:text-7xl">
          Shopping_Cart
        </h1>
      </header>

      {error ? (
        <p className="mb-6 border border-error/40 px-4 py-3 font-meta text-xs uppercase text-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="font-meta text-sm uppercase text-secondary">Yükleniyor…</p>
      ) : !count ? (
        <div className="industrial-border bg-surface-container-low p-10 animate-fade-up">
          <p className="font-meta text-sm uppercase text-secondary">
            Sepet boş. Spesimen seçin.
          </p>
          <Link href="/urunler" className="btn-cta mt-8 inline-block px-8 py-4 text-xs">
            Koleksiyona Dön
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          <div className="space-y-6 md:col-span-8">
            {cart?.items.map((item, index) => {
              const name = item.product?.name || "Ürün";
              const img = productImage(
                item.product?.imageUrl,
                item.product?.slug || item.productId,
              );
              const grindMap: Record<string, string> = {
                whole_bean: "Çekirdek",
                filter: "Filtre",
                espresso: "Espresso",
                turkish: "Türk kahvesi",
              };
              const meta = [
                item.variant?.weightLabel,
                grindMap[item.grindOption || "whole_bean"] ||
                  item.grindOption,
                item.product?.roastLevel,
              ]
                .filter(Boolean)
                .join(" / ");

              return (
                <Reveal key={item.id} delay={index * 80} variant="left">
                  <div className="group flex flex-col border border-outline-variant/30 bg-surface-container-low card-motion hover:border-primary/50 md:flex-row">
                    <div className="relative h-56 w-full overflow-hidden border-b border-outline-variant/30 md:h-auto md:w-64 md:border-b-0 md:border-r">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        className="image-keen object-cover grayscale"
                        sizes="256px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-2xl uppercase">{name}</h3>
                          <p className="mt-1 font-meta text-xs uppercase text-on-surface-variant">
                            {meta || "—"}
                          </p>
                        </div>
                        <span className="font-meta text-xl text-primary">
                          {formatMoney(
                            Number(item.unitPrice) * item.quantity,
                            item.product?.currency || "TRY",
                          )}
                        </span>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-outline-variant/20 pt-4">
                        <div className="flex items-center border border-outline-variant">
                          <button
                            type="button"
                            disabled={busy === item.id}
                            className="px-4 py-2 font-bold text-primary hover:bg-surface-container-high"
                            onClick={() => changeQty(item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="w-12 text-center font-meta">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={busy === item.id}
                            className="px-4 py-2 font-bold text-primary hover:bg-surface-container-high"
                            onClick={() => changeQty(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => remove(item.id)}
                          className="font-meta text-[11px] uppercase text-error hover:underline"
                        >
                          Remove_Unit
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <aside className="md:col-span-4">
            <Reveal variant="right" delay={120}>
              <div className="sticky top-28 border border-outline-variant/30 bg-surface-container-low p-6 panel-motion">
                <h2 className="mb-6 font-display text-2xl">Order Summary</h2>
                <div className="space-y-4 border-b border-outline-variant/20 pb-6 font-meta text-xs uppercase text-secondary">
                  <div className="flex justify-between">
                    <span>Kalem</span>
                    <span>{count}</span>
                  </div>
                  <div className="flex justify-between text-on-surface">
                    <span>Ara Toplam</span>
                    <span className="text-primary">{formatMoney(subtotal)}</span>
                  </div>
                </div>
                <Link
                  href="/odeme"
                  className="btn-cta mt-6 block w-full py-4 text-center text-xs"
                >
                  Ödemeye Geç
                </Link>
              </div>
            </Reveal>
          </aside>
        </div>
      )}
    </div>
  );
}
