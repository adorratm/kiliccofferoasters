"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { getCategories, getProductsPaged } from "@/lib/api";
import type { Category, Paginated, Product } from "@/lib/types";

type SortKey = "name" | "price" | "createdAt" | "stock";

export default function ProductsCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category") || "";
  const originCountry = searchParams.get("origin") || "";
  const roastLevel = searchParams.get("roast") || "";
  const sort = (searchParams.get("sort") as SortKey) || "name";
  const order = (searchParams.get("order") as "asc" | "desc") || "asc";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const [categories, setCategories] = useState<Category[]>([]);
  const [paged, setPaged] = useState<Paginated<Product>>({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [origins, setOrigins] = useState<string[]>([]);
  const [roasts, setRoasts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  const hasActiveFilters = Boolean(
    q || categorySlug || originCountry || roastLevel,
  );

  useEffect(() => {
    void getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    void getProductsPaged({ limit: 50, sort: "name", order: "asc" }).then(
      (data) => {
        const items = data.items;
        setOrigins(
          Array.from(
            new Set(
              items.map((p) => p.originCountry).filter(Boolean) as string[],
            ),
          ).sort(),
        );
        setRoasts(
          Array.from(
            new Set(
              items.map((p) => p.roastLevel).filter(Boolean) as string[],
            ),
          ).sort(),
        );
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSuggestions([]);
    void getProductsPaged({
      q: q || undefined,
      categorySlug: categorySlug || undefined,
      originCountry: originCountry || undefined,
      roastLevel: roastLevel || undefined,
      sort,
      order,
      page,
      limit: 12,
    }).then(async (data) => {
      if (cancelled) return;
      setPaged(data);

      if (!data.items.length && hasActiveFilters) {
        const featured = await getProductsPaged({
          featured: true,
          sort: "createdAt",
          order: "desc",
          limit: 6,
        });
        let suggested = featured.items.filter((p) => p.isFeatured);
        if (!suggested.length) suggested = featured.items;
        if (!suggested.length) {
          const fallback = await getProductsPaged({
            sort: "createdAt",
            order: "desc",
            limit: 6,
          });
          suggested = fallback.items;
        }
        if (!cancelled) setSuggestions(suggested.slice(0, 6));
      }

      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [q, categorySlug, originCountry, roastLevel, sort, order, page, hasActiveFilters]);

  function patchParams(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) sp.delete(key);
      else sp.set(key, value);
    }
    if (!("page" in next)) sp.delete("page");
    startTransition(() => {
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const summary = useMemo(() => {
    if (loading || pending) return "Yükleniyor…";
    return `${paged.total} ürün · sayfa ${paged.page}/${paged.totalPages}`;
  }, [loading, pending, paged]);

  return (
    <div className="page-shell py-16 md:py-24">
      <Reveal className="mb-10">
        <div className="mb-2 font-meta text-xs uppercase tracking-widest text-primary">
          Catalog / Specimens
        </div>
        <h1 className="font-display text-4xl leading-none md:text-6xl">
          Ürünler
        </h1>
        <p className="mt-4 max-w-xl font-meta text-xs uppercase tracking-widest text-secondary">
          Arama, filtre ve sıralama ile katalog
        </p>
      </Reveal>

      <Reveal
        className="mb-10 industrial-border bg-surface-container-low p-4 md:p-6"
        delay={60}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Ara">
            <input
              className="field-input"
              defaultValue={q}
              key={`q-${q}`}
              placeholder="İsim, köken, batch…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  patchParams({
                    q: (e.target as HTMLInputElement).value.trim() || null,
                  });
                }
              }}
              onBlur={(e) =>
                patchParams({ q: e.target.value.trim() || null })
              }
            />
          </Field>
          <Field label="Kategori">
            <select
              className="field-input"
              value={categorySlug}
              onChange={(e) =>
                patchParams({ category: e.target.value || null })
              }
            >
              <option value="">Tümü</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Köken">
            <select
              className="field-input"
              value={originCountry}
              onChange={(e) =>
                patchParams({ origin: e.target.value || null })
              }
            >
              <option value="">Tümü</option>
              {origins.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kavrum">
            <select
              className="field-input"
              value={roastLevel}
              onChange={(e) =>
                patchParams({ roast: e.target.value || null })
              }
            >
              <option value="">Tümü</option>
              {roasts.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Field label="Sırala" className="min-w-40 flex-1 sm:flex-none">
            <select
              className="field-input"
              value={`${sort}:${order}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(":") as [
                  SortKey,
                  "asc" | "desc",
                ];
                patchParams({ sort: s, order: o });
              }}
            >
              <option value="name:asc">İsim A→Z</option>
              <option value="name:desc">İsim Z→A</option>
              <option value="price:asc">Fiyat artan</option>
              <option value="price:desc">Fiyat azalan</option>
              <option value="createdAt:desc">En yeni</option>
              <option value="stock:desc">Stok çok→az</option>
            </select>
          </Field>
          <p className="font-meta text-[11px] uppercase text-secondary">
            {summary}
          </p>
          {q || categorySlug || originCountry || roastLevel ? (
            <button
              type="button"
              className="btn-ghost px-4 py-2 text-[10px]"
              onClick={() =>
                patchParams({
                  q: null,
                  category: null,
                  origin: null,
                  roast: null,
                  page: null,
                })
              }
            >
              Temizle
            </button>
          ) : null}
        </div>
      </Reveal>

      {!paged.items.length && !loading ? (
        <div className="space-y-10">
          <Reveal className="industrial-border bg-surface-container-low p-8 md:p-10">
            <p className="font-meta text-[11px] uppercase tracking-widest text-primary">
              No_Match
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">
              {hasActiveFilters
                ? "Aradığınız ürünü bulamadık"
                : "Katalogda ürün yok"}
            </h2>
            <p className="mt-4 max-w-xl font-meta text-xs uppercase leading-relaxed text-secondary">
              {hasActiveFilters ? (
                <>
                  {q
                    ? `"${q}" için sonuç yok.`
                    : "Seçili filtrelere uygun ürün yok."}{" "}
                  Filtreleri temizleyebilir veya aşağıdaki önerilere göz
                  atabilirsiniz.
                </>
              ) : (
                "Şu an listelenecek ürün bulunmuyor. Daha sonra tekrar deneyin."
              )}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn-ghost mt-6 px-6 py-3 text-[10px]"
                onClick={() =>
                  patchParams({
                    q: null,
                    category: null,
                    origin: null,
                    roast: null,
                    page: null,
                  })
                }
              >
                Filtreleri temizle
              </button>
            ) : null}
          </Reveal>

          {suggestions.length ? (
            <section>
              <Reveal>
                <h3 className="mb-2 font-display text-2xl md:text-3xl">
                  Bunları da inceleyebilirsiniz
                </h3>
                <p className="mb-8 font-meta text-[11px] uppercase tracking-widest text-secondary">
                  Öne çıkan ve güncel kavrumlardan seçkiler
                </p>
              </Reveal>
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((product, i) => (
                  <Reveal key={product.id} delay={Math.min(i, 5) * 60}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {paged.items.map((product, i) => (
            <Reveal key={product.id} delay={Math.min(i, 5) * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}

      {paged.totalPages > 1 ? (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            className="btn-ghost px-5 py-3 text-[10px] disabled:opacity-30"
            onClick={() => patchParams({ page: String(page - 1) })}
          >
            Önceki
          </button>
          <span className="font-meta text-[11px] uppercase text-secondary">
            {page} / {paged.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= paged.totalPages}
            className="btn-ghost px-5 py-3 text-[10px] disabled:opacity-30"
            onClick={() => patchParams({ page: String(page + 1) })}
          >
            Sonraki
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
