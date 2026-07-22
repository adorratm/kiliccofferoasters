'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { asArray, slugify } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import type { LegalDocument } from '@/lib/types';

type FormState = {
  id?: string;
  slug: string;
  title: string;
  content: string;
  version: string;
};

const emptyForm = (): FormState => ({
  slug: '',
  title: '',
  content: '',
  version: '1.0',
});

function LegalPageInner() {
  const searchParams = useSearchParams();
  const filterQ = (searchParams.get('q') || '').trim().toLowerCase();

  const [rows, setRows] = useState<LegalDocument[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openedFromQuery = useRef(false);

  const visible = useMemo(() => {
    if (!filterQ) return rows;
    return rows.filter(
      (d) =>
        d.title.toLowerCase().includes(filterQ) ||
        d.slug.toLowerCase().includes(filterQ),
    );
  }, [rows, filterQ]);

  useEffect(() => {
    openedFromQuery.current = false;
  }, [filterQ]);

  useEffect(() => {
    if (!filterQ || !rows.length || openedFromQuery.current) return;
    const match = rows.find(
      (d) =>
        d.slug.toLowerCase() === filterQ ||
        d.title.toLowerCase().includes(filterQ) ||
        d.slug.toLowerCase().includes(filterQ),
    );
    if (!match) return;
    openedFromQuery.current = true;
    startEdit(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQ, rows]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<unknown>('/legal/documents').catch(() =>
        api<unknown>('/legal'),
      );
      setRows(asArray<LegalDocument>(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Belgeler yüklenemedi');
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
  }

  function startEdit(doc: LegalDocument) {
    setForm({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      content: doc.content,
      version: doc.version,
    });
    setEditing(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      slug: form.slug || slugify(form.title),
      title: form.title,
      content: form.content,
      version: form.version,
      isPublished: true,
    };
    try {
      if (form.id) {
        await api(`/legal/documents/${form.id}`, {
          method: 'PATCH',
          body: payload,
        }).catch(() =>
          api(`/legal/${form.id}`, { method: 'PATCH', body: payload }),
        );
      } else {
        await api('/legal/documents', { method: 'POST', body: payload }).catch(
          () => api('/legal', { method: 'POST', body: payload }),
        );
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

  async function publish(id: string) {
    setError(null);
    setMessage(null);
    try {
      await api(`/legal/documents/${id}/publish`, { method: 'POST' }).catch(
        () =>
          api(`/legal/${id}`, {
            method: 'PATCH',
            body: { isPublished: true },
          }),
      );
      setMessage('Yayınlandı');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yayınlanamadı');
    }
  }

  async function syncDefaults(force = false) {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const result = await api<{
        created: string[];
        updated: string[];
        skipped: string[];
      }>('/legal/documents/sync-defaults', {
        method: 'POST',
        body: { force },
      });
      const parts = [
        result.created.length
          ? `${result.created.length} oluşturuldu`
          : null,
        result.updated.length ? `${result.updated.length} güncellendi` : null,
        result.skipped.length
          ? `${result.skipped.length} atlandı (zaten düzenlenmiş)`
          : null,
      ].filter(Boolean);
      setMessage(parts.join(' · ') || 'Senkron tamam');
      setEditing(false);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Varsayılan metinler yüklenemedi',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Yasal belge editörü — sitede görünen metinler buradan yönetilir
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void syncDefaults(false)}
            className="btn-motion border border-border-muted px-4 py-2 text-sm text-foreground hover:bg-background disabled:opacity-50"
            title="Eksik veya örnek içerikli belgeleri doldurur"
          >
            Varsayılan metinleri yükle
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
          >
            Yeni belge
          </button>
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

      {editing ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 border border-border-muted bg-surface p-4"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mono text-[10px] uppercase text-muted">Slug</span>
              <input
                required
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono"
              />
            </label>
            <label className="block text-sm">
              <span className="mono text-[10px] uppercase text-muted">
                Başlık
              </span>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.id ? f.slug : slugify(e.target.value),
                  }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mono text-[10px] uppercase text-muted">
                Versiyon
              </span>
              <input
                required
                value={form.version}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
                className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">İçerik</span>
            <textarea
              required
              rows={14}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="flex gap-2">
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
        rows={visible}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Yükleniyor…' : 'Belge yok'}
        selectedRowKey={editing ? form.id || null : null}
        onRowClick={(r) => startEdit(r)}
        columns={[
          {
            key: 'slug',
            header: 'Slug',
            render: (r) => <span className="mono text-xs">{r.slug}</span>,
          },
          { key: 'title', header: 'Başlık', render: (r) => r.title },
          {
            key: 'version',
            header: 'Ver',
            render: (r) => <span className="mono text-xs">{r.version}</span>,
          },
          {
            key: 'pub',
            header: 'Yayın',
            render: (r) => (r.isPublished ? 'published' : 'draft'),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="text-xs text-accent hover:underline"
                >
                  Düzenle
                </button>
                {!r.isPublished ? (
                  <button
                    type="button"
                    onClick={() => void publish(r.id)}
                    className="text-xs text-success hover:underline"
                  >
                    Yayınla
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense
      fallback={<p className="mono text-sm text-muted">Yükleniyor…</p>}
    >
      <LegalPageInner />
    </Suspense>
  );
}
