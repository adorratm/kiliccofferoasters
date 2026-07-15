"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { Reveal } from "@/components/Reveal";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError, lookupGuestOrder } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { orderStatusHint, shipmentStatusLabel } from "@/lib/order-status";
import type { GuestOrderLookupResult } from "@/lib/types";

function LookupForm() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(
    params.get("orderNumber") || "",
  );
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestOrderLookupResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await lookupGuestOrder(orderNumber, email);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Sorgulanamadı. Bilgileri kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter">
        <p className="font-meta text-xs uppercase tracking-widest text-primary">
          Sipariş / Sorgula
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">
          Sipariş Sorgula
        </h1>
        <p className="mt-4 max-w-lg font-meta text-xs uppercase leading-relaxed text-secondary">
          Sipariş numaranız ve ödeme sırasında kullandığınız e-posta ile durum
          ve kargo bilgisine ulaşın.
        </p>
      </div>

      <Reveal className="mt-10 max-w-xl" delay={60}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="field-label">Sipariş no</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="field-input uppercase"
              placeholder="KLC-…"
            />
          </div>
          <div>
            <label className="field-label">E-posta</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="ornek@mail.com"
            />
          </div>
          {error ? (
            <p className="font-meta text-[11px] uppercase text-error">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-cta px-8 py-4 text-xs disabled:opacity-50"
          >
            {loading ? "Sorgulanıyor…" : "Sorgula"}
          </button>
        </form>
      </Reveal>

      {result ? (
        <Reveal className="mt-12" delay={80}>
          <div className="industrial-border bg-surface-container-low p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-meta text-[10px] uppercase text-secondary">
                  Sipariş no
                </p>
                <p className="font-display text-3xl">{result.orderNumber}</p>
                <p className="mt-1 font-meta text-[11px] uppercase text-secondary">
                  {result.createdAt
                    ? new Date(result.createdAt).toLocaleString("tr-TR")
                    : null}
                  {result.shippingCity
                    ? ` · ${result.shippingDistrict || ""} / ${result.shippingCity}`
                    : null}
                </p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <div className="mt-8">
              <OrderStatusStepper status={result.status} />
              {orderStatusHint(result.status) ? (
                <p className="mt-4 font-meta text-xs uppercase text-secondary">
                  {orderStatusHint(result.status)}
                </p>
              ) : null}
            </div>

            <div className="mt-8 divide-y divide-outline-variant/20 border-t border-outline-variant/20">
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 py-4 font-meta text-xs uppercase"
                >
                  <div>
                    <p>{item.productName}</p>
                    <p className="mt-1 text-secondary">
                      {[item.variantLabel, item.grindLabel]
                        .filter(Boolean)
                        .join(" · ") || "—"}{" "}
                      × {item.quantity}
                    </p>
                  </div>
                  <p className="text-primary">
                    {formatMoney(item.lineTotal, result.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-outline-variant/20 pt-4 font-meta text-xs uppercase text-secondary">
              <div className="flex justify-between">
                <span>Ara toplam</span>
                <span>{formatMoney(result.subtotal, result.currency)}</span>
              </div>
              {Number(result.discountAmount || 0) > 0 ? (
                <div className="flex justify-between">
                  <span>İndirim</span>
                  <span>
                    −{formatMoney(result.discountAmount!, result.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>Kargo</span>
                <span>{formatMoney(result.shippingFee, result.currency)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Toplam</span>
                <span>{formatMoney(result.total, result.currency)}</span>
              </div>
            </div>

            {result.shipments?.length ? (
              <div className="mt-8 space-y-3 border-t border-outline-variant/20 pt-6">
                <h2 className="font-display text-2xl">Kargo</h2>
                {result.shipments.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-outline-variant/30 p-4"
                  >
                    <div>
                      <p className="font-meta text-[10px] uppercase text-secondary">
                        {s.provider} · {shipmentStatusLabel(s.status)}
                      </p>
                      <p className="mt-1 font-display text-xl">
                        {s.trackingNumber || "Kod bekleniyor"}
                      </p>
                    </div>
                    {s.trackingNumber ? (
                      <Link
                        href={`/takip/${encodeURIComponent(s.trackingNumber)}`}
                        className="btn-cta px-5 py-3 text-[10px]"
                      >
                        Canlı takip
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Reveal>
      ) : null}

      <p className="mt-10 font-meta text-[10px] uppercase text-secondary">
        Kargo takip kodunuz mu var?{" "}
        <Link href="/takip" className="text-primary underline">
          Kargo takip
        </Link>
      </p>
    </div>
  );
}

export default function GuestOrderLookupPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
          Yükleniyor…
        </div>
      }
    >
      <LookupForm />
    </Suspense>
  );
}
