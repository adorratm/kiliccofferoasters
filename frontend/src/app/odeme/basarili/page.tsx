"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { getToken } from "@/lib/auth";
import { getOrderById } from "@/lib/api";
import { trackPurchase } from "@/lib/analytics";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const orderNumber =
    params.get("orderNumber") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("kilic_last_order_number")
      : null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = getToken();
    setLoggedIn(Boolean(token));
    if (orderNumber) {
      sessionStorage.setItem("kilic_last_order_number", orderNumber);
    }
    if (!orderId) return;
    sessionStorage.setItem("kilic_last_order_id", orderId);

    let cancelled = false;
    (async () => {
      let value: number | undefined;
      let currency = "TRY";
      if (token) {
        const order = await getOrderById(orderId, token);
        if (order) {
          value = Number(order.total);
          currency = order.currency || "TRY";
        }
      }
      if (cancelled) return;
      trackPurchase({
        id: orderId,
        orderNumber,
        value,
        currency,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, orderNumber]);

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter max-w-xl">
        <p className="font-meta text-xs uppercase tracking-widest text-primary">
          Ödeme / Başarılı
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">
          Teşekkürler
        </h1>
        <p className="mt-4 font-meta text-xs uppercase leading-relaxed text-secondary">
          Ödemeniz alındı. Siparişiniz kavurma sırasına alındı; hazırlanınca
          e-posta ile bilgilendireceğiz.
        </p>
      </div>

      <Reveal className="mt-10 max-w-xl" delay={60}>
        <div className="industrial-border bg-surface-container-low p-6 md:p-8">
          {orderNumber ? (
            <div className="mb-6">
              <p className="font-meta text-[10px] uppercase text-secondary">
                Sipariş no
              </p>
              <p className="mt-1 font-display text-3xl">{orderNumber}</p>
            </div>
          ) : (
            <p className="mb-6 font-meta text-xs uppercase text-secondary">
              Sipariş numaranız e-postanıza iletilecek.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {loggedIn && orderId ? (
              <Link
                href={`/hesabim/siparisler/${orderId}`}
                className="btn-cta px-6 py-3 text-xs"
              >
                Sipariş detayı
              </Link>
            ) : (
              <Link
                href={
                  orderNumber
                    ? `/siparis-sorgula?orderNumber=${encodeURIComponent(orderNumber)}`
                    : "/siparis-sorgula"
                }
                className="btn-cta px-6 py-3 text-xs"
              >
                Siparişi sorgula
              </Link>
            )}
            {loggedIn ? (
              <Link
                href="/hesabim"
                className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
              >
                Hesabım
              </Link>
            ) : (
              <Link
                href="/giris"
                className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
              >
                Giriş yap
              </Link>
            )}
            <Link
              href="/urunler"
              className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
            >
              Alışverişe devam
            </Link>
            <Link
              href="/takip"
              className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
            >
              Kargo takip
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
          Ödeme sonucu yükleniyor…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
