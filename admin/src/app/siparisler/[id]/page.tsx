'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ORDER_STATUS_LABELS,
  formatAddress,
  resolveOrderSource,
} from '@/lib/order-display';
import { asArray, formatMoney } from '@/lib/utils';
import type { Order, OrderStatus, ShippingProviderConfig } from '@/lib/types';

const STATUSES: OrderStatus[] = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [providers, setProviders] = useState<ShippingProviderConfig[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      channel: string;
      recipient: string;
      template: string;
      status: string;
      errorMessage?: string | null;
      createdAt?: string;
    }>
  >([]);
  const [status, setStatus] = useState<OrderStatus>('pending_payment');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orderData, providerData, notifData] = await Promise.all([
        api<Order>(`/orders/${id}`),
        api<unknown>('/shipping/providers').catch(() => []),
        api<unknown>(`/notifications/order/${id}`).catch(() => []),
      ]);
      setOrder(orderData);
      setStatus(orderData.status);
      setNotifications(asArray(notifData));
      const list = asArray<ShippingProviderConfig>(providerData).filter(
        (p) => p.isEnabled,
      );
      setProviders(list);
      if (list[0]) setProvider(list[0].provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sipariş yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await api<Order>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }).catch(async () =>
        api<Order>(`/orders/${id}`, {
          method: 'PATCH',
          body: { status },
        }),
      );
      setOrder(updated);
      setStatus(updated.status);
      setMessage('Durum güncellendi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function createShipment(e: FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setShipping(true);
    setMessage(null);
    setError(null);
    try {
      await api(`/orders/${id}/shipments`, {
        method: 'POST',
        body: { provider },
      }).catch(() =>
        api('/shipping/shipments', {
          method: 'POST',
          body: { orderId: id, provider },
        }),
      );
      setMessage('Kargo oluşturuldu');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kargo oluşturulamadı');
    } finally {
      setShipping(false);
    }
  }

  if (loading) {
    return <p className="mono text-sm text-muted">Yükleniyor…</p>;
  }

  if (!order) {
    return (
      <div className="space-y-3">
        <p className="text-danger">{error || 'Sipariş bulunamadı'}</p>
        <button
          type="button"
          onClick={() => router.push('/siparisler')}
          className="text-sm text-accent hover:underline"
        >
          ← Listeye dön
        </button>
      </div>
    );
  }

  const source = resolveOrderSource(order);
  const addressLines = formatAddress(order.shippingAddress);
  const currency = order.currency || 'TRY';
  const discount = Number(order.discountAmount || 0);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push('/siparisler')}
        className="text-sm text-muted hover:text-accent"
      >
        ← Siparişler
      </button>

      {error ? (
        <p className="border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-success/40 bg-surface px-3 py-2 text-sm text-success">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase text-muted">Sipariş</p>
          <h2 className="text-xl font-semibold mono">{order.orderNumber}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="mono border border-border-muted px-2 py-0.5 text-[10px] uppercase text-accent">
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
            <span
              className={`mono border px-2 py-0.5 text-[10px] uppercase ${
                source.kind === 'web'
                  ? 'border-border-muted text-muted'
                  : 'border-accent/40 text-accent'
              }`}
            >
              {source.label}
            </span>
          </div>
        </div>
        {order.createdAt ? (
          <p className="text-xs text-muted">
            {new Date(order.createdAt).toLocaleString('tr-TR')}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-border-muted bg-surface p-4 space-y-3">
          <p className="mono text-[10px] uppercase text-muted">Müşteri</p>
          <p className="text-sm font-medium">{order.customerName}</p>
          <p className="text-sm text-muted">{order.customerEmail}</p>
          <p className="text-sm text-muted">{order.customerPhone}</p>
          {addressLines.length ? (
            <div className="mt-2 border-t border-border-muted pt-3 text-sm text-muted">
              <p className="mono mb-1 text-[10px] uppercase">Teslimat</p>
              {addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          {order.notes ? (
            <p className="mt-2 border-t border-border-muted pt-3 text-xs text-muted">
              {order.notes}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="border border-border-muted bg-surface p-4 space-y-2 text-sm">
            <p className="mono text-[10px] uppercase text-muted">Özet</p>
            <div className="flex justify-between">
              <span className="text-muted">Ara toplam</span>
              <span>{formatMoney(order.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Kargo</span>
              <span>{formatMoney(order.shippingFee || 0, currency)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-accent">
                <span>
                  İndirim
                  {order.couponCode ? ` (${order.couponCode})` : ''}
                </span>
                <span>−{formatMoney(discount, currency)}</span>
              </div>
            ) : null}
            {Number(order.taxAmount || 0) > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">Vergi</span>
                <span>{formatMoney(order.taxAmount || 0, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border-muted pt-2 font-medium">
              <span>Toplam</span>
              <span>{formatMoney(order.total, currency)}</span>
            </div>
            {order.payment ? (
              <div className="mt-3 border-t border-border-muted pt-3 text-xs text-muted">
                <p className="mono uppercase text-accent">
                  Ödeme · {order.payment.provider || '—'} ·{' '}
                  {order.payment.status || '—'}
                </p>
                {order.payment.paymentId ? (
                  <p className="mono mt-1">ID: {order.payment.paymentId}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={updateStatus}
            className="border border-border-muted bg-surface p-4 space-y-3"
          >
            <p className="mono text-[10px] uppercase text-muted">
              Durum güncelle
            </p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full border border-border-muted bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Durumu kaydet'}
            </button>
          </form>

          {source.kind === 'web' ? (
            <form
              onSubmit={createShipment}
              className="border border-border-muted bg-surface p-4 space-y-3"
            >
              <p className="mono text-[10px] uppercase text-muted">
                Kargo oluştur
              </p>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full border border-border-muted bg-background px-3 py-2 text-sm"
              >
                {providers.length === 0 ? (
                  <option value="">Aktif sağlayıcı yok</option>
                ) : (
                  providers.map((p) => (
                    <option key={p.id} value={p.provider}>
                      {p.displayName} ({p.provider})
                    </option>
                  ))
                )}
              </select>
              <button
                type="submit"
                disabled={shipping || !provider}
                className="border border-accent px-4 py-2 text-sm text-accent hover:bg-accent hover:text-white disabled:opacity-50"
              >
                {shipping ? 'Oluşturuluyor…' : 'Kargo oluştur'}
              </button>
            </form>
          ) : (
            <p className="border border-border-muted bg-surface px-4 py-3 text-xs text-muted">
              Pazaryeri siparişi — kargo platform panelinden yönetilir.
            </p>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 mono text-xs uppercase tracking-widest text-muted">
          Kalemler
        </h3>
        <div className="border border-border-muted bg-surface">
          {(order.items || []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Kalem bilgisi yok</p>
          ) : (
            <ul className="divide-y divide-border-muted">
              {order.items!.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div>
                    <p>
                      {item.productName} × {item.quantity}
                    </p>
                    {(item.variantLabel || item.grindLabel) && (
                      <p className="text-xs text-muted">
                        {[item.variantLabel, item.grindLabel]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="mono">
                    {formatMoney(item.lineTotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 mono text-xs uppercase tracking-widest text-muted">
          Gönderiler
        </h3>
        <div className="border border-border-muted bg-surface">
          {(order.shipments || []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Henüz kargo yok</p>
          ) : (
            <ul className="divide-y divide-border-muted">
              {order.shipments!.map((s) => (
                <li key={s.id} className="px-4 py-3 text-sm">
                  <span className="uppercase">{s.provider}</span>
                  <span className="mx-2 text-muted">·</span>
                  <span className="mono text-xs text-accent">{s.status}</span>
                  {s.trackingNumber ? (
                    s.trackingUrl ? (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 mono text-xs text-accent underline"
                      >
                        {s.trackingNumber}
                      </a>
                    ) : (
                      <span className="ml-2 mono text-xs text-muted">
                        {s.trackingNumber}
                      </span>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 mono text-xs uppercase tracking-widest text-muted">
          Bildirimler
        </h3>
        <div className="border border-border-muted bg-surface">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Bildirim yok</p>
          ) : (
            <ul className="divide-y divide-border-muted">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="mono text-xs uppercase text-accent">
                      {n.channel}
                    </span>
                    <span className="mono text-xs text-muted">{n.template}</span>
                    <span className="mono text-xs">{n.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{n.recipient}</p>
                  {n.errorMessage ? (
                    <p className="mt-1 text-xs text-danger">{n.errorMessage}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
