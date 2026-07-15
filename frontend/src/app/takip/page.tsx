"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Reveal } from "@/components/Reveal";

export default function TrackingLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    router.push(`/takip/${encodeURIComponent(value)}`);
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter">
        <div className="mb-2 font-meta text-xs uppercase tracking-widest text-primary">
          Lojistik / Takip
        </div>
        <h1 className="font-display text-4xl md:text-6xl">Kargo Takip</h1>
        <p className="mt-4 max-w-lg font-meta text-xs uppercase leading-relaxed text-secondary">
          Sipariş e-postanızdaki veya hesabınızdaki takip kodunu girin. Sipariş
          numaranız mı var?{" "}
          <Link href="/siparis-sorgula" className="text-primary underline">
            Sipariş sorgula
          </Link>
        </p>
      </div>

      <Reveal className="mt-10" delay={80}>
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-4 sm:flex-row"
        >
          <input
            className="field-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Takip kodu"
            autoFocus
          />
          <button type="submit" className="btn-cta px-8 py-4 text-xs">
            Sorgula
          </button>
        </form>
      </Reveal>
    </div>
  );
}
