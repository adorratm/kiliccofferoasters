'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard', code: '01' },
  { href: '/urunler', label: 'Ürünler', code: '02' },
  { href: '/kategoriler', label: 'Kategoriler', code: '03' },
  { href: '/blog', label: 'Blog', code: '04' },
  { href: '/icerik', label: 'İçerik', code: '05' },
  { href: '/site-ayarlari', label: 'Site Ayarları', code: '06' },
  { href: '/medya', label: 'Medya', code: '07' },
  { href: '/siparisler', label: 'Siparişler', code: '08' },
  { href: '/kuponlar', label: 'Kuponlar', code: '09' },
  { href: '/yorumlar', label: 'Yorumlar', code: '10' },
  { href: '/kargo', label: 'Kargo', code: '11' },
  { href: '/pazaryeri', label: 'Pazaryeri', code: '12' },
  { href: '/sozlesmeler', label: 'Sözleşmeler', code: '13' },
  { href: '/mesajlar', label: 'Mesajlar', code: '14' },
  { href: '/bulten', label: 'Bülten', code: '15' },
  { href: '/kuyruklar', label: 'Kuyruklar', code: '16' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-enter flex w-56 shrink-0 flex-col border-r border-border-muted bg-surface">
      <div className="border-b border-border-muted px-4 py-5">
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Admin // Ops
        </p>
        <p className="mt-1 text-lg font-semibold leading-tight text-foreground">
          Kılıç Coffee
        </p>
        <p className="mono text-xs text-accent">ROASTERS</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map((item, i) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ animationDelay: `${40 + i * 28}ms` }}
              className={`nav-item-motion flex items-center gap-3 px-3 py-2.5 text-sm animate-fade-up ${
                active
                  ? 'bg-accent text-white'
                  : 'text-foreground/80 hover:bg-surface-high hover:text-foreground'
              }`}
            >
              <span className="mono text-[10px] opacity-70">{item.code}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-muted px-4 py-3 mono text-[10px] text-muted">
        PORT 3001 · JWT
      </div>
    </aside>
  );
}
