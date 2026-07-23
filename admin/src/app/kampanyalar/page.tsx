'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { asArray } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { Checkbox } from '@/components/Checkbox';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type Campaign = {
  id: string;
  name: string;
  slug: string;
  discountPercent: string | number;
  productIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  discountPercent: string;
  productIdsText: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  discountPercent: '15',
  productIdsText: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
});

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<unknown>('/campaigns/admin/all');
      setRows(asArray<Campaign>(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kampanyalar yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setForm(emptyForm());
    setEditing(true);
    setMessage(null);
  }

  function startEdit(row: Campaign) {
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      discountPercent: String(row.discountPercent),
      productIdsText: (row.productIds || []).join(', '),
      startsAt: toLocalInput(row.startsAt),
      endsAt: toLocalInput(row.endsAt),
      isActive: row.isActive,
    });
    setEditing(true);
    setMessage(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const productIds = form.productIdsText
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        discountPercent: Number(form.discountPercent),
        productIds,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive,
      };
      if (form.id) {
        await api(`/campaigns/${form.id}`, { method: 'PATCH', body });
        setMessage('Kampanya güncellendi');
      } else {
        await api('/campaigns', { method: 'POST', body });
        setMessage('Kampanya oluşturuldu');
      }
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api(`/campaigns/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setMessage('Kampanya silindi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase text-muted">Pazarlama</p>
          <h2 className="text-xl font-semibold">Flash kampanyalar</h2>
          <p className="mt-1 text-sm text-muted">
            Ürün ID listesi boşsa tüm ürünlere uygulanır. Sepete eklerken fiyat
            otomatik düşer.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
        >
          Yeni kampanya
        </button>
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

      {editing ? (
        <form
          onSubmit={onSubmit}
          className="space-y-3 border border-border-muted bg-surface p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Ad
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Slug (opsiyonel)
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              İndirim %
              <input
                required
                type="number"
                min={1}
                max={90}
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPercent: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              Ürün ID’leri (virgülle; boş = tümü)
              <textarea
                value={form.productIdsText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productIdsText: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-sm">
              Başlangıç
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Bitiş
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
          </div>
          <Checkbox
            checked={form.isActive}
            onChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            label="Aktif"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border border-border-muted px-4 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="mono text-sm text-muted">Yükleniyor…</p>
      ) : (
        <DataTable
          rowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Ad', render: (r) => r.name },
            {
              key: 'discount',
              header: '%',
              render: (r) => `${r.discountPercent}%`,
            },
            {
              key: 'scope',
              header: 'Kapsam',
              render: (r) =>
                r.productIds?.length
                  ? `${r.productIds.length} ürün`
                  : 'Tüm ürünler',
            },
            {
              key: 'active',
              header: 'Durum',
              render: (r) => (r.isActive ? 'Aktif' : 'Kapalı'),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="text-sm text-accent hover:underline"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(r.id)}
                    className="text-sm text-danger hover:underline"
                  >
                    Sil
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Kampanyayı sil?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
