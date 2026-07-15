"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import { fetchCart } from "@/lib/cart";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
      void fetchCart()
        .catch(() => null)
        .finally(() => router.replace("/hesabim"));
      return;
    }
    router.replace("/giris");
  }, [params, router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 font-mono text-sm tracking-widest text-on-surface-variant animate-fade-up">
      OTURUM_DOGRULANIYOR...
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center font-mono text-sm">
          YUKLENIYOR...
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
