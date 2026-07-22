import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { PaymentCardLogos } from "@/components/PaymentCardLogos";
import type { SiteSettings } from "@/lib/cms";
import { DEFAULT_SETTINGS } from "@/lib/cms";

type Props = {
  settings?: SiteSettings;
};

export function SiteFooter({ settings = DEFAULT_SETTINGS }: Props) {
  const { brand, contact, footer, navigation } = settings;

  return (
    <footer className="cv-auto mt-auto border-t border-outline-variant/20 bg-surface-container-lowest">
      <div className="page-shell grid grid-cols-1 gap-12 py-section md:grid-cols-12 md:gap-gutter md:py-24">
        <Reveal className="md:col-span-6 flex flex-col justify-between" variant="up">
          <div>
            <div className="font-display text-4xl text-on-background opacity-10 md:text-5xl">
              {brand.name}
            </div>
            <p className="mt-6 max-w-sm font-meta text-xs uppercase leading-relaxed text-primary">
              {footer.description}
            </p>
            <p className="mt-6 max-w-md font-meta text-[11px] uppercase leading-relaxed text-secondary">
              {contact.address}
            </p>
            {contact.email ? (
              <p className="mt-3 font-meta text-[11px] uppercase text-secondary">
                <a href={`mailto:${contact.email}`} className="hover:text-primary">
                  {contact.email}
                </a>
              </p>
            ) : null}
            {contact.phone ? (
              <p className="mt-1 font-meta text-[11px] uppercase text-secondary">
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-primary">
                  {contact.phone}
                </a>
              </p>
            ) : null}
          </div>
          <p className="mt-12 font-meta text-xs uppercase text-secondary">
            © {new Date().getFullYear()} {brand.name}. {footer.copyrightSuffix}
          </p>
        </Reveal>

        <Reveal className="md:col-span-3 flex flex-col gap-3 font-meta text-xs uppercase tracking-widest" delay={80} variant="left">
          <span className="mb-2 text-primary/50">Navigasyon</span>
          {navigation.footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-secondary underline hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </Reveal>

        <Reveal className="md:col-span-3 flex flex-col gap-3 font-meta text-xs uppercase tracking-widest" delay={140} variant="right">
          <span className="mb-2 text-primary/50">Yasal</span>
          {navigation.footerLegal.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-secondary underline hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </Reveal>
      </div>
      <PaymentCardLogos />
    </footer>
  );
}
