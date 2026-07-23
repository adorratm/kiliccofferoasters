'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const ADMIN_NAV = [
  { href: '/', label: 'Dashboard', code: '01' },
  { href: '/urunler', label: 'Ürünler', code: '02' },
  { href: '/kategoriler', label: 'Kategoriler', code: '03' },
  { href: '/blog', label: 'Blog', code: '04' },
  { href: '/icerik', label: 'İçerik', code: '05' },
  { href: '/site-ayarlari', label: 'Site Ayarları', code: '06' },
  { href: '/medya', label: 'Medya', code: '07' },
  { href: '/siparisler', label: 'Siparişler', code: '08' },
  { href: '/iadeler', label: 'İade Talepleri', code: '08b' },
  { href: '/kuponlar', label: 'Kuponlar', code: '09' },
  { href: '/yorumlar', label: 'Yorumlar', code: '10' },
  { href: '/kargo', label: 'Kargo', code: '11' },
  { href: '/pazaryeri', label: 'Pazaryeri', code: '12' },
  { href: '/sozlesmeler', label: 'Sözleşmeler', code: '13' },
  { href: '/mesajlar', label: 'Mesajlar', code: '14' },
  { href: '/bulten', label: 'Bülten', code: '15' },
  { href: '/kuyruklar', label: 'Kuyruklar', code: '16' },
];

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-2">
      {ADMIN_NAV.map((item, i) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

function BrandBlock() {
  return (
    <div className="border-b border-border-muted px-4 py-5">
      <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted">
        Admin // Ops
      </p>
      <p className="mt-1 text-lg font-semibold leading-tight text-foreground">
        Kılıç Coffee
      </p>
      <p className="mono text-xs text-accent">ROASTER</p>
    </div>
  );
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen, onMobileClose]);

  const drawer =
    mobileOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-80 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menü"
          >
            <button
              type="button"
              aria-label="Kapat"
              className="dialog-backdrop absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              onClick={onMobileClose}
            />
            <aside className="admin-menu-drawer relative flex h-full w-[min(100%,18rem)] flex-col border-r border-border-muted bg-surface shadow-2xl">
              <div className="flex items-start justify-between gap-2 border-b border-border-muted px-4 py-4">
                <div>
                  <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted">
                    Admin // Ops
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-tight text-foreground">
                    Kılıç Coffee
                  </p>
                  <p className="mono text-xs text-accent">ROASTER</p>
                </div>
                <button
                  type="button"
                  aria-label="Menüyü kapat"
                  onClick={onMobileClose}
                  className="mono mt-1 text-xs text-muted hover:text-accent"
                >
                  Esc
                </button>
              </div>
              <NavLinks onNavigate={onMobileClose} />
              <div className="border-t border-border-muted px-4 py-3 mono text-[10px] text-muted">
                PORT 3001 · JWT
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <aside className="sidebar-enter hidden w-56 shrink-0 flex-col border-r border-border-muted bg-surface lg:flex">
        <BrandBlock />
        <NavLinks />
        <div className="border-t border-border-muted px-4 py-3 mono text-[10px] text-muted">
          PORT 3001 · JWT
        </div>
      </aside>
      {drawer}
    </>
  );
}
