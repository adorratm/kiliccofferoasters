'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = params.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      const t = setTimeout(
        () =>
          router.replace(
            `/login?error=${encodeURIComponent(oauthError)}`,
          ),
        1500,
      );
      return () => clearTimeout(t);
    }

    const token =
      params.get('token') ||
      params.get('access_token') ||
      params.get('jwt');

    if (!token) {
      setError('Token bulunamadı. Giriş sayfasına yönlendiriliyorsunuz…');
      const t = setTimeout(() => router.replace('/login'), 2000);
      return () => clearTimeout(t);
    }

    setToken(token);
    router.replace('/');
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="border border-border-muted bg-surface px-8 py-6 text-center">
        <p className="mono text-xs text-muted">AUTH CALLBACK</p>
        <p className="mt-2 text-sm text-foreground">
          {error || 'Oturum açılıyor…'}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background mono text-sm text-muted">
          Yükleniyor…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
