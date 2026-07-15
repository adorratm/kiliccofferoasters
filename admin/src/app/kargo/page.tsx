'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Checkbox } from '@/components/Checkbox';
import { asArray } from '@/lib/utils';
import type { ShippingProviderConfig } from '@/lib/types';

type Draft = {
  isEnabled: boolean;
  fee: string;
  estimatedDays: string;
  credentialsJson: string;
};

export default function ShippingPage() {
  const [rows, setRows] = useState<ShippingProviderConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<unknown>('/shipping/providers');
      const list = asArray<ShippingProviderConfig>(data);
      setRows(list);
      const next: Record<string, Draft> = {};
      for (const row of list) {
        const settings = (row.settings || {}) as {
          fee?: string | number;
          estimatedDays?: string;
        };
        next[row.id] = {
          isEnabled: row.isEnabled,
          fee: settings.fee != null ? String(settings.fee) : '89.90',
          estimatedDays: settings.estimatedDays || '2-5 gün',
          credentialsJson: JSON.stringify(row.credentials || {}, null, 2),
        };
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kargo ayarları yüklenemedi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent, row: ShippingProviderConfig) {
    e.preventDefault();
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setMessage(null);
    setError(null);
    let credentials: Record<string, string>;
    try {
      credentials = JSON.parse(draft.credentialsJson) as Record<string, string>;
    } catch {
      setError('Credentials JSON geçersiz');
      setSavingId(null);
      return;
    }
    try {
      // API :provider kodu bekler (UUID değil)
      await api(`/shipping/providers/${encodeURIComponent(row.provider)}`, {
        method: 'PATCH',
        body: {
          isEnabled: draft.isEnabled,
          credentials,
          settings: {
            fee: draft.fee.trim() || '89.90',
            estimatedDays: draft.estimatedDays.trim() || '2-5 gün',
          },
        },
      });
      setMessage('Kaydedildi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Sağlayıcıları etkinleştirin, kargo ücretini ve kimlik bilgilerini ayarlayın.
      </p>
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
      {loading ? (
        <p className="mono text-sm text-muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <div className="border border-border-muted bg-surface px-4 py-10 text-center text-sm text-muted">
          Kargo sağlayıcı kaydı yok
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => {
            const draft = drafts[row.id] || {
              isEnabled: row.isEnabled,
              fee: '89.90',
              estimatedDays: '2-5 gün',
              credentialsJson: '{}',
            };
            return (
              <form
                key={row.id}
                onSubmit={(e) => void save(e, row)}
                className="border border-border-muted bg-surface p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{row.displayName}</h3>
                    <p className="mono text-[10px] uppercase text-muted">
                      {row.provider}
                    </p>
                  </div>
                  <Checkbox
                    checked={draft.isEnabled}
                    onChange={(isEnabled) =>
                      setDrafts((d) => ({
                        ...d,
                        [row.id]: { ...draft, isEnabled },
                      }))
                    }
                    label="Aktif"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mono text-[10px] uppercase text-muted">
                      Kargo ücreti (TRY)
                    </span>
                    <input
                      value={draft.fee}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [row.id]: { ...draft, fee: e.target.value },
                        }))
                      }
                      className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mono text-[10px] uppercase text-muted">
                      Tahmini süre
                    </span>
                    <input
                      value={draft.estimatedDays}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [row.id]: {
                            ...draft,
                            estimatedDays: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full border border-border-muted bg-background px-3 py-2"
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mono text-[10px] uppercase text-muted">
                    Credentials JSON
                  </span>
                  <textarea
                    rows={6}
                    value={draft.credentialsJson}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [row.id]: {
                          ...draft,
                          credentialsJson: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full border border-border-muted bg-background px-3 py-2 mono text-xs"
                    spellCheck={false}
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingId === row.id}
                  className="btn-motion bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {savingId === row.id ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
