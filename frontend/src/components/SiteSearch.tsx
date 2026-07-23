"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { globalSearch } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";

const SEE_ALL: Record<string, (q: string) => string> = {
  products: (q) => `/urunler?q=${encodeURIComponent(q)}`,
  blog: () => "/blog",
  legal: () => "/kvkk",
};

function shortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+K";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
    ? "⌘K"
    : "Ctrl+K";
}

type Props = {
  className?: string;
};

export function SiteSearch({ className = "" }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState("Ctrl+K");

  useEffect(() => {
    setMounted(true);
    setHint(shortcutLabel());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      void globalSearch(q.trim(), 8)
        .then(setResult)
        .catch(() => setResult({ q, groups: [] }))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const flatHits = useMemo(() => {
    return (result?.groups ?? []).flatMap((g) => g.items);
  }, [result]);

  useEffect(() => {
    setActive(0);
  }, [result]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-search-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
    setQ("");
    setResult(null);
    setActive(0);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  function goCatalog() {
    const term = q.trim();
    go(term ? `/urunler?q=${encodeURIComponent(term)}` : "/urunler");
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!flatHits.length) return;
      setActive((i) => (i + 1) % flatHits.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!flatHits.length) return;
      setActive((i) => (i - 1 + flatHits.length) % flatHits.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (flatHits[active]) {
        go(flatHits[active].href);
        return;
      }
      goCatalog();
    }
  }

  const groups = result?.groups ?? [];
  const hasHits = flatHits.length > 0;
  let hitIndex = -1;

  const palette =
    open && mounted
      ? createPortal(
          <div className="search-palette fixed inset-0 z-100 flex items-start justify-center px-3 pt-[10vh] sm:px-4">
            <button
              type="button"
              aria-label="Kapat"
              className="absolute inset-0 bg-deep-carbon/85 backdrop-blur-[3px]"
              onClick={close}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Site arama"
              className="search-palette-panel relative flex w-full max-w-xl flex-col overflow-hidden border border-outline-variant/40 bg-surface-container-high shadow-2xl"
            >
              <div className="flex items-center border-b border-outline-variant/30">
                <span className="pl-4 text-primary">
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Kavrum, blog, sayfa…"
                  className="w-full bg-transparent px-3 py-4 font-meta text-sm uppercase tracking-wide text-on-surface outline-none placeholder:text-secondary"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="mr-3 shrink-0 border border-outline-variant/40 px-1.5 py-0.5 font-meta text-[10px] text-secondary">
                  Esc
                </kbd>
              </div>

              <div
                ref={listRef}
                className="max-h-[min(55vh,22rem)] overflow-auto"
              >
                {q.trim().length < 2 ? (
                  <div className="space-y-3 px-4 py-6">
                    <p className="font-meta text-[10px] uppercase tracking-widest text-secondary">
                      En az 2 karakter · ok tuşları + Enter
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <QuickChip
                        label="Kavrumlar"
                        onClick={() => go("/urunler")}
                      />
                      <QuickChip label="Blog" onClick={() => go("/blog")} />
                      <QuickChip
                        label="Sipariş sorgula"
                        onClick={() => go("/siparis-sorgula")}
                      />
                    </div>
                  </div>
                ) : loading ? (
                  <p className="px-4 py-6 font-meta text-[10px] uppercase tracking-widest text-secondary">
                    Aranıyor…
                  </p>
                ) : !hasHits ? (
                  <div className="space-y-3 px-4 py-6">
                    <p className="font-meta text-[10px] uppercase tracking-widest text-secondary">
                      Sonuç yok
                    </p>
                    <button
                      type="button"
                      onClick={goCatalog}
                      className="font-meta text-xs uppercase tracking-widest text-primary hover:underline"
                    >
                      Katalogda “{q.trim()}” ara →
                    </button>
                  </div>
                ) : (
                  groups.map((group) => {
                    const seeAll = SEE_ALL[group.type];
                    return (
                      <div
                        key={group.type}
                        className="border-b border-outline-variant/20 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2 px-4 py-2">
                          <p className="font-meta text-[10px] uppercase tracking-widest text-primary/70">
                            {group.label}
                          </p>
                          {seeAll ? (
                            <button
                              type="button"
                              onClick={() => go(seeAll(q.trim()))}
                              className="font-meta text-[10px] uppercase tracking-widest text-secondary hover:text-primary"
                            >
                              Tümünü gör
                            </button>
                          ) : null}
                        </div>
                        <ul>
                          {group.items.map((hit) => {
                            hitIndex += 1;
                            const idx = hitIndex;
                            const isActive = idx === active;
                            return (
                              <li key={`${hit.type}-${hit.id}`}>
                                <Link
                                  href={hit.href}
                                  data-search-index={idx}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    go(hit.href);
                                  }}
                                  onMouseEnter={() => setActive(idx)}
                                  className={`block px-4 py-2.5 transition-colors ${
                                    isActive
                                      ? "bg-surface-container-highest text-on-surface"
                                      : "hover:bg-surface-container"
                                  }`}
                                >
                                  <div className="font-meta text-xs uppercase tracking-wide">
                                    {hit.title}
                                  </div>
                                  {hit.subtitle ? (
                                    <div className="mt-0.5 font-meta text-[10px] uppercase text-secondary">
                                      {hit.subtitle}
                                    </div>
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>

              {q.trim().length >= 2 ? (
                <div className="flex flex-wrap gap-2 border-t border-outline-variant/30 px-3 py-2.5">
                  <QuickChip label="Kataloğa git" onClick={goCatalog} />
                  <QuickChip label="Blog" onClick={() => go("/blog")} />
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-primary transition-opacity hover:opacity-80 sm:flex sm:items-center sm:gap-2 sm:border sm:border-outline-variant/40 sm:bg-surface-container-lowest sm:px-3 sm:py-2 sm:font-meta sm:text-[11px] sm:uppercase sm:tracking-widest sm:text-secondary sm:hover:border-primary/50 sm:hover:text-primary ${className}`}
        aria-label="Ara"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Ara</span>
        <span className="ml-1 hidden font-meta text-[10px] text-secondary/70 sm:inline">
          {hint}
        </span>
      </button>
      {palette}
    </>
  );
}

function QuickChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-outline-variant/40 px-2.5 py-1 font-meta text-[10px] uppercase tracking-widest text-secondary hover:border-primary hover:text-primary"
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
