'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ORDER_STATUS_LABELS,
  resolveOrderSource,
} from '@/lib/order-display';
import { asPaged, formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import type { Order } from '@/lib/types';

const STATUSES = [
  '',
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

type SourceChip = '' | 'marketplace' | 'trendyol' | 'hepsiburada' | 'n11' | 'web';

const SOURCE_CHIPS: { id: SourceChip; label: string; q?: string }[] = [
  { id: '', label: 'Tümü' },
  { id: 'marketplace', label: 'Pazaryeri', q: 'Trendyol' },
  { id: 'trendyol', label: 'Trendyol', q: 'Trendyol' },
  { id: 'hepsiburada', label: 'Hepsiburada', q: 'Hepsiburada' },
  { id: 'n11', label: 'N11', q: 'N11' },
];

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState('');
  const [sourceChip, setSourceChip] = useState<SourceChip>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  async function load(opts?: { page?: number; q?: string; status?: string }) {
    const nextPage = opts?.page ?? page;
    const nextQ = opts?.q ?? q;
    const nextStatus = opts?.status ?? status;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
      });
      if (nextQ.trim()) params.set('q', nextQ.trim());
      if (nextStatus) params.set('status', nextStatus);
      const data = await api<unknown>(`/orders/admin/all?${params}`);
      const paged = asPaged<Order>(data, limit);
      let items = paged.items;
      if (sourceChip === 'web') {
        items = items.filter((r) => resolveOrderSource(r).kind === 'web');
      } else if (sourceChip === 'marketplace') {
        items = items.filter((r) => resolveOrderSource(r).kind !== 'web');
      } else if (
        sourceChip === 'trendyol' ||
        sourceChip === 'hepsiburada' ||
        sourceChip === 'n11'
      ) {
        items = items.filter((r) => resolveOrderSource(r).kind === sourceChip);
      }
      setRows(items);
      setTotal(paged.total);
      setTotalPages(paged.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQ && initialQ !== q) setQ(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, sourceChip]);

  function applySource(chip: SourceChip) {
    setPage(1);
    setSourceChip(chip);
    const chipDef = SOURCE_CHIPS.find((c) => c.id === chip);
    if (chipDef?.q) setQ(chipDef.q);
    else if (chip === '' || chip === 'marketplace' || chip === 'web') setQ('');
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {SOURCE_CHIPS.map((chip) => (
          <button
            key={chip.id || 'all'}
            type="button"
            onClick={() => applySource(chip.id)}
            className={`btn-motion border px-3 py-1.5 text-xs uppercase tracking-wider ${
              sourceChip === chip.id
                ? 'border-accent bg-accent text-white'
                : 'border-border-muted text-muted hover:border-accent'
            }`}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applySource('web')}
          className={`btn-motion border px-3 py-1.5 text-xs uppercase tracking-wider ${
            sourceChip === 'web'
              ? 'border-accent bg-accent text-white'
              : 'border-border-muted text-muted hover:border-accent'
          }`}
        >
          Web
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-border-muted bg-surface p-3">
        <label className="block min-w-48 flex-1 text-sm">
          <span className="mono text-[10px] uppercase text-muted">Ara</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setSourceChip('');
                void load({ page: 1, q });
              }
            }}
            placeholder="Sipariş no, e-posta, Trendyol #…, telefon…"
            className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mono text-[10px] uppercase text-muted">Durum</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="mt-1 border border-border-muted bg-background px-3 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? ORDER_STATUS_LABELS[s] || s : 'Tümü'}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSourceChip('');
            void load({ page: 1, q });
          }}
          className="btn-motion border border-border-muted px-4 py-2 text-sm hover:border-accent"
        >
          Filtrele
        </button>
      </div>

      <p className="text-sm text-muted">
        {loading
          ? 'Yükleniyor…'
          : `${total} sipariş · sayfa ${page}/${totalPages}`}
      </p>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Yükleniyor…' : 'Sipariş yok'}
        onRowClick={(r) => router.push(`/siparisler/${r.id}`)}
        columns={[
          {
            key: 'number',
            header: 'No',
            render: (r) => (
              <span className="mono text-xs">{r.orderNumber}</span>
            ),
          },
          {
            key: 'source',
            header: 'Kaynak',
            render: (r) => {
              const src = resolveOrderSource(r);
              return (
                <span
                  className={`mono text-[10px] uppercase ${
                    src.kind === 'web' ? 'text-muted' : 'text-accent'
                  }`}
                >
                  {src.label}
                </span>
              );
            },
          },
          {
            key: 'customer',
            header: 'Müşteri',
            render: (r) => (
              <div>
                <div>{r.customerName}</div>
                <div className="text-xs text-muted">{r.customerEmail}</div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Durum',
            render: (r) => (
              <span className="mono text-xs uppercase text-accent">
                {ORDER_STATUS_LABELS[r.status] || r.status}
              </span>
            ),
          },
          {
            key: 'total',
            header: 'Toplam',
            render: (r) => formatMoney(r.total, r.currency || 'TRY'),
          },
          {
            key: 'date',
            header: 'Tarih',
            render: (r) =>
              r.createdAt
                ? new Date(r.createdAt).toLocaleString('tr-TR')
                : '—',
          },
        ]}
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-motion border px-3 py-1.5 text-xs disabled:opacity-30"
          >
            Önceki
          </button>
          <span className="mono text-xs text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-motion border px-3 py-1.5 text-xs disabled:opacity-30"
          >
            Sonraki
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={<p className="mono text-sm text-muted">Yükleniyor…</p>}
    >
      <OrdersPageInner />
    </Suspense>
  );
}
