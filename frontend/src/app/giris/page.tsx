"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthField, AuthShell } from "@/components/AuthModal";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { fetchCart } from "@/lib/cart";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      setToken(res.accessToken);
      // Misafir sepetini kullanıcı sepetine birleştir
      await fetchCart().catch(() => null);
      router.push("/hesabim");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Giriş başarısız. Bilgileri kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login" error={error}>
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
        <button type="submit" disabled={loading} className="btn-cta w-full py-4 text-xs">
          {loading ? "Doğrulanıyor…" : "Oturum Aç"}
        </button>
      </form>
    </AuthShell>
  );
}
