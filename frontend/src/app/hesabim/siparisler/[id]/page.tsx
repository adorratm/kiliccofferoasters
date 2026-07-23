"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { Reveal } from "@/components/Reveal";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ApiError,
  createReturnRequest,
  getOrderById,
  getOrderReturnRequests,
  retryPayment,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { orderStatusHint, shipmentStatusLabel } from "@/lib/order-status";
import { redirectToPayment } from "@/lib/payment-redirect";
import type { Order, ReturnRequest, ReturnRequestType } from "@/lib/types";

const RETURN_STATUS_LABEL: Record<string, string> = {
  requested: "İncelemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [returnType, setReturnType] = useState<ReturnRequestType>("cancel");
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnOk, setReturnOk] = useState<string | null>(null);

  async function load() {
    const token = getToken();
    if (!token) {
      router.replace("/giris?next=/hesabim");
      return;
    }
    const [o, r] = await Promise.all([
      getOrderById(params.id, token),
      getOrderReturnRequests(params.id, token),
    ]);
    setOrder(o);
    setReturns(r);
    if (o?.status === "paid" || o?.status === "processing") {
      setReturnType("cancel");
    } else if (o?.status === "shipped" || o?.status === "delivered") {
      setReturnType("return");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="page-shell py-24 font-meta text-sm uppercase text-secondary animate-fade-up">
        Sipariş yükleniyor…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-shell py-24 page-enter">
        <p className="font-meta text-sm uppercase text-error">
          Sipariş bulunamadı.
        </p>
        <Link
          href="/hesabim"
          className="btn-ghost mt-8 inline-block px-8 py-4 text-xs"
        >
          Hesaba Dön
        </Link>
      </div>
    );
  }

  const shipments = order.shipments || [];
  const hint = orderStatusHint(order.status);
  const discount = Number(order.discountAmount || 0);
  const openReturn = returns.find((r) => r.status === "requested");
  const canRequestCancel =
    !openReturn &&
    (order.status === "paid" || order.status === "processing");
  const canRequestReturn =
    !openReturn &&
    (order.status === "shipped" || order.status === "delivered");
  const showReturnForm = canRequestCancel || canRequestReturn;

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function onRetryPay() {
    const token = getToken();
    if (!token || !order) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const result = await retryPayment(
        order.id,
        order.customerEmail,
        token,
      );
      if (!redirectToPayment(result)) {
        setRetryError("Ödeme yönlendirmesi alınamadı.");
      }
    } catch (err) {
      setRetryError(
        err instanceof ApiError ? err.message : "Yeniden ödeme başarısız",
      );
    } finally {
      setRetrying(false);
    }
  }

  async function onSubmitReturn(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !order) return;
    setReturnBusy(true);
    setReturnError(null);
    setReturnOk(null);
    try {
      await createReturnRequest(order.id, token, {
        type: returnType,
        reason: returnReason.trim(),
      });
      setReturnReason("");
      setReturnOk("Talebiniz alındı. İnceleme sonrası bilgilendirileceksiniz.");
      await load();
    } catch (err) {
      setReturnError(
        err instanceof ApiError ? err.message : "Talep gönderilemedi",
      );
    } finally {
      setReturnBusy(false);
    }
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter">
        <Link
          href="/hesabim"
          className="font-meta text-[11px] uppercase text-secondary hover:text-primary"
        >
          ← Hesabım
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl">
              {order.orderNumber}
            </h1>
            <p className="mt-2 font-meta text-[11px] uppercase text-secondary">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString("tr-TR")
                : null}
              {order.shippingProvider
                ? ` · ${order.shippingProvider}`
                : null}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <Reveal className="mt-10" delay={40}>
        <OrderStatusStepper status={order.status} />
        {hint ? (
          <p className="mt-4 max-w-2xl font-meta text-xs uppercase leading-relaxed text-secondary">
            {hint}
          </p>
        ) : null}
        {order.status === "pending_payment" ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={retrying}
              onClick={() => void onRetryPay()}
              className="btn-cta px-6 py-3 text-xs disabled:opacity-50"
            >
              {retrying ? "Yönlendiriliyor…" : "Ödemeyi tamamla"}
            </button>
            {retryError ? (
              <p className="font-meta text-[11px] uppercase text-error">
                {retryError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Reveal>

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <Reveal variant="left">
            <section className="panel-motion industrial-border bg-surface-container-low p-6">
              <h2 className="mb-4 font-display text-2xl">Kalemler</h2>
              <div className="divide-y divide-outline-variant/20">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="row-motion flex justify-between gap-4 py-4 font-meta text-xs uppercase"
                  >
                    <div>
                      <div className="text-on-surface">{item.productName}</div>
                      <div className="mt-1 text-secondary">
                        {[item.variantLabel, item.grindLabel || item.grindOption]
                          .filter(Boolean)
                          .join(" · ") || "—"}{" "}
                        × {item.quantity}
                      </div>
                    </div>
                    <div className="text-primary">
                      {formatMoney(item.lineTotal, order.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal variant="left" delay={80}>
            <section className="panel-motion industrial-border bg-surface-container-low p-6">
              <h2 className="mb-4 font-display text-2xl">Kargo</h2>
              {shipments.length === 0 ? (
                <p className="font-meta text-xs uppercase text-secondary">
                  Henüz kargo kaydı oluşmadı. Sipariş hazırlandığında takip
                  bilgisi burada görünür.
                </p>
              ) : (
                <div className="space-y-6">
                  {shipments.map((s) => (
                    <div
                      key={s.id}
                      className="border border-outline-variant/30 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-meta text-[10px] uppercase text-secondary">
                            {s.provider}
                          </p>
                          <p className="mt-1 font-display text-xl">
                            {s.trackingNumber || "Kod bekleniyor"}
                          </p>
                        </div>
                        <StatusBadge status={s.status} kind="shipment" />
                      </div>
                      <p className="mt-2 font-meta text-[10px] uppercase text-secondary">
                        {shipmentStatusLabel(s.status)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {s.trackingNumber ? (
                          <>
                            <Link
                              href={`/takip/${encodeURIComponent(s.trackingNumber)}`}
                              className="btn-cta px-5 py-3 text-[10px]"
                            >
                              Canlı takip
                            </Link>
                            <button
                              type="button"
                              onClick={() => void copyCode(s.trackingNumber!)}
                              className="border border-outline-variant/40 px-5 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
                            >
                              {copied ? "Kopyalandı" : "Kodu kopyala"}
                            </button>
                          </>
                        ) : null}
                        {s.trackingUrl ? (
                          <a
                            href={s.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="border border-outline-variant/40 px-5 py-3 font-meta text-[10px] uppercase tracking-widest hover:border-primary"
                          >
                            Kargo sitesi
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </Reveal>

          <Reveal variant="left" delay={120}>
            <section className="panel-motion industrial-border bg-surface-container-low p-6">
              <h2 className="mb-4 font-display text-2xl">İptal / İade</h2>
              {returns.length > 0 ? (
                <ul className="mb-6 space-y-3">
                  {returns.map((r) => (
                    <li
                      key={r.id}
                      className="border border-outline-variant/30 p-4 font-meta text-[11px] uppercase"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-primary">
                          {r.type === "cancel" ? "İptal" : "İade / cayma"}
                        </span>
                        <span className="text-secondary">
                          {RETURN_STATUS_LABEL[r.status] || r.status}
                        </span>
                      </div>
                      <p className="mt-2 normal-case tracking-normal text-secondary">
                        {r.reason}
                      </p>
                      {r.adminNote ? (
                        <p className="mt-2 normal-case tracking-normal text-on-surface">
                          Not: {r.adminNote}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {showReturnForm ? (
                <form onSubmit={onSubmitReturn} className="space-y-4">
                  <p className="font-meta text-[11px] uppercase leading-relaxed text-secondary">
                    {canRequestCancel
                      ? "Sipariş henüz kargoya verilmedi — iptal talebi açabilirsiniz."
                      : "Teslim / kargo sonrası cayma için iade talebi açabilirsiniz (14 gün)."}
                  </p>
                  {canRequestCancel && canRequestReturn ? (
                    <select
                      value={returnType}
                      onChange={(e) =>
                        setReturnType(e.target.value as ReturnRequestType)
                      }
                      className="field-input"
                    >
                      <option value="cancel">İptal</option>
                      <option value="return">İade / cayma</option>
                    </select>
                  ) : null}
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    required
                    minLength={10}
                    rows={4}
                    placeholder="Talebinizin nedenini yazın (en az 10 karakter)"
                    className="field-input min-h-28 normal-case"
                  />
                  {returnError ? (
                    <p className="font-meta text-[11px] uppercase text-error">
                      {returnError}
                    </p>
                  ) : null}
                  {returnOk ? (
                    <p className="font-meta text-[11px] uppercase text-primary">
                      {returnOk}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={returnBusy || returnReason.trim().length < 10}
                    className="btn-cta px-6 py-3 text-xs disabled:opacity-50"
                  >
                    {returnBusy ? "Gönderiliyor…" : "Talep gönder"}
                  </button>
                  <p className="font-meta text-[10px] uppercase text-secondary">
                    Ayrıntılar için{" "}
                    <Link href="/iptal-iade" className="text-primary underline">
                      iptal ve iade koşulları
                    </Link>
                    .
                  </p>
                </form>
              ) : openReturn ? (
                <p className="font-meta text-xs uppercase text-secondary">
                  Açık talebiniz inceleniyor.
                </p>
              ) : (
                <p className="font-meta text-xs uppercase text-secondary">
                  Bu sipariş için şu an yeni talep açılamaz.
                </p>
              )}
            </section>
          </Reveal>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Reveal variant="right" delay={60}>
            <div className="panel-motion industrial-border p-6 font-meta text-xs uppercase">
              <h3 className="mb-4 font-display text-xl normal-case tracking-normal">
                Tutar
              </h3>
              <div className="space-y-2 text-secondary">
                <div className="flex justify-between">
                  <span>Ara toplam</span>
                  <span>{formatMoney(order.subtotal, order.currency)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between">
                    <span>
                      İndirim
                      {order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span>−{formatMoney(discount, order.currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>Kargo</span>
                  <span>{formatMoney(order.shippingFee, order.currency)}</span>
                </div>
                {order.taxAmount ? (
                  <div className="flex justify-between">
                    <span>KDV</span>
                    <span>{formatMoney(order.taxAmount, order.currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-primary">
                  <span>Toplam</span>
                  <span>{formatMoney(order.total, order.currency)}</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={120}>
            <div className="panel-motion industrial-border p-6 font-meta text-xs uppercase">
              <h3 className="mb-4 font-display text-xl normal-case tracking-normal">
                Teslimat
              </h3>
              <p className="text-secondary">
                {order.customerName}
                <br />
                {order.shippingAddress?.addressLine}
                <br />
                {order.shippingAddress?.district} / {order.shippingAddress?.city}
                {order.shippingAddress?.postalCode
                  ? ` · ${order.shippingAddress.postalCode}`
                  : null}
              </p>
            </div>
          </Reveal>

          <Reveal variant="right" delay={180}>
            <div className="panel-motion industrial-border p-6 font-meta text-xs uppercase">
              <h3 className="mb-4 font-display text-xl normal-case tracking-normal">
                Fatura
              </h3>
              <p className="text-secondary">
                {(order.billingAddress || order.shippingAddress)?.addressLine}
                <br />
                {(order.billingAddress || order.shippingAddress)?.district} /{" "}
                {(order.billingAddress || order.shippingAddress)?.city}
              </p>
            </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
