"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { ApiError, retryPayment } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToPayment } from "@/lib/payment-redirect";

function FailureContent() {
  const params = useSearchParams();
  const orderId =
    params.get("orderId") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("kilic_last_order_id")
      : null);
  const orderNumber =
    params.get("orderNumber") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("kilic_last_order_number")
      : null);
  const reason = params.get("reason");
  const [loggedIn, setLoggedIn] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  async function onRetry() {
    if (!orderId) {
      setError("Sipariş bilgisi bulunamadı. Yeni sipariş oluşturun.");
      return;
    }
    setRetrying(true);
    setError(null);
    try {
      const email =
        typeof window !== "undefined"
          ? sessionStorage.getItem("kilic_last_order_email") || undefined
          : undefined;
      const result = await retryPayment(orderId, email, getToken());
      if (!redirectToPayment(result)) {
        setError("Ödeme yönlendirmesi alınamadı.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Yeniden ödeme başlatılamadı.",
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter max-w-xl">
        <p className="font-meta text-xs uppercase tracking-widest text-error">
          Ödeme / Başarısız
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">
          Ödeme tamamlanamadı
        </h1>
        <p className="mt-4 font-meta text-xs uppercase leading-relaxed text-secondary">
          Kartınızdan çekim yapılmadıysa endişelenmeyin. Aynı sipariş için
          ödemeyi yeniden deneyebilirsiniz.
        </p>
      </div>

      <Reveal className="mt-10 max-w-xl" delay={60}>
        <div className="industrial-border bg-surface-container-low p-6 md:p-8">
          {orderNumber ? (
            <div className="mb-4">
              <p className="font-meta text-[10px] uppercase text-secondary">
                Sipariş no
              </p>
              <p className="mt-1 font-display text-2xl">{orderNumber}</p>
            </div>
          ) : null}
          {reason ? (
            <p className="mb-6 font-meta text-[11px] uppercase text-error">
              {reason}
            </p>
          ) : (
            <p className="mb-6 font-meta text-[11px] uppercase text-secondary">
              Ödeme sağlayıcısı işlemi onaylamadı.
            </p>
          )}
          {error ? (
            <p className="mb-4 font-meta text-[11px] uppercase text-error">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {orderId ? (
              <button
                type="button"
                disabled={retrying}
                onClick={() => void onRetry()}
                className="btn-cta px-6 py-3 text-xs disabled:opacity-50"
              >
                {retrying ? "Yönlendiriliyor…" : "Ödemeyi yeniden dene"}
              </button>
            ) : (
              <Link href="/urunler" className="btn-cta px-6 py-3 text-xs">
                Yeni sipariş
              </Link>
            )}
            <Link
              href="/urunler"
              className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
            >
              Alışverişe devam
            </Link>
            {loggedIn && orderId ? (
              <Link
                href={`/hesabim/siparisler/${orderId}`}
                className="border border-outline-variant/40 px-6 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
              >
                Sipariş durumu
              </Link>
            ) : null}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
          Ödeme sonucu yükleniyor…
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
