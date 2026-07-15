'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AdminSearch } from '@/components/AdminSearch';
import { clearToken } from '@/lib/auth';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/urunler': 'Ürünler',
  '/kategoriler': 'Kategoriler',
  '/blog': 'Blog',
  '/icerik': 'İçerik',
  '/site-ayarlari': 'Site Ayarları',
  '/medya': 'Medya',
  '/siparisler': 'Siparişler',
  '/kuponlar': 'Kuponlar',
  '/yorumlar': 'Ürün Yorumları',
  '/kargo': 'Kargo Ayarları',
  '/pazaryeri': 'Pazaryeri',
  '/sozlesmeler': 'Sözleşmeler',
  '/mesajlar': 'Mesajlar',
  '/bulten': 'Bülten Aboneleri',
  '/kuyruklar': 'Kuyruklar',
};

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = Object.keys(TITLES)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (base === '/siparisler') return 'Sipariş Detayı';
  if (base === '/urunler') return 'Ürün Düzenle';
  return TITLES[base] || 'Admin';
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = resolveTitle(pathname);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-muted bg-background px-6">
      <div key={pathname} className="page-enter shrink-0">
        <h1 className="text-base font-medium text-foreground">{title}</h1>
        <p className="mono text-[10px] uppercase tracking-widest text-muted">
          {pathname}
        </p>
      </div>
      <AdminSearch />
      <button
        type="button"
        onClick={logout}
        className="btn-motion shrink-0 border border-border-muted px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
      >
        Çıkış
      </button>
    </header>
  );
}
