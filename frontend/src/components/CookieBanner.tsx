"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logCookieConsent } from "@/lib/api";
import { getCartSessionId } from "@/lib/cart";
import {
  COOKIE_CONSENT_KEY,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!existing) setVisible(true);
  }, []);

  async function save(nextAnalytics: boolean, nextMarketing: boolean) {
    const payload = {
      necessary: true,
      analytics: nextAnalytics,
      marketing: nextMarketing,
      sessionId: getCartSessionId(),
    };
    writeCookieConsent(payload);
    setVisible(false);
    setCustomize(false);
    await logCookieConsent(payload);
  }

  function openCustomize() {
    const current = readCookieConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    setCustomize(true);
  }

  if (!visible) return null;

  return (
    <div className="banner-enter fixed bottom-0 left-0 right-0 z-60 border-t border-outline-variant/30 bg-surface-container-lowest">
      <div className="page-shell flex flex-col gap-4 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <p className="max-w-2xl font-meta text-[11px] uppercase leading-relaxed text-secondary">
            Bu site, oturum ve yasal zorunluluklar için gerekli çerezleri kullanır.
            Analitik ve pazarlama çerezlerini ayrı ayrı seçebilirsiniz. Ayrıntılar
            için{" "}
            <Link href="/cerez-politikasi" className="text-primary underline">
              çerez politikası
            </Link>
            .
          </p>
          {!customize ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void save(false, false)}
                className="btn-ghost px-5 py-3 text-xs"
              >
                Yalnızca gerekli
              </button>
              <button
                type="button"
                onClick={openCustomize}
                className="border border-outline-variant/40 px-5 py-3 font-meta text-xs uppercase tracking-widest text-secondary hover:border-primary hover:text-primary"
              >
                Özelleştir
              </button>
              <button
                type="button"
                onClick={() => void save(true, true)}
                className="btn-cta px-5 py-3 text-xs"
              >
                Tümünü kabul et
              </button>
            </div>
          ) : null}
        </div>

        {customize ? (
          <div className="flex flex-col gap-4 border-t border-outline-variant/20 pt-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-6 font-meta text-[11px] uppercase text-secondary">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled className="accent-primary" />
                Gerekli
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="accent-primary"
                />
                Analitik (GA4 / GTM)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="accent-primary"
                />
                Pazarlama (Meta Pixel)
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCustomize(false)}
                className="btn-ghost px-5 py-3 text-xs"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => void save(analytics, marketing)}
                className="btn-cta px-5 py-3 text-xs"
              >
                Seçimi kaydet
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
