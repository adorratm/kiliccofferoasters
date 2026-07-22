'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { asPaged, slugify } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { MediaUpload } from '@/components/MediaUpload';
import { Checkbox } from '@/components/Checkbox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { BlogPost } from '@/lib/types';

type FormState = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  authorName: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
};

const emptyForm = (): FormState => ({
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  authorName: 'Kılıç Coffee Roasters',
  tags: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: false,
});

function BlogAdminPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [rows, setRows] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [q, setQ] = useState(initialQ);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load(search = q) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        includeDrafts: 'true',
        limit: '50',
        sort: 'updatedAt',
        order: 'desc',
      });
      if (search.trim()) qs.set('q', search.trim());
      const data = await api<unknown>(`/blog/admin/all?${qs}`);
      setRows(asPaged<BlogPost>(data).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yazılar yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ(initialQ);
    void load(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  function startCreate() {
    setForm(emptyForm());
    setEditing(true);
  }

  function startEdit(post: BlogPost) {
    setForm({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImageUrl: post.coverImageUrl || '',
      authorName: post.authorName || '',
      tags: (post.tags || []).join(', '),
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || '',
      isPublished: post.isPublished,
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
      excerpt: form.excerpt || undefined,
      content: form.content,
      coverImageUrl: form.coverImageUrl || undefined,
      authorName: form.authorName || undefined,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      isPublished: form.isPublished,
    };
    try {
      if (form.id) {
        await api(`/blog/${form.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/blog', { method: 'POST', body: payload });
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
      await api(`/blog/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setMessage('Silindi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Blog yazıları — SEO alanlarıyla</p>
        <button
          type="button"
          onClick={startCreate}
          className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
        >
          Yeni yazı
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load(q);
          }}
          placeholder="Ara…"
          className="border border-border-muted bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void load(q)}
          className="border border-border-muted px-3 py-2 text-sm"
        >
          Filtrele
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
            <span className="mono text-[10px] uppercase text-muted">Başlık</span>
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
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">Özet</span>
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) =>
                setForm((f) => ({ ...f, excerpt: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">
              İçerik (HTML)
            </span>
            <textarea
              required
              rows={12}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <MediaUpload
              label="Kapak görseli"
              value={form.coverImageUrl}
              onChange={(url) =>
                setForm((f) => ({ ...f, coverImageUrl: url }))
              }
              folder="blog"
            />
          </div>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">Yazar</span>
            <input
              value={form.authorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, authorName: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Etiketler (virgülle)
            </span>
            <input
              value={form.tags}
              onChange={(e) =>
                setForm((f) => ({ ...f, tags: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              SEO başlık
            </span>
            <input
              value={form.seoTitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, seoTitle: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              SEO açıklama
            </span>
            <input
              value={form.seoDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, seoDescription: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <Checkbox
              checked={form.isPublished}
              onChange={(isPublished) =>
                setForm((f) => ({ ...f, isPublished }))
              }
              label="Yayında"
              description="Sitede /blog altında görünür"
            />
          </div>
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
        emptyMessage={loading ? 'Yükleniyor…' : 'Yazı yok'}
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
            key: 'pub',
            header: 'Durum',
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
        title="Yazıyı sil"
        description="Bu blog yazısı kalıcı olarak silinecek."
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default function BlogAdminPage() {
  return (
    <Suspense
      fallback={<p className="mono text-sm text-muted">Yükleniyor…</p>}
    >
      <BlogAdminPageInner />
    </Suspense>
  );
}
