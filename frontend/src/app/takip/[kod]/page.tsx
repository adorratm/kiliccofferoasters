"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Reveal } from "@/components/Reveal";
import { StatusBadge } from "@/components/StatusBadge";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { API_BASE, trackShipment } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { shipmentStatusLabel } from "@/lib/order-status";
import type { TrackingResult } from "@/lib/types";

function normalizeResult(data: TrackingResult): TrackingResult {
  const events = (data.events || []).map((ev) => {
    const raw = ev as {
      at?: string;
      date?: string;
      description: string;
      location?: string;
    };
    return {
      at: raw.at || raw.date || "",
      description: raw.description,
      location: raw.location,
    };
  });
  return { ...data, events };
}

export default function TrackingPage() {
  const params = useParams<{ kod: string }>();
  const [code, setCode] = useState(params.kod || "");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  async function lookup(value: string) {
    setLoading(true);
    setError(null);
    const data = await trackShipment(value);
    if (!data) {
      setResult(null);
      setError("Kargo kaydı bulunamadı.");
    } else {
      setResult(normalizeResult(data));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (params.kod) {
      setCode(params.kod);
      void lookup(params.kod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.kod]);

  useEffect(() => {
    const trackingCode = (params.kod || code || "").trim();
    if (!trackingCode || trackingCode === "ornek") {
      return;
    }

    const socket = io(`${API_BASE}/tracking`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setLive(true);
      socket.emit("track:subscribe", { code: trackingCode });
    });

    socket.on("disconnect", () => setLive(false));

    socket.on("track:update", (payload: TrackingResult) => {
      setResult((prev) =>
        normalizeResult({
          code: payload.code || trackingCode,
          status: payload.status,
          provider: payload.provider || prev?.provider,
          trackingUrl: payload.trackingUrl ?? prev?.trackingUrl,
          events: payload.events?.length ? payload.events : prev?.events,
          order: payload.order || prev?.order,
        }),
      );
      setError(null);
      setLoading(false);
    });

    return () => {
      socket.emit("track:unsubscribe", { code: trackingCode });
      socket.disconnect();
      socketRef.current = null;
      setLive(false);
    };
  }, [params.kod, code]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    window.history.replaceState(
      null,
      "",
      `/takip/${encodeURIComponent(code.trim())}`,
    );
    await lookup(code.trim());
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter">
        <div className="mb-2 flex items-center gap-3 font-meta text-xs uppercase tracking-widest text-primary">
          <span>Lojistik / Takip</span>
          {live ? (
            <span className="animate-pulse-line border border-primary/40 px-2 py-0.5 text-[10px] text-primary">
              Canlı
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-4xl md:text-6xl">Kargo Takip</h1>
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
          />
          <button type="submit" className="btn-cta px-8 py-4 text-xs">
            Sorgula
          </button>
        </form>
      </Reveal>

      <Reveal className="mt-10" variant="scale" delay={120}>
        <div className="industrial-border bg-surface-container-low p-6 md:p-10">
          {loading ? (
            <p className="font-meta text-xs uppercase text-secondary">
              Sorgulanıyor…
            </p>
          ) : error ? (
            <p className="font-meta text-xs uppercase text-error">{error}</p>
          ) : result ? (
            <div className="space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-meta text-[11px] uppercase text-on-surface-variant">
                    Kod
                  </div>
                  <div className="font-display text-3xl">{result.code}</div>
                </div>
                <StatusBadge status={result.status} kind="shipment" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Meta
                  label="Durum"
                  value={shipmentStatusLabel(result.status)}
                />
                <Meta label="Sağlayıcı" value={result.provider || "—"} />
                <Meta
                  label="Sipariş"
                  value={result.order?.orderNumber || "—"}
                />
              </div>
              <div className="flex flex-wrap gap-4">
                {result.trackingUrl ? (
                  <a
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-meta text-xs uppercase text-primary underline"
                  >
                    Sağlayıcı sayfası
                  </a>
                ) : null}
                {result.order?.id && loggedIn ? (
                  <Link
                    href={`/hesabim/siparisler/${result.order.id}`}
                    className="font-meta text-xs uppercase text-primary underline"
                  >
                    Sipariş detayına git
                  </Link>
                ) : null}
                {loggedIn ? (
                  <Link
                    href="/hesabim"
                    className="font-meta text-xs uppercase text-secondary underline hover:text-primary"
                  >
                    Hesabıma dön
                  </Link>
                ) : null}
              </div>
              <div>
                <h2 className="mb-4 font-display text-2xl">Hareketler</h2>
                <TrackingTimeline events={result.events || []} />
              </div>
            </div>
          ) : null}
        </div>
      </Reveal>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-meta text-[10px] uppercase text-on-surface-variant">
        {label}
      </div>
      <div className="mt-1 font-meta text-sm uppercase text-on-surface">
        {value}
      </div>
    </div>
  );
}
