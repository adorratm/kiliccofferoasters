"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    iFrameResize?: (options: Record<string, unknown>, target: string) => void;
  }
}

function PaytrFrame() {
  const params = useSearchParams();
  const token = params.get("token");
  const orderNumber = params.get("orderNumber");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !token || typeof window.iFrameResize !== "function") return;
    try {
      window.iFrameResize({}, "#paytriframe");
    } catch {
      /* iframeResizer opsiyonel */
    }
  }, [ready, token]);

  if (!token) {
    return (
      <div className="page-shell py-24">
        <h1 className="font-display text-4xl">Ödeme</h1>
        <p className="mt-4 font-meta text-sm uppercase text-secondary">
          Ödeme oturumu bulunamadı.
        </p>
        <Link href="/odeme" className="btn-cta mt-8 inline-block px-8 py-4 text-xs">
          Ödemeye Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell py-12 md:py-16">
      <Script
        src="https://www.paytr.com/js/iframeResizer.min.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="mb-8">
        <div className="mb-2 font-meta text-xs uppercase tracking-widest text-primary">
          PayTR / Güvenli Ödeme
        </div>
        <h1 className="font-display text-3xl md:text-5xl">Kart ile Öde</h1>
        {orderNumber ? (
          <p className="mt-3 font-meta text-[11px] uppercase text-secondary">
            Sipariş no: {orderNumber}
          </p>
        ) : null}
        <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-secondary">
          Ödeme formu PayTR güvenli altyapısı üzerinde çalışır. Kart
          bilgileriniz sitemizde saklanmaz.
        </p>
      </div>
      <div className="overflow-hidden border border-outline-variant/20 bg-surface-container-lowest">
        <iframe
          src={`https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`}
          id="paytriframe"
          title="PayTR Güvenli Ödeme"
          frameBorder={0}
          scrolling="no"
          style={{ width: "100%", minHeight: 720 }}
        />
      </div>
      <p className="mt-6 font-meta text-[10px] uppercase tracking-wider text-secondary">
        3D Secure destekli · SSL korumalı · PCI-DSS uyumlu altyapı
      </p>
    </div>
  );
}

export default function PaytrPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell py-24 font-meta text-xs uppercase text-secondary">
          Ödeme formu yükleniyor…
        </div>
      }
    >
      <PaytrFrame />
    </Suspense>
  );
}
