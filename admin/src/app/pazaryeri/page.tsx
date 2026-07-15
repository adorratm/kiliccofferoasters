'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { asArray, asPaged } from '@/lib/utils';
import { Checkbox } from '@/components/Checkbox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { MarketplaceAccount, Product } from '@/lib/types';

const PLATFORMS = ['trendyol', 'hepsiburada', 'n11'] as const;
const CREDENTIAL_HINTS: Record<string, string> = {
  trendyol: '{\n  "apiKey": "",\n  "apiSecret": "",\n  "sellerId": ""\n}',
  hepsiburada: '{\n  "merchantId": "",\n  "username": "",\n  "password": ""\n}',
  n11: '{\n  "appKey": "",\n  "appSecret": ""\n}',
};

type SyncMode = 'all' | 'stock' | 'orders';

type FormState = {
  id?: string;
  platform: string;
  storeName: string;
  isEnabled: boolean;
  credentialsJson: string;
};

type SyncResult = {
  accountId: string;
  dryRun?: boolean;
  stub?: boolean;
  status?: string;
  stock?: {
    synced?: number;
    mock?: boolean;
    stub?: boolean;
    message?: string;
  };
  orders?: {
    orders?: unknown[];
    inserted?: number;
    mock?: boolean;
    stub?: boolean;
    message?: string;
  };
};

type ListingRow = {
  id: string;
  externalListingId: string;
  externalSku?: string | null;
  lastSyncedStock?: number | null;
  isActive: boolean;
  product?: { name?: string } | null;
  variant?: { sku?: string; weightLabel?: string } | null;
};

type MpOrderRow = {
  id: string;
  externalOrderId: string;
  externalStatus: string;
  createdAt?: string;
  payload?: Record<string, unknown> | null;
};

const emptyForm = (): FormState => ({
  platform: 'trendyol',
  storeName: '',
  isEnabled: false,
  credentialsJson: CREDENTIAL_HINTS.trendyol,
});

export default function MarketplacePage() {
  const [rows, setRows] = useState<MarketplaceAccount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>('all');
  const [dryRun, setDryRun] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [mpOrders, setMpOrders] = useState<MpOrderRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pushAccountId, setPushAccountId] = useState('');
  const [pushProductId, setPushProductId] = useState('');
  const [pushDryRun, setPushDryRun] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [syncAllBusy, setSyncAllBusy] = useState(false);
  const [enqueueAll, setEnqueueAll] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [accounts, productData] = await Promise.all([
        api<unknown>('/marketplace/accounts'),
        api<unknown>('/products/admin/all?limit=100').catch(() => ({ items: [] })),
      ]);
      setRows(asArray<MarketplaceAccount>(accounts));
      setProducts(asPaged<Product>(productData).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesaplar yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadDetail(accountId: string) {
    setDetailId(accountId);
    setDetailLoading(true);
    try {
      const [l, o] = await Promise.all([
        api<unknown>(`/marketplace/accounts/${accountId}/listings`),
        api<unknown>(`/marketplace/accounts/${accountId}/orders`),
      ]);
      setListings(asArray<ListingRow>(l));
      setMpOrders(asArray<MpOrderRow>(o));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detay yüklenemedi');
      setListings([]);
      setMpOrders([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function startCreate() {
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(row: MarketplaceAccount) {
    setForm({
      id: row.id,
      platform: row.platform,
      storeName: row.storeName,
      isEnabled: row.isEnabled,
      credentialsJson:
        CREDENTIAL_HINTS[row.platform] || '{\n  \n}',
    });
    setShowForm(true);
    setMessage(
      'Düzenlemede credentials maskeli gelir — yeni değerleri JSON olarak yeniden girin veya mevcut anahtarları silmek için boş bırakın.',
    );
  }

  async function saveAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    let credentials: Record<string, string>;
    try {
      credentials = JSON.parse(form.credentialsJson) as Record<string, string>;
    } catch {
      setError('Credentials JSON geçersiz');
      return;
    }
    try {
      if (form.id) {
        const body: Record<string, unknown> = {
          platform: form.platform,
          storeName: form.storeName,
          isEnabled: form.isEnabled,
        };
        const hasValue = Object.values(credentials).some(
          (v) => typeof v === 'string' && v.trim() && !v.startsWith('****'),
        );
        if (hasValue) body.credentials = credentials;
        await api(`/marketplace/accounts/${form.id}`, {
          method: 'PATCH',
          body,
        });
        setMessage('Hesap güncellendi');
      } else {
        await api('/marketplace/accounts', {
          method: 'POST',
          body: {
            platform: form.platform,
            storeName: form.storeName,
            isEnabled: form.isEnabled,
            credentials,
          },
        });
        setMessage('Hesap eklendi');
      }
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    }
  }

  async function toggleEnabled(row: MarketplaceAccount) {
    try {
      await api(`/marketplace/accounts/${row.id}`, {
        method: 'PATCH',
        body: { isEnabled: !row.isEnabled },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi');
    }
  }

  async function sync(id: string) {
    setSyncingId(id);
    setError(null);
    setMessage(null);
    setLastSync(null);
    try {
      const result = await api<SyncResult>(`/marketplace/accounts/${id}/sync`, {
        method: 'POST',
        body: { mode: syncMode, dryRun },
      });
      setLastSync(result);
      const mock =
        result.stock?.mock || result.orders?.mock || result.stock?.stub;
      setMessage(
        [
          dryRun ? 'Dry-run' : 'Sync',
          mock ? '· stub/mock' : null,
          result.stock ? `stok:${result.stock.synced ?? 0}` : null,
          result.orders
            ? `sipariş:+${result.orders.inserted ?? 0}/${result.orders.orders?.length ?? 0}`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
      await load();
      if (detailId === id) await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senkron başarısız');
      await load();
    } finally {
      setSyncingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api(`/marketplace/accounts/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setMessage('Hesap silindi');
      if (detailId === deleteId) {
        setDetailId(null);
        setListings([]);
        setMpOrders([]);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
      setDeleteId(null);
    }
  }

  async function syncAllAccounts() {
    setSyncAllBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{
        enqueued?: boolean;
        jobId?: string;
        scanned?: number;
        ok?: number;
        failed?: number;
      }>('/marketplace/sync-all', {
        method: 'POST',
        body: { mode: syncMode, dryRun, enqueue: enqueueAll },
      });
      if (result.enqueued) {
        setMessage(
          `Tüm hesaplar kuyruğa alındı (job ${result.jobId || '—'}). Bull Board’dan izleyebilirsin.`,
        );
      } else {
        setMessage(
          `Toplu sync: ${result.ok ?? 0} ok / ${result.failed ?? 0} hata (taranan ${result.scanned ?? 0})`,
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu sync başarısız');
    } finally {
      setSyncAllBusy(false);
    }
  }

  async function pushProduct(e: FormEvent) {
    e.preventDefault();
    if (!pushAccountId || !pushProductId) {
      setError('Hesap ve ürün seçin');
      return;
    }
    setPushing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{
        dryRun?: boolean;
        pushed?: { mock?: boolean; stub?: boolean; message?: string; externalListingId?: string };
      }>(`/marketplace/accounts/${pushAccountId}/push-product`, {
        method: 'POST',
        body: { productId: pushProductId, dryRun: pushDryRun },
      });
      setMessage(
        [
          pushDryRun ? 'Dry-run push' : 'Ürün gönderildi',
          result.pushed?.mock || result.pushed?.stub ? '· stub' : null,
          result.pushed?.externalListingId
            ? `ID ${result.pushed.externalListingId}`
            : null,
          result.pushed?.message || null,
        ]
          .filter(Boolean)
          .join(' — '),
      );
      if (detailId === pushAccountId) await loadDetail(pushAccountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push başarısız');
    } finally {
      setPushing(false);
    }
  }

  const detailAccount = rows.find((r) => r.id === detailId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Trendyol · Hepsiburada · N11 — adaptörler şu an stub (gerçek API yakında)
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
        >
          Hesap ekle
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

      {lastSync ? (
        <div className="border border-border-muted bg-surface p-4 text-sm">
          <p className="mono text-[10px] uppercase text-muted">Son sync sonucu</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lastSync.dryRun ? (
              <span className="border border-border-muted px-2 py-0.5 text-xs text-muted">
                dry-run
              </span>
            ) : null}
            {lastSync.stock?.mock || lastSync.orders?.mock ? (
              <span className="border border-accent/50 px-2 py-0.5 text-xs text-accent">
                mock
              </span>
            ) : null}
            {lastSync.stock?.stub || lastSync.orders?.stub || lastSync.stub ? (
              <span className="border border-accent/50 px-2 py-0.5 text-xs text-accent">
                stub
              </span>
            ) : null}
            <span className="mono text-xs">{lastSync.status || 'ok'}</span>
          </div>
          {lastSync.stock?.message ? (
            <p className="mt-2 text-xs text-muted">{lastSync.stock.message}</p>
          ) : null}
          {lastSync.orders?.message ? (
            <p className="mt-1 text-xs text-muted">{lastSync.orders.message}</p>
          ) : null}
          <pre className="mt-3 max-h-40 overflow-auto bg-background p-2 mono text-[11px] text-muted">
            {JSON.stringify(lastSync, null, 2)}
          </pre>
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={saveAccount}
          className="grid gap-3 border border-border-muted bg-surface p-4 md:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Platform
            </span>
            <select
              value={form.platform}
              disabled={Boolean(form.id)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  platform: e.target.value,
                  credentialsJson:
                    CREDENTIAL_HINTS[e.target.value] || f.credentialsJson,
                }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mono text-[10px] uppercase text-muted">
              Mağaza adı
            </span>
            <input
              required
              value={form.storeName}
              onChange={(e) =>
                setForm((f) => ({ ...f, storeName: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mono text-[10px] uppercase text-muted">
              Credentials JSON
            </span>
            <textarea
              rows={6}
              value={form.credentialsJson}
              onChange={(e) =>
                setForm((f) => ({ ...f, credentialsJson: e.target.value }))
              }
              className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono text-xs"
              spellCheck={false}
            />
          </label>
          <Checkbox
            checked={form.isEnabled}
            onChange={(isEnabled) => setForm((f) => ({ ...f, isEnabled }))}
            label="Aktif"
            description="Senkron ve push için hesap açık olmalı"
          />
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
              }}
              className="border border-border-muted px-4 py-2 text-sm text-muted"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-end gap-4 border border-border-muted bg-surface p-4">
        <label className="block text-sm">
          <span className="mono text-[10px] uppercase text-muted">Sync mode</span>
          <select
            value={syncMode}
            onChange={(e) => setSyncMode(e.target.value as SyncMode)}
            className="mt-1 block border border-border-muted bg-background px-3 py-2 text-sm"
          >
            <option value="all">Hepsi (stok + sipariş)</option>
            <option value="stock">Yalnız stok</option>
            <option value="orders">Yalnız sipariş</option>
          </select>
        </label>
        <Checkbox
          checked={dryRun}
          onChange={setDryRun}
          label="Dry-run"
          description="DB’ye yazmadan dene"
        />
        <Checkbox
          checked={enqueueAll}
          onChange={setEnqueueAll}
          label="Kuyruğa al"
          description="Toplu sync BullMQ’ya gider"
        />
        <button
          type="button"
          disabled={syncAllBusy}
          onClick={() => void syncAllAccounts()}
          className="border border-accent px-4 py-2 text-sm text-accent hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {syncAllBusy ? 'Sync…' : 'Tüm aktif hesapları sync'}
        </button>
        <p className="w-full text-xs text-muted">
          Otomatik sync varsayılan her 60 dk (MARKETPLACE_SYNC_INTERVAL_MINUTES).
          Kuyruk: Bull Board → marketplace-sync
        </p>
      </div>

      <form
        onSubmit={pushProduct}
        className="grid gap-3 border border-border-muted bg-surface p-4 md:grid-cols-4"
      >
        <label className="block text-sm">
          <span className="mono text-[10px] uppercase text-muted">Hesap</span>
          <select
            value={pushAccountId}
            onChange={(e) => setPushAccountId(e.target.value)}
            className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
          >
            <option value="">Seç…</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.platform} · {r.storeName}
                {!r.isEnabled ? ' (pasif)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mono text-[10px] uppercase text-muted">Ürün</span>
          <select
            value={pushProductId}
            onChange={(e) => setPushProductId(e.target.value)}
            className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
          >
            <option value="">Seç…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2">
          <Checkbox
            checked={pushDryRun}
            onChange={setPushDryRun}
            label="Dry-run push"
          />
          <button
            type="submit"
            disabled={pushing}
            className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pushing ? 'Gönderiliyor…' : 'Ürünü pazara gönder'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mono text-sm text-muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="border border-border-muted bg-surface px-4 py-10 text-center text-sm text-muted">
          Hesap yok
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-muted">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-surface-high">
              <tr>
                <th className="mono px-3 py-2 text-[10px] uppercase text-muted">
                  Platform
                </th>
                <th className="mono px-3 py-2 text-[10px] uppercase text-muted">
                  Mağaza
                </th>
                <th className="mono px-3 py-2 text-[10px] uppercase text-muted">
                  Durum
                </th>
                <th className="mono px-3 py-2 text-[10px] uppercase text-muted">
                  Son sync
                </th>
                <th className="mono px-3 py-2 text-[10px] uppercase text-muted">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border-muted bg-surface"
                >
                  <td className="px-3 py-2 uppercase">{row.platform}</td>
                  <td className="px-3 py-2">{row.storeName}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleEnabled(row)}
                      className={`mono text-xs ${
                        row.isEnabled ? 'text-success' : 'text-muted'
                      }`}
                    >
                      {row.isEnabled ? 'enabled' : 'disabled'}
                    </button>
                  </td>
                  <td className="px-3 py-2 mono text-xs">
                    <span
                      className={
                        row.lastSyncStatus === 'error'
                          ? 'text-danger'
                          : row.lastSyncStatus === 'success'
                            ? 'text-success'
                            : 'text-muted'
                      }
                    >
                      {row.lastSyncStatus || '—'}
                    </span>
                    <br />
                    <span className="text-muted">
                      {row.lastSyncAt
                        ? new Date(row.lastSyncAt).toLocaleString('tr-TR')
                        : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={syncingId === row.id || !row.isEnabled}
                        onClick={() => void sync(row.id)}
                        className="border border-accent px-3 py-1 text-xs text-accent hover:bg-accent hover:text-white disabled:opacity-50"
                        title={!row.isEnabled ? 'Hesabı aktifleştirin' : undefined}
                      >
                        {syncingId === row.id ? 'Sync…' : 'Sync'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadDetail(row.id)}
                        className="border border-border-muted px-3 py-1 text-xs hover:border-accent"
                      >
                        Detay
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-xs text-accent hover:underline"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(row.id)}
                        className="text-xs text-danger hover:underline"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailId && detailAccount ? (
        <div className="space-y-4 border border-border-muted bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">
              {detailAccount.platform} · {detailAccount.storeName}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDetailId(null);
                setListings([]);
                setMpOrders([]);
              }}
              className="text-xs text-muted hover:underline"
            >
              Kapat
            </button>
          </div>
          {detailLoading ? (
            <p className="text-sm text-muted">Detay yükleniyor…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mono mb-2 text-[10px] uppercase text-muted">
                  Listingler ({listings.length})
                </p>
                {listings.length === 0 ? (
                  <p className="text-xs text-muted">Listing yok</p>
                ) : (
                  <ul className="divide-y divide-border-muted border border-border-muted text-xs">
                    {listings.map((l) => (
                      <li key={l.id} className="px-3 py-2">
                        <p className="font-medium">
                          {l.product?.name || 'Ürün'}
                          {l.variant?.weightLabel
                            ? ` · ${l.variant.weightLabel}`
                            : ''}
                        </p>
                        <p className="mono text-muted">
                          {l.externalListingId} · stok{' '}
                          {l.lastSyncedStock ?? '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mono mb-2 text-[10px] uppercase text-muted">
                  Pazaryeri siparişleri ({mpOrders.length})
                </p>
                {mpOrders.length === 0 ? (
                  <p className="text-xs text-muted">Sipariş yok</p>
                ) : (
                  <ul className="divide-y divide-border-muted border border-border-muted text-xs">
                    {mpOrders.map((o) => (
                      <li key={o.id} className="px-3 py-2">
                        <p className="mono">{o.externalOrderId}</p>
                        <p className="text-muted">
                          {o.externalStatus}
                          {o.createdAt
                            ? ` · ${new Date(o.createdAt).toLocaleString('tr-TR')}`
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        title="Hesabı sil"
        description="Bu pazaryeri hesabı ve ilişkili listing/sipariş kayıtları silinebilir."
        confirmLabel="Sil"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
