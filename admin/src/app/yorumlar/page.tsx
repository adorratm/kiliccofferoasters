'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { asPaged } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ProductReview } from '@/lib/types';

type StatusFilter = 'pending' | 'approved' | 'all';

export default function ReviewsAdminPage() {
  const [rows, setRows] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load(nextStatus = status) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '50', status: nextStatus });
      const data = await api<unknown>(`/reviews/admin/all?${qs}`);
      setRows(asPaged<ProductReview>(data).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yorumlar yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function moderate(id: string, isApproved: boolean) {
    setError(null);
    setMessage(null);
    try {
      await api(`/reviews/${id}/moderate`, {
        method: 'PATCH',
        body: { isApproved },
      });
      setMessage(isApproved ? 'Yorum onaylandı' : 'Yorum geri alındı');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api(`/reviews/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setMessage('Silindi');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Ürün yorumları — onay sonrası vitrinde yayınlanır
        </p>
        <div className="flex gap-2">
          {(
            [
              ['pending', 'Bekleyen'],
              ['approved', 'Onaylı'],
              ['all', 'Tümü'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`border px-3 py-1.5 text-xs ${
                status === value
                  ? 'border-accent bg-accent text-white'
                  : 'border-border-muted text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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

      <p className="text-sm text-muted">
        {loading ? 'Yükleniyor…' : `${rows.length} yorum`}
      </p>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Yükleniyor…' : 'Yorum yok'}
        columns={[
          {
            key: 'product',
            header: 'Ürün',
            render: (r) => (
              <span className="text-sm">
                {r.product?.name || r.productId.slice(0, 8)}
              </span>
            ),
          },
          {
            key: 'rating',
            header: 'Puan',
            render: (r) => (
              <span className="mono text-xs">{r.rating}/5</span>
            ),
          },
          {
            key: 'author',
            header: 'Yazar',
            render: (r) => (
              <div>
                <p className="text-sm">{r.authorName}</p>
                {r.isVerifiedPurchase ? (
                  <p className="mono text-[10px] text-muted">doğrulanmış</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'body',
            header: 'Yorum',
            render: (r) => (
              <div className="max-w-md">
                {r.title ? (
                  <p className="text-sm font-medium">{r.title}</p>
                ) : null}
                <p className="line-clamp-2 text-xs text-muted">{r.body}</p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Durum',
            render: (r) => (r.isApproved ? 'onaylı' : 'bekliyor'),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex justify-end gap-2">
                {!r.isApproved ? (
                  <button
                    type="button"
                    onClick={() => void moderate(r.id, true)}
                    className="text-xs text-accent hover:underline"
                  >
                    Onayla
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void moderate(r.id, false)}
                    className="text-xs text-muted hover:underline"
                  >
                    Geri al
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteId(r.id)}
                  className="text-xs text-danger hover:underline"
                >
                  Sil
                </button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Yorumu sil"
        description="Bu yorum kalıcı olarak silinecek."
        confirmLabel="Sil"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
