'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

type ReturnRequest = {
  id: string;
  orderId: string;
  type: 'cancel' | 'return';
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  reason: string;
  adminNote?: string | null;
  createdAt?: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    total: string | number;
    currency?: string;
  };
};

const STATUS_LABEL: Record<string, string> = {
  requested: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
};

export default function ReturnsPage() {
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState<'requested' | 'all'>('requested');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'requested' ? '?status=requested' : '';
      const data = await api<ReturnRequest[]>(
        `/orders/admin/return-requests${qs}`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liste yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function review(
    id: string,
    status: 'approved' | 'rejected',
  ) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/orders/admin/return-requests/${id}`, {
        method: 'PATCH',
        body: {
          status,
          adminNote: notes[id]?.trim() || undefined,
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase text-muted">Operasyon</p>
          <h2 className="text-xl font-semibold">İade / İptal Talepleri</h2>
          <p className="mt-1 text-sm text-muted">
            Onayda PayTR iadesi (varsa) + sipariş iptal/iade + stok geri yükleme
            otomatik çalışır.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('requested')}
            className={`px-3 py-1.5 text-sm ${
              filter === 'requested'
                ? 'bg-accent text-white'
                : 'border border-border-muted'
            }`}
          >
            Bekleyenler
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm ${
              filter === 'all'
                ? 'bg-accent text-white'
                : 'border border-border-muted'
            }`}
          >
            Tümü
          </button>
        </div>
      </div>

      {error ? (
        <p className="border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mono text-sm text-muted">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="border border-border-muted bg-surface px-4 py-8 text-sm text-muted">
          Talep yok.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li
              key={r.id}
              className="border border-border-muted bg-surface p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono text-[10px] uppercase text-muted">
                    {r.type === 'cancel' ? 'İptal' : 'İade / cayma'} ·{' '}
                    {STATUS_LABEL[r.status] || r.status}
                  </p>
                  <p className="mt-1 font-medium">
                    {r.order?.orderNumber || r.orderId}
                  </p>
                  <p className="text-sm text-muted">
                    {r.order?.customerName}
                    {r.order?.total != null
                      ? ` · ${formatMoney(r.order.total, r.order.currency || 'TRY')}`
                      : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.orderId ? (
                    <Link
                      href={`/siparisler/${r.orderId}`}
                      className="text-sm text-accent hover:underline"
                    >
                      Sipariş
                    </Link>
                  ) : null}
                  {r.createdAt ? (
                    <span className="text-xs text-muted">
                      {new Date(r.createdAt).toLocaleString('tr-TR')}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="text-sm">{r.reason}</p>
              {r.adminNote ? (
                <p className="text-xs text-muted">Admin notu: {r.adminNote}</p>
              ) : null}

              {r.status === 'requested' ? (
                <div className="space-y-2 border-t border-border-muted pt-3">
                  <input
                    type="text"
                    placeholder="Admin notu (opsiyonel)"
                    value={notes[r.id] || ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    className="w-full border border-border-muted bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r.id, 'approved')}
                      className="bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                      Onayla
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r.id, 'rejected')}
                      className="border border-danger px-4 py-2 text-sm text-danger hover:bg-danger hover:text-white disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
