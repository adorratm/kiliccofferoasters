'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { asArray, formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { Checkbox } from '@/components/Checkbox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Coupon } from '@/lib/types';

type FormState = {
  id?: string;
  code: string;
  title: string;
  type: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxUses: string;
  firstOrderOnly: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  title: '',
  type: 'percent',
  value: '10',
  minSubtotal: '0',
  maxUses: '',
  firstOrderOnly: false,
  startsAt: '',
  endsAt: '',
  isActive: true,
});

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
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
      const data = await api<unknown>('/coupons/admin/all');
      setRows(asArray<Coupon>(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kuponlar yüklenemedi');
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

  function startEdit(row: Coupon) {
    setForm({
      id: row.id,
      code: row.code,
      title: row.title || '',
      type: row.type,
      value: String(row.value),
      minSubtotal: String(row.minSubtotal ?? 0),
      maxUses: row.maxUses != null ? String(row.maxUses) : '',
      firstOrderOnly: row.firstOrderOnly,
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
    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim() || undefined,
      type: form.type,
      value: Number(form.value),
      minSubtotal: Number(form.minSubtotal || 0),
      maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      firstOrderOnly: form.firstOrderOnly,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        await api(`/coupons/${form.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/coupons', { method: 'POST', body: payload });
      }
      setEditing(false);
      setForm(emptyForm());
      setMessage('Kaydedildi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setError(null);
    try {
      await api(`/coupons/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setMessage('Silindi');
      if (form.id === deleteId) {
        setEditing(false);
        setForm(emptyForm());
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Yüzde / sabit indirim kuponları — checkout’ta doğrulanır
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
        >
          Yeni kupon
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
          className="grid gap-3 border border-border-muted bg-surface p-4 md:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Kod</span>
            <input
              required
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  code: e.target.value.toUpperCase(),
                }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono"
              placeholder="HOSGELDIN10"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Başlık</span>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              placeholder="Hoş geldin indirimi"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Tip</span>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as 'percent' | 'fixed',
                }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            >
              <option value="percent">Yüzde (%)</option>
              <option value="fixed">Sabit (₺)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Değer {form.type === 'percent' ? '(%)' : '(₺)'}
            </span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) =>
                setForm((f) => ({ ...f, value: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Min. sepet (₺)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minSubtotal}
              onChange={(e) =>
                setForm((f) => ({ ...f, minSubtotal: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Max kullanım (boş = sınırsız)
            </span>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxUses: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Başlangıç</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Bitiş</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-6 md:col-span-2">
            <Checkbox
              checked={form.firstOrderOnly}
              onChange={(checked) =>
                setForm((f) => ({ ...f, firstOrderOnly: checked }))
              }
              label="Yalnızca ilk sipariş"
            />
            <Checkbox
              checked={form.isActive}
              onChange={(checked) =>
                setForm((f) => ({ ...f, isActive: checked }))
              }
              label="Aktif"
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(emptyForm());
              }}
              className="border border-border-muted px-4 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <p className="text-sm text-muted">
        {loading ? 'Yükleniyor…' : `${rows.length} kupon`}
      </p>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Yükleniyor…' : 'Kupon yok'}
        columns={[
          {
            key: 'code',
            header: 'Kod',
            render: (r) => <span className="mono text-xs">{r.code}</span>,
          },
          {
            key: 'title',
            header: 'Başlık',
            render: (r) => r.title || '—',
          },
          {
            key: 'value',
            header: 'İndirim',
            render: (r) =>
              r.type === 'percent'
                ? `%${Number(r.value)}`
                : formatMoney(r.value),
          },
          {
            key: 'uses',
            header: 'Kullanım',
            render: (r) =>
              `${r.usedCount}${r.maxUses != null ? ` / ${r.maxUses}` : ''}`,
          },
          {
            key: 'flags',
            header: 'Durum',
            render: (r) =>
              [
                r.isActive ? 'aktif' : 'pasif',
                r.firstOrderOnly ? 'ilk sipariş' : null,
              ]
                .filter(Boolean)
                .join(' · '),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="text-xs text-accent hover:underline"
                >
                  Düzenle
                </button>
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
        title="Kuponu sil"
        description={
          deleteId
            ? `"${rows.find((r) => r.id === deleteId)?.code || 'Bu kupon'}" kalıcı olarak silinecek.`
            : undefined
        }
        confirmLabel="Sil"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
