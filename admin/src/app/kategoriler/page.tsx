'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { asArray, slugify } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { Checkbox } from '@/components/Checkbox';

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  description: '',
  sortOrder: '0',
  isActive: true,
});

function CategoriesPageInner() {
  const searchParams = useSearchParams();
  const filterQ = (searchParams.get('q') || '').trim().toLowerCase();

  const [rows, setRows] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedFromQuery = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<unknown>('/categories/admin/all');
      setRows(asArray<Category>(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    openedFromQuery.current = false;
  }, [filterQ]);

  useEffect(() => {
    if (!filterQ || !rows.length || openedFromQuery.current) return;
    const match = rows.find(
      (c) =>
        c.name.toLowerCase().includes(filterQ) ||
        c.slug.toLowerCase().includes(filterQ),
    );
    if (!match) return;
    openedFromQuery.current = true;
    setForm({
      id: match.id,
      name: match.name,
      slug: match.slug,
      description: match.description || '',
      sortOrder: String(match.sortOrder),
      isActive: match.isActive,
    });
    setEditing(true);
  }, [filterQ, rows]);

  const visible = useMemo(() => {
    if (!filterQ) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(filterQ) ||
        c.slug.toLowerCase().includes(filterQ),
    );
  }, [rows, filterQ]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        await api(`/categories/${form.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/categories', { method: 'POST', body: payload });
      }
      setEditing(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted">
          {loading
            ? 'Yükleniyor…'
            : filterQ
              ? `${visible.length} / ${rows.length} kategori`
              : `${rows.length} kategori`}
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm());
            setEditing(true);
          }}
          className="btn-motion bg-accent px-4 py-2 text-sm text-white"
        >
          Yeni kategori
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {editing ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 border border-border-muted bg-surface p-4 md:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Ad</span>
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: f.id ? f.slug : slugify(e.target.value),
                }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Slug</span>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">
              Açıklama
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              rows={3}
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Sıra</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <Checkbox
            checked={form.isActive}
            onChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            label="Aktif"
            description="Kategori vitrinde görünür"
          />
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-motion bg-accent px-4 py-2 text-sm text-white"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border px-4 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <DataTable
        rows={visible}
        rowKey={(r) => r.id}
        emptyMessage="Kategori yok"
        selectedRowKey={editing ? form.id || null : null}
        onRowClick={(r) => {
          setForm({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || '',
            sortOrder: String(r.sortOrder),
            isActive: r.isActive,
          });
          setEditing(true);
        }}
        columns={[
          { key: 'name', header: 'Kategori', render: (r) => r.name },
          { key: 'slug', header: 'Slug', render: (r) => r.slug },
          {
            key: 'active',
            header: 'Durum',
            render: (r) => (r.isActive ? 'Aktif' : 'Pasif'),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <button
                type="button"
                onClick={() => {
                  setForm({
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    description: r.description || '',
                    sortOrder: String(r.sortOrder),
                    isActive: r.isActive,
                  });
                  setEditing(true);
                }}
                className="text-xs text-accent hover:underline"
              >
                Düzenle
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={<p className="mono text-sm text-muted">Yükleniyor…</p>}
    >
      <CategoriesPageInner />
    </Suspense>
  );
}
