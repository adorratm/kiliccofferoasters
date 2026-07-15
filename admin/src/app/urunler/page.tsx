'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { asPaged, formatMoney, slugify } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { MediaUpload } from '@/components/MediaUpload';
import { GalleryMediaField } from '@/components/GalleryMediaField';
import { Checkbox } from '@/components/Checkbox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Product, ProductVariant } from '@/lib/types';

type VariantForm = {
  id?: string;
  sku: string;
  weightLabel: string;
  price: string;
  stock: string;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: string;
  stock: string;
  roastLevel: string;
  originCountry: string;
  originRegion: string;
  process: string;
  varietal: string;
  batchId: string;
  badge: string;
  flavorNotes: string;
  imageUrl: string;
  gallery: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: VariantForm[];
};

const emptyVariant = (): VariantForm => ({
  sku: '',
  weightLabel: '250g',
  price: '',
  stock: '0',
  isActive: true,
});

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  basePrice: '',
  stock: '0',
  roastLevel: '',
  originCountry: '',
  originRegion: '',
  process: '',
  varietal: '',
  batchId: '',
  badge: '',
  flavorNotes: '',
  imageUrl: '',
  gallery: '',
  isActive: true,
  isFeatured: false,
  variants: [emptyVariant()],
});

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteVariantIndex, setDeleteVariantIndex] = useState<number | null>(
    null,
  );
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        order,
        includeInactive: 'true',
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api<unknown>(`/products/admin/all?${params}`);
      const paged = asPaged<Product>(data, limit);
      setRows(paged.items);
      setTotal(paged.total);
      setTotalPages(paged.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ürünler yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, order]);

  function startCreate() {
    setForm(emptyForm());
    setEditing(true);
  }

  function startEdit(p: Product) {
    const variants: VariantForm[] =
      p.variants && p.variants.length
        ? p.variants.map((v: ProductVariant) => ({
            id: v.id,
            sku: v.sku || '',
            weightLabel: v.weightLabel || '',
            price: String(v.price ?? ''),
            stock: String(v.stock ?? 0),
            isActive: v.isActive !== false,
          }))
        : [emptyVariant()];
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      basePrice: String(p.basePrice ?? ''),
      stock: String(p.stock ?? 0),
      roastLevel: p.roastLevel || '',
      originCountry: p.originCountry || '',
      originRegion: p.originRegion || '',
      process: p.process || '',
      varietal: p.varietal || '',
      batchId: p.batchId || '',
      badge: p.badge || '',
      flavorNotes: (p.flavorNotes || []).join(', '),
      imageUrl: p.imageUrl || '',
      gallery: (p.gallery || []).join('\n'),
      isActive: p.isActive,
      isFeatured: Boolean(p.isFeatured),
      variants,
    });
    setEditing(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const variants = form.variants
      .filter((v) => v.sku.trim() && v.weightLabel.trim() && v.price)
      .map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku.trim(),
        weightLabel: v.weightLabel.trim(),
        price: String(v.price),
        stock: Number(v.stock) || 0,
        isActive: v.isActive,
      }));
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      shortDescription: form.shortDescription || null,
      basePrice: String(form.basePrice),
      stock: Number(form.stock),
      roastLevel: form.roastLevel || null,
      originCountry: form.originCountry || null,
      originRegion: form.originRegion || null,
      process: form.process || null,
      varietal: form.varietal || null,
      batchId: form.batchId || null,
      badge: form.badge || null,
      flavorNotes: form.flavorNotes
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
      imageUrl: form.imageUrl || null,
      gallery: form.gallery
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      variants,
    };
    try {
      if (form.id) {
        await api(`/products/${form.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/products', { method: 'POST', body: payload });
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

  async function confirmRemove() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/products/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {loading ? 'Yükleniyor…' : `${total} ürün · sayfa ${page}/${totalPages}`}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
        >
          Yeni ürün
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
                void load();
              }
            }}
            placeholder="Ad, slug, batch, köken…"
            className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mono text-[10px] uppercase text-muted">Sıra</span>
          <select
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(':') as [string, 'asc' | 'desc'];
              setSort(s);
              setOrder(o);
              setPage(1);
            }}
            className="mt-1 border border-border-muted bg-background px-3 py-2"
          >
            <option value="createdAt:desc">En yeni</option>
            <option value="name:asc">Ad A→Z</option>
            <option value="price:asc">Fiyat ↑</option>
            <option value="price:desc">Fiyat ↓</option>
            <option value="stock:desc">Stok</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="btn-motion border border-border-muted px-4 py-2 text-sm hover:border-accent"
        >
          Filtrele
        </button>
      </div>

      {error ? (
        <p className="border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {editing ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 border border-border-muted bg-surface p-4 md:grid-cols-2"
        >
          <h3 className="md:col-span-2 mono text-xs uppercase tracking-widest text-muted">
            {form.id ? 'Ürün düzenle' : 'Yeni ürün'}
          </h3>
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
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">
              Açıklama
            </span>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Fiyat</span>
            <input
              required
              type="number"
              step="0.01"
              value={form.basePrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, basePrice: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Stok</span>
            <input
              required
              type="number"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Kavurma
            </span>
            <input
              value={form.roastLevel}
              onChange={(e) =>
                setForm((f) => ({ ...f, roastLevel: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Menşei</span>
            <input
              value={form.originCountry}
              onChange={(e) =>
                setForm((f) => ({ ...f, originCountry: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Bölge</span>
            <input
              value={form.originRegion}
              onChange={(e) =>
                setForm((f) => ({ ...f, originRegion: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">İşlem</span>
            <input
              value={form.process}
              onChange={(e) => setForm((f) => ({ ...f, process: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Çeşit</span>
            <input
              value={form.varietal}
              onChange={(e) => setForm((f) => ({ ...f, varietal: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Batch ID</span>
            <input
              value={form.batchId}
              onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Rozet</span>
            <input
              value={form.badge}
              onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">
              Lezzet notları (virgülle)
            </span>
            <input
              value={form.flavorNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, flavorNotes: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <MediaUpload
              label="Ana görsel"
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
              folder="products"
            />
          </div>
          <div className="md:col-span-2">
            <GalleryMediaField
              label="Galeri"
              urls={form.gallery
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)}
              onChange={(urls) =>
                setForm((f) => ({ ...f, gallery: urls.join('\n') }))
              }
              folder="products"
            />
          </div>
          <div className="md:col-span-2 space-y-3 border border-border-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-[10px] uppercase text-muted">
                Varyantlar (ağırlık / SKU)
              </span>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    variants: [...f.variants, emptyVariant()],
                  }))
                }
                className="text-xs text-accent hover:underline"
              >
                + Varyant
              </button>
            </div>
            {form.variants.map((v, i) => (
              <div
                key={v.id || i}
                className="grid gap-2 border border-border-muted/60 p-2 md:grid-cols-5"
              >
                <input
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) =>
                    setForm((f) => {
                      const variants = [...f.variants];
                      variants[i] = { ...variants[i], sku: e.target.value };
                      return { ...f, variants };
                    })
                  }
                  className="border border-border-muted bg-background px-2 py-1.5 text-sm mono"
                />
                <input
                  placeholder="250g"
                  value={v.weightLabel}
                  onChange={(e) =>
                    setForm((f) => {
                      const variants = [...f.variants];
                      variants[i] = {
                        ...variants[i],
                        weightLabel: e.target.value,
                      };
                      return { ...f, variants };
                    })
                  }
                  className="border border-border-muted bg-background px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Fiyat"
                  value={v.price}
                  onChange={(e) =>
                    setForm((f) => {
                      const variants = [...f.variants];
                      variants[i] = { ...variants[i], price: e.target.value };
                      return { ...f, variants };
                    })
                  }
                  className="border border-border-muted bg-background px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Stok"
                  value={v.stock}
                  onChange={(e) =>
                    setForm((f) => {
                      const variants = [...f.variants];
                      variants[i] = { ...variants[i], stock: e.target.value };
                      return { ...f, variants };
                    })
                  }
                  className="border border-border-muted bg-background px-2 py-1.5 text-sm"
                />
                <div className="flex flex-col gap-2 md:col-span-5 md:flex-row md:items-center md:justify-between">
                  <Checkbox
                    checked={v.isActive}
                    onChange={(isActive) =>
                      setForm((f) => {
                        const variants = [...f.variants];
                        variants[i] = { ...variants[i], isActive };
                        return { ...f, variants };
                      })
                    }
                    label="Aktif"
                    description="Mağazada seçilebilir"
                  />
                  <button
                    type="button"
                    disabled={form.variants.length <= 1}
                    onClick={() => setDeleteVariantIndex(i)}
                    className="text-xs text-danger hover:underline disabled:opacity-30"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Checkbox
            checked={form.isActive}
            onChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            label="Aktif"
            description="Mağazada listelenir"
          />
          <Checkbox
            checked={form.isFeatured}
            onChange={(isFeatured) => setForm((f) => ({ ...f, isFeatured }))}
            label="Öne çıkan"
            description="Ana sayfada vurgulanır"
          />
          <div className="md:col-span-2 flex gap-2">
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
              className="border border-border-muted px-4 py-2 text-sm text-muted"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Yükleniyor…' : 'Henüz ürün yok'}
        columns={[
          {
            key: 'name',
            header: 'Ürün',
            render: (r) => (
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="mono text-[10px] text-muted">{r.slug}</div>
              </div>
            ),
          },
          {
            key: 'price',
            header: 'Fiyat',
            render: (r) => formatMoney(r.basePrice, r.currency || 'TRY'),
          },
          {
            key: 'stock',
            header: 'Stok',
            render: (r) => (
              <span className={r.stock <= 10 ? 'text-warning' : ''}>
                {r.stock}
              </span>
            ),
          },
          {
            key: 'active',
            header: 'Durum',
            render: (r) => (r.isActive ? 'Aktif' : 'Pasif'),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        open={Boolean(deleteId)}
        title="Ürünü sil?"
        description="Bu işlem geri alınamaz. Ürün katalogdan kaldırılır."
        confirmLabel="Ürünü sil"
        loading={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmRemove()}
      />

      <ConfirmDialog
        open={deleteVariantIndex !== null}
        title="Varyantı sil?"
        description={
          deleteVariantIndex !== null
            ? `"${form.variants[deleteVariantIndex]?.weightLabel || form.variants[deleteVariantIndex]?.sku || 'Bu varyant'}" formdan kaldırılacak. Kaydetmeden kalıcı olmaz.`
            : undefined
        }
        confirmLabel="Varyantı sil"
        onCancel={() => setDeleteVariantIndex(null)}
        onConfirm={() => {
          if (deleteVariantIndex === null) return;
          setForm((f) => ({
            ...f,
            variants:
              f.variants.length > 1
                ? f.variants.filter((_, idx) => idx !== deleteVariantIndex)
                : f.variants,
          }));
          setDeleteVariantIndex(null);
        }}
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
