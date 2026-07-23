"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthField, AuthShell } from "@/components/AuthModal";
import { login } from "@/lib/api";
import {
  isAuthenticated,
  rememberAuthNext,
  safeNextPath,
  setToken,
} from "@/lib/auth";
import { fetchCart } from "@/lib/cart";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), "/hesabim");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    rememberAuthNext(next);
    if (isAuthenticated()) {
      router.replace(next);
    }
  }, [next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      setToken(res.accessToken);
      await fetchCart().catch(() => null);
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Giriş başarısız. Bilgileri kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login" error={error} nextPath={next}>
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthField
          id="email"
          label="E-posta"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          id="password"
          label="Şifre"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <div className="-mt-2 text-right">
          <Link
            href="/sifremi-unuttum"
            className="font-meta text-[10px] uppercase tracking-widest text-secondary hover:text-primary"
          >
            Şifremi unuttum
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-cta w-full py-4 text-xs"
        >
          {loading ? "Doğrulanıyor…" : "Oturum Aç"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="page-shell py-16 font-meta text-xs uppercase text-secondary">
          Yükleniyor…
        </p>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
