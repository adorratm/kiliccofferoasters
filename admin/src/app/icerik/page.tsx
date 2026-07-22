'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MediaUpload } from '@/components/MediaUpload';

type Section = {
  id: string;
  page: string;
  sectionKey: string;
  title: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isPublished: boolean;
};

type LabelValue = { label: string; value: string };
type Cta = { label: string; href: string };

type HeroForm = {
  imageUrl: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctaPrimary: Cta;
  ctaSecondary: Cta;
  sidebar: LabelValue[];
};

type EthosForm = {
  titleLines: string[];
  description: string;
  stats: LabelValue[];
  imageUrl: string;
  telemetry: {
    profile: string;
    feed: string;
    metrics: LabelValue[];
  };
};

type ProductsForm = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

type WorkshopForm = {
  subtitle: string;
  titleLines: string[];
  description: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
};

type NewsletterForm = {
  title: string;
  description: string;
};

type ContactHeaderForm = {
  title: string;
  subtitle: string;
};

type SectionForm =
  | { kind: 'hero'; data: HeroForm }
  | { kind: 'ethos'; data: EthosForm }
  | { kind: 'products'; data: ProductsForm }
  | { kind: 'workshop'; data: WorkshopForm }
  | { kind: 'newsletter'; data: NewsletterForm }
  | { kind: 'contact-header'; data: ContactHeaderForm }
  | { kind: 'generic'; data: Record<string, string> };

const PAGE_OPTIONS = [
  { value: 'home', label: 'Ana Sayfa' },
  { value: 'contact', label: 'İletişim' },
];

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asCta(value: unknown): Cta {
  if (value && typeof value === 'object') {
    const cta = value as { label?: unknown; href?: unknown };
    return {
      label: asString(cta.label),
      href: asString(cta.href, '/'),
    };
  }
  return { label: '', href: '/' };
}

function asLabelValues(value: unknown): LabelValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item && typeof item === 'object') {
      const row = item as { label?: unknown; value?: unknown };
      return {
        label: asString(row.label),
        value: asString(row.value),
      };
    }
    return { label: '', value: '' };
  });
}

function asStringList(value: unknown, min = 1): string[] {
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value.length >= min ? value : [...value, ...Array(min - value.length).fill('')];
  }
  return Array.from({ length: min }, () => '');
}

function toSectionForm(section: Section): SectionForm {
  const c = section.content || {};
  switch (section.sectionKey) {
    case 'hero':
      return {
        kind: 'hero',
        data: {
          imageUrl: asString(c.imageUrl),
          eyebrow: asString(c.eyebrow),
          titleLine1: asString(c.titleLine1),
          titleLine2: asString(c.titleLine2),
          description: asString(c.description),
          ctaPrimary: asCta(c.ctaPrimary),
          ctaSecondary: asCta(c.ctaSecondary),
          sidebar: asLabelValues(c.sidebar),
        },
      };
    case 'ethos':
      return {
        kind: 'ethos',
        data: {
          titleLines: asStringList(c.titleLines, 3),
          description: asString(c.description),
          stats: asLabelValues(c.stats),
          imageUrl: asString(c.imageUrl),
          telemetry: {
            profile: asString(
              (c.telemetry as { profile?: unknown } | undefined)?.profile,
            ),
            feed: asString(
              (c.telemetry as { feed?: unknown } | undefined)?.feed,
            ),
            metrics: asLabelValues(
              (c.telemetry as { metrics?: unknown } | undefined)?.metrics,
            ),
          },
        },
      };
    case 'products':
      return {
        kind: 'products',
        data: {
          title: asString(c.title),
          subtitle: asString(c.subtitle),
          ctaLabel: asString(c.ctaLabel),
          ctaHref: asString(c.ctaHref, '/urunler'),
        },
      };
    case 'workshop':
      return {
        kind: 'workshop',
        data: {
          subtitle: asString(c.subtitle),
          titleLines: asStringList(c.titleLines, 2),
          description: asString(c.description),
          imageUrl: asString(c.imageUrl),
          ctaLabel: asString(c.ctaLabel),
          ctaHref: asString(c.ctaHref, '/iletisim'),
        },
      };
    case 'newsletter':
      return {
        kind: 'newsletter',
        data: {
          title: asString(c.title),
          description: asString(c.description),
        },
      };
    case 'header':
      return {
        kind: 'contact-header',
        data: {
          title: asString(c.title),
          subtitle: asString(c.subtitle),
        },
      };
    default:
      return {
        kind: 'generic',
        data: Object.fromEntries(
          Object.entries(c).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
        ),
      };
  }
}

function fromSectionForm(form: SectionForm): Record<string, unknown> {
  switch (form.kind) {
    case 'hero':
      return form.data;
    case 'ethos':
      return form.data;
    case 'products':
      return form.data;
    case 'workshop':
      return form.data;
    case 'newsletter':
      return form.data;
    case 'contact-header':
      return form.data;
    case 'generic':
      return form.data;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mono text-[10px] uppercase text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputClassName() {
  return 'w-full border border-border-muted bg-background px-3 py-2';
}

function LabelValueListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: LabelValue[];
  onChange: (items: LabelValue[]) => void;
}) {
  function update(index: number, field: keyof LabelValue, value: string) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, { label: '', value: '' }])}
          className="text-xs text-accent hover:underline"
        >
          + Ekle
        </button>
      </div>
      {items.map((item, index) => (
        <div
          key={`${label}-${index}`}
          className="grid gap-2 border border-border-muted bg-background p-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <Field label="Etiket">
            <input
              value={item.label}
              onChange={(e) => update(index, 'label', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          <Field label="Değer">
            <input
              value={item.value}
              onChange={(e) => update(index, 'value', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="border border-danger/40 px-2 py-2 text-xs text-danger"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-xs text-accent hover:underline"
        >
          + Satır
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="flex gap-2">
          <input
            value={item}
            onChange={(e) =>
              onChange(items.map((v, i) => (i === index ? e.target.value : v)))
            }
            className={inputClassName()}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="border border-danger/40 px-2 py-2 text-xs text-danger"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ContentPage() {
  const [page, setPage] = useState('home');
  const [sections, setSections] = useState<Section[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState<SectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(selectedPage = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Section[]>(
        `/cms/admin/sections?page=${encodeURIComponent(selectedPage)}`,
      );
      setSections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İçerik yüklenemedi');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function startEdit(section: Section) {
    setEditing(section);
    setForm(toSectionForm(section));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !form) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/cms/admin/sections/${editing.id}`, {
        method: 'PATCH',
        body: { content: fromSectionForm(form), isPublished: true },
      });
      setEditing(null);
      setForm(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sayfa İçerikleri</h2>
          <p className="text-sm text-muted">
            Ana sayfa blokları ve iletişim başlığı
          </p>
        </div>
        <select
          value={page}
          onChange={(e) => {
            setEditing(null);
            setForm(null);
            setPage(e.target.value);
          }}
          className="border border-border-muted bg-background px-3 py-2 text-sm"
        >
          {PAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="border border-danger/40 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {editing && form ? (
        <form
          onSubmit={onSubmit}
          className="space-y-4 border border-border-muted bg-surface p-4"
        >
          <h3 className="mono text-xs uppercase text-muted">
            {editing.title || editing.sectionKey}
          </h3>

          {form.kind === 'hero' ? (
            <>
              <MediaUpload
                label="Hero görseli"
                value={form.data.imageUrl}
                onChange={(imageUrl) =>
                  setForm({ kind: 'hero', data: { ...form.data, imageUrl } })
                }
                folder="pages/home"
              />
              <Field label="Üst etiket">
                <input
                  value={form.data.eyebrow}
                  onChange={(e) =>
                    setForm({
                      kind: 'hero',
                      data: { ...form.data, eyebrow: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Başlık satır 1">
                  <input
                    value={form.data.titleLine1}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: { ...form.data, titleLine1: e.target.value },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Başlık satır 2">
                  <input
                    value={form.data.titleLine2}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: { ...form.data, titleLine2: e.target.value },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
              </div>
              <Field label="Açıklama">
                <textarea
                  rows={3}
                  value={form.data.description}
                  onChange={(e) =>
                    setForm({
                      kind: 'hero',
                      data: { ...form.data, description: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Birincil CTA metin">
                  <input
                    value={form.data.ctaPrimary.label}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: {
                          ...form.data,
                          ctaPrimary: {
                            ...form.data.ctaPrimary,
                            label: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Birincil CTA URL">
                  <input
                    value={form.data.ctaPrimary.href}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: {
                          ...form.data,
                          ctaPrimary: {
                            ...form.data.ctaPrimary,
                            href: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="İkincil CTA metin">
                  <input
                    value={form.data.ctaSecondary.label}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: {
                          ...form.data,
                          ctaSecondary: {
                            ...form.data.ctaSecondary,
                            label: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="İkincil CTA URL">
                  <input
                    value={form.data.ctaSecondary.href}
                    onChange={(e) =>
                      setForm({
                        kind: 'hero',
                        data: {
                          ...form.data,
                          ctaSecondary: {
                            ...form.data.ctaSecondary,
                            href: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
              </div>
              <LabelValueListEditor
                label="Yan bilgiler"
                items={form.data.sidebar}
                onChange={(sidebar) =>
                  setForm({ kind: 'hero', data: { ...form.data, sidebar } })
                }
              />
            </>
          ) : null}

          {form.kind === 'ethos' ? (
            <>
              <StringListEditor
                label="Başlık satırları"
                items={form.data.titleLines}
                onChange={(titleLines) =>
                  setForm({ kind: 'ethos', data: { ...form.data, titleLines } })
                }
              />
              <Field label="Açıklama">
                <textarea
                  rows={3}
                  value={form.data.description}
                  onChange={(e) =>
                    setForm({
                      kind: 'ethos',
                      data: { ...form.data, description: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <LabelValueListEditor
                label="İstatistikler"
                items={form.data.stats}
                onChange={(stats) =>
                  setForm({ kind: 'ethos', data: { ...form.data, stats } })
                }
              />
              <MediaUpload
                label="Telemetri görseli"
                value={form.data.imageUrl}
                onChange={(imageUrl) =>
                  setForm({ kind: 'ethos', data: { ...form.data, imageUrl } })
                }
                folder="pages/home"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Profil">
                  <input
                    value={form.data.telemetry.profile}
                    onChange={(e) =>
                      setForm({
                        kind: 'ethos',
                        data: {
                          ...form.data,
                          telemetry: {
                            ...form.data.telemetry,
                            profile: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Canlı feed">
                  <input
                    value={form.data.telemetry.feed}
                    onChange={(e) =>
                      setForm({
                        kind: 'ethos',
                        data: {
                          ...form.data,
                          telemetry: {
                            ...form.data.telemetry,
                            feed: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
              </div>
              <LabelValueListEditor
                label="Telemetri metrikleri"
                items={form.data.telemetry.metrics}
                onChange={(metrics) =>
                  setForm({
                    kind: 'ethos',
                    data: {
                      ...form.data,
                      telemetry: { ...form.data.telemetry, metrics },
                    },
                  })
                }
              />
            </>
          ) : null}

          {form.kind === 'products' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Başlık">
                <input
                  value={form.data.title}
                  onChange={(e) =>
                    setForm({
                      kind: 'products',
                      data: { ...form.data, title: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="Alt başlık">
                <input
                  value={form.data.subtitle}
                  onChange={(e) =>
                    setForm({
                      kind: 'products',
                      data: { ...form.data, subtitle: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="CTA metin">
                <input
                  value={form.data.ctaLabel}
                  onChange={(e) =>
                    setForm({
                      kind: 'products',
                      data: { ...form.data, ctaLabel: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="CTA URL">
                <input
                  value={form.data.ctaHref}
                  onChange={(e) =>
                    setForm({
                      kind: 'products',
                      data: { ...form.data, ctaHref: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
            </div>
          ) : null}

          {form.kind === 'workshop' ? (
            <>
              <Field label="Üst etiket">
                <input
                  value={form.data.subtitle}
                  onChange={(e) =>
                    setForm({
                      kind: 'workshop',
                      data: { ...form.data, subtitle: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <StringListEditor
                label="Başlık satırları"
                items={form.data.titleLines}
                onChange={(titleLines) =>
                  setForm({
                    kind: 'workshop',
                    data: { ...form.data, titleLines },
                  })
                }
              />
              <Field label="Açıklama">
                <textarea
                  rows={3}
                  value={form.data.description}
                  onChange={(e) =>
                    setForm({
                      kind: 'workshop',
                      data: { ...form.data, description: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <MediaUpload
                label="Atölye görseli"
                value={form.data.imageUrl}
                onChange={(imageUrl) =>
                  setForm({
                    kind: 'workshop',
                    data: { ...form.data, imageUrl },
                  })
                }
                folder="pages/home"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="CTA metin">
                  <input
                    value={form.data.ctaLabel}
                    onChange={(e) =>
                      setForm({
                        kind: 'workshop',
                        data: { ...form.data, ctaLabel: e.target.value },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="CTA URL">
                  <input
                    value={form.data.ctaHref}
                    onChange={(e) =>
                      setForm({
                        kind: 'workshop',
                        data: { ...form.data, ctaHref: e.target.value },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {form.kind === 'newsletter' ? (
            <>
              <Field label="Başlık">
                <input
                  value={form.data.title}
                  onChange={(e) =>
                    setForm({
                      kind: 'newsletter',
                      data: { ...form.data, title: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="Açıklama">
                <textarea
                  rows={3}
                  value={form.data.description}
                  onChange={(e) =>
                    setForm({
                      kind: 'newsletter',
                      data: { ...form.data, description: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
            </>
          ) : null}

          {form.kind === 'contact-header' ? (
            <>
              <Field label="Başlık">
                <input
                  value={form.data.title}
                  onChange={(e) =>
                    setForm({
                      kind: 'contact-header',
                      data: { ...form.data, title: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="Alt başlık">
                <textarea
                  rows={3}
                  value={form.data.subtitle}
                  onChange={(e) =>
                    setForm({
                      kind: 'contact-header',
                      data: { ...form.data, subtitle: e.target.value },
                    })
                  }
                  className={inputClassName()}
                />
              </Field>
            </>
          ) : null}

          {form.kind === 'generic' ? (
            <div className="space-y-3">
              {Object.entries(form.data).map(([key, value]) => (
                <Field key={key} label={key}>
                  <input
                    value={value}
                    onChange={(e) =>
                      setForm({
                        kind: 'generic',
                        data: { ...form.data, [key]: e.target.value },
                      })
                    }
                    className={inputClassName()}
                  />
                </Field>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-motion bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(null);
              }}
              className="border border-border-muted px-4 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted">Yükleniyor…</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-muted">
            Bu sayfa için içerik yok. Seed çalıştırın: yarn seed
          </p>
        ) : (
          sections.map((section) => {
            const selected = editing?.id === section.id;
            return (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => startEdit(section)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEdit(section);
                }
              }}
              className={`row-motion flex cursor-pointer items-center justify-between border px-4 py-3 ${
                selected
                  ? 'border-accent bg-accent/15 ring-1 ring-inset ring-accent/40'
                  : 'border-border-muted bg-surface hover:bg-surface-high'
              }`}
            >
              <div>
                <p className="font-medium">
                  {section.title || section.sectionKey}
                </p>
                <p className="mono text-[10px] text-muted">
                  {section.sectionKey} · sıra {section.sortOrder}
                  {selected ? ' · düzenleniyor' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(section);
                }}
                className="text-sm text-accent hover:underline"
              >
                Düzenle
              </button>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
