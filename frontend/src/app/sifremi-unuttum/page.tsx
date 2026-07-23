"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthField, AuthShell } from "@/components/AuthModal";
import { ApiError, forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "İstek gönderilemedi. Daha sonra tekrar deneyin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login" title="Şifremi unuttum" error={error}>
      {done ? (
        <div className="space-y-4">
          <p className="font-meta text-xs uppercase leading-relaxed text-secondary">
            E-posta kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutusu ve
            spam klasörünü kontrol edin.
          </p>
          <Link href="/giris" className="btn-cta inline-block px-6 py-3 text-xs">
            Girişe dön
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <p className="font-meta text-[11px] uppercase leading-relaxed text-secondary">
            Hesabınıza bağlı e-postayı girin. Bağlantı 1 saat geçerlidir.
          </p>
          <AuthField
            id="email"
            label="E-posta"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-cta w-full py-4 text-xs"
          >
            {loading ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
          </button>
          <p className="font-meta text-[11px] uppercase text-secondary">
            <Link href="/giris" className="text-primary underline">
              Girişe dön
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
