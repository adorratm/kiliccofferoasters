import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { getProducts } from "@/lib/api";
import {
  cmsImageUrl,
  getContentSections,
  getSiteSettings,
  sectionContent,
} from "@/lib/cms";

type HeroContent = {
  imageUrl: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  sidebar: { label: string; value: string }[];
};

type EthosContent = {
  titleLines: string[];
  description: string;
  stats: { label: string; value: string }[];
  imageUrl: string;
  telemetry: {
    profile: string;
    feed: string;
    metrics: { label: string; value: string }[];
  };
};

type ProductsContent = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

type WorkshopContent = {
  subtitle: string;
  titleLines: string[];
  description: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
};

type NewsletterContent = {
  title: string;
  description: string;
};

const FALLBACK_HERO: HeroContent = {
  imageUrl:
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=2000&q=80",
  eyebrow: "EST. 2026 / TORBALI · İZMİR",
  titleLine1: "Kılıç Coffee",
  titleLine2: "Roaster",
  description:
    "Engineered Precision. Artisanal Depth. Seçkin profesyoneller için yüksek teknolojili kavrum.",
  ctaPrimary: { label: "Koleksiyonu Keşfet", href: "/urunler" },
  ctaSecondary: { label: "Ethos", href: "#ethos" },
  sidebar: [
    { label: "System_Status", value: "Optimal" },
    { label: "Latency", value: "14ms" },
    { label: "Grid", value: "Torbalı / İzmir" },
  ],
};

export default async function HomePage() {
  const [sections, settings, apiProducts] = await Promise.all([
    getContentSections("home"),
    getSiteSettings(),
    getProducts({ featured: true }),
  ]);

  const hero = sectionContent(sections, "hero", FALLBACK_HERO);
  const ethos = sectionContent(sections, "ethos", {
    titleLines: ["The", "Roasting", "Ethos"],
    description:
      "Metodolojimiz veriye dayanır. Her batch için termal eğri boyunca tutarlılığı garanti etmek üzere onlarca değişken izleriz.",
    stats: [
      { label: "Drum Speed", value: "54 RPM" },
      { label: "Airflow", value: "82%" },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80",
    telemetry: {
      profile: "KRC-74-Alpha",
      feed: "Live_Feed: Active",
      metrics: [
        { label: "Temp_Internal", value: "204.5°C" },
        { label: "RoR_Phase", value: "+8.2" },
        { label: "Exhaust_Temp", value: "188.1°C" },
        { label: "Fuel_Stability", value: "99.8%" },
      ],
    },
  } satisfies EthosContent);

  const productsSection = sectionContent(sections, "products", {
    title: "Curated Specimens",
    subtitle: "Seçilmiş hasat // veriye göre filtrele",
    ctaLabel: "Tümünü Gör",
    ctaHref: "/urunler",
  } satisfies ProductsContent);

  const workshop = sectionContent(sections, "workshop", {
    subtitle: "Physical Node",
    titleLines: ["Visit The", "Workshop"],
    description:
      "Hassasiyeti deneyimleyin. Torbalı merkezimizde tadım laboratuvarı ve endüstriyel kavrum hattı bir arada.",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
    ctaLabel: "İletişime Geç",
    ctaHref: "/iletisim",
  } satisfies WorkshopContent);

  const newsletter = sectionContent(sections, "newsletter", {
    title: "System Notifications",
    description: "Drop uyarıları ve teknik loglar için ağa katılın",
  } satisfies NewsletterContent);

  const featuredPool = apiProducts.filter((p) => p.isFeatured);
  const featured = (featuredPool.length ? featuredPool : apiProducts).slice(
    0,
    3,
  );
  const { contact } = settings;

  return (
    <>
      <section className="relative flex h-[90vh] flex-col items-center justify-center overflow-hidden border-b border-outline-variant">
        <div className="absolute inset-0 z-0">
          <Image
            src={cmsImageUrl(hero.imageUrl, FALLBACK_HERO.imageUrl)}
            alt={settings.brand.name}
            fill
            priority
            fetchPriority="high"
            className="object-cover opacity-80 brightness-50 grayscale"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="page-shell relative z-10 flex w-full flex-col items-start hero-enter">
          <div className="mb-4 font-meta text-[11px] tracking-[0.3em] text-primary">
            {hero.eyebrow}
          </div>
          <h1 className="font-display flex flex-col text-5xl leading-[0.85] md:text-[80px] md:leading-[0.85]">
            <span className="block">{hero.titleLine1}</span>
            <span className="text-outline ml-8 block md:ml-32">{hero.titleLine2}</span>
          </h1>
          <p className="mt-8 max-w-xl border-l-2 border-primary-container py-2 pl-6 font-meta text-xs uppercase leading-relaxed text-secondary md:text-sm">
            {hero.description}
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Link href={hero.ctaPrimary.href} className="btn-cta px-10 py-4 text-sm">
              {hero.ctaPrimary.label}
            </Link>
            <a href={hero.ctaSecondary.href} className="btn-ghost px-10 py-4 text-sm">
              {hero.ctaSecondary.label}
            </a>
          </div>
        </div>

        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-8 pr-8 font-meta text-[10px] uppercase tracking-tighter text-primary/40 lg:flex">
          {hero.sidebar.map((item, i) => (
            <div
              key={item.label}
              className={`origin-right translate-y-12 rotate-90 ${i === 0 ? "animate-pulse-line" : ""}`}
            >
              {item.label}: {item.value}
            </div>
          ))}
        </div>
      </section>

      <section
        id="ethos"
        className="cv-auto relative overflow-hidden border-b border-outline-variant bg-surface-container-lowest py-section"
      >
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
          <div className="scanline" />
        </div>
        <div className="page-shell relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-gutter">
          <Reveal className="lg:col-span-4">
            <h2 className="mb-8 font-display text-4xl leading-none md:text-5xl">
              {ethos.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="max-w-sm font-sans text-lg leading-7 text-secondary">
              {ethos.description}
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4">
              {ethos.stats.map((stat) => (
                <div key={stat.label} className="border border-outline-variant/30 p-4">
                  <div className="font-meta text-[10px] uppercase text-primary/60">
                    {stat.label}
                  </div>
                  <div className="font-meta text-2xl text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="relative h-105 overflow-hidden border border-primary/20 bg-surface grid-overlay lg:col-span-8 lg:h-125" delay={90}>
            <Image
              src={cmsImageUrl(ethos.imageUrl, FALLBACK_HERO.imageUrl)}
              alt="Kavurma telemetrisi"
              fill
              loading="lazy"
              className="object-cover opacity-30 mix-blend-luminosity"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
              <div className="flex justify-between font-meta text-xs text-primary">
                <div>Profile: {ethos.telemetry.profile}</div>
                <div>{ethos.telemetry.feed}</div>
              </div>
              <div className="relative h-40 border-b border-primary/40 md:h-48">
                <svg
                  className="h-full w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 1000 200"
                  aria-hidden
                >
                  <path
                    d="M0 180 Q 250 160, 400 100 T 700 50 T 1000 20"
                    fill="none"
                    stroke="#ffb4a2"
                    strokeWidth="2"
                  />
                  <path
                    d="M0 180 Q 250 170, 450 140 T 800 110 T 1000 100"
                    fill="none"
                    opacity="0.5"
                    stroke="#ffb4a2"
                    strokeDasharray="4"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 font-meta text-[10px] md:grid-cols-4">
                {ethos.telemetry.metrics.map((metric) => (
                  <div key={metric.label} className="border-t border-primary/20 pt-2">
                    <span className="mb-1 block text-primary/40">{metric.label}</span>
                    <span className="text-lg text-primary">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="cv-auto page-shell py-section">
        <Reveal className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="mb-4 font-display text-4xl md:text-5xl">
              {productsSection.title}
            </h2>
            <p className="font-meta text-sm uppercase tracking-widest text-secondary-container">
              {productsSection.subtitle}
            </p>
          </div>
          <Link
            href={productsSection.ctaHref}
            className="border border-primary px-4 py-2 font-meta text-sm text-primary transition-colors hover:bg-primary hover:text-background"
          >
            {productsSection.ctaLabel}
          </Link>
        </Reveal>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {featured.map((product, i) => (
            <Reveal
              key={product.id}
              delay={i * 90}
              variant={i === 1 ? "scale" : i % 2 ? "right" : "left"}
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="cv-auto overflow-hidden border-y border-outline-variant/30 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Reveal className="page-shell flex flex-col justify-center border-r border-outline-variant/20 py-16 lg:py-24">
            <span className="mb-6 font-meta text-sm uppercase tracking-widest text-primary">
              {workshop.subtitle}
            </span>
            <h2 className="mb-8 font-display text-4xl leading-none md:text-5xl">
              {workshop.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mb-12 max-w-md font-sans text-lg leading-7 text-secondary">
              {workshop.description}
            </p>
            <div className="space-y-6 font-meta text-sm uppercase">
              {contact.address ? (
                <div className="flex flex-col justify-between gap-2 border-b border-outline-variant/20 pb-4 md:flex-row">
                  <span className="text-secondary/60">Adres</span>
                  <span className="max-w-md text-right md:text-left">{contact.address}</span>
                </div>
              ) : null}
              {contact.locationLabel ? (
                <div className="flex justify-between border-b border-outline-variant/20 pb-4">
                  <span className="text-secondary/60">Konum</span>
                  <span className="text-primary">{contact.locationLabel}</span>
                </div>
              ) : null}
              {contact.hours ? (
                <div className="flex justify-between border-b border-outline-variant/20 pb-4">
                  <span className="text-secondary/60">Çalışma</span>
                  <span>{contact.hours}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-12">
              <Link
                href={workshop.ctaHref}
                className="inline-flex items-center gap-4 border-2 border-primary px-10 py-5 font-meta uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-background"
              >
                {workshop.ctaLabel}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>
          <Reveal className="relative h-105 lg:h-auto lg:min-h-150" delay={100}>
            <Image
              src={cmsImageUrl(workshop.imageUrl, FALLBACK_HERO.imageUrl)}
              alt="Atölye"
              fill
              loading="lazy"
              className="object-cover brightness-75 grayscale"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </section>

      <section className="cv-auto page-shell bg-surface-container-low py-section text-center">
        <Reveal className="relative mx-auto max-w-4xl overflow-hidden border border-primary/20 p-8 md:p-16">
          <div className="absolute left-0 top-0 h-8 w-px bg-primary" />
          <div className="absolute left-0 top-0 h-px w-8 bg-primary" />
          <div className="absolute bottom-0 right-0 h-8 w-px bg-primary" />
          <div className="absolute bottom-0 right-0 h-px w-8 bg-primary" />
          <h3 className="mb-4 font-display text-3xl">{newsletter.title}</h3>
          <p className="mb-10 font-meta text-xs uppercase tracking-widest text-secondary md:text-sm">
            {newsletter.description}
          </p>
          <div className="relative">
            <NewsletterForm />
          </div>
        </Reveal>
      </section>
    </>
  );
}
