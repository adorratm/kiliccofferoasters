'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminGoogleLoginUrl } from '@/lib/api';

const ERROR_HINTS: Record<string, string> = {
  allowlist: 'Bu e-posta admin allowlist’te değil. Yetkili bir hesap kullanın.',
  denied: 'Google ile giriş iptal edildi veya reddedildi.',
};

function LoginInner() {
  const params = useSearchParams();
  const raw = params.get('error') || '';
  const error = raw
    ? /allowlist/i.test(raw)
      ? ERROR_HINTS.allowlist
      : decodeURIComponent(raw)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="page-enter w-full max-w-md border border-border-muted bg-surface p-8">
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Access Control
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          Kılıç Admin
        </h1>
        <p className="mt-2 text-sm text-muted">
          Yönetim paneline yalnızca Google OAuth ile giriş yapılabilir.
          Allowlist dışı hesaplar reddedilir.
        </p>
        {error ? (
          <p className="mt-4 border border-danger/40 bg-background px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <a
          href={adminGoogleLoginUrl()}
          className="btn-motion mt-8 flex w-full items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Google ile Giriş
        </a>
        <p className="mt-4 mono text-[10px] text-muted">
          → /auth/google/admin
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center mono text-sm text-muted">
          Yükleniyor…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
