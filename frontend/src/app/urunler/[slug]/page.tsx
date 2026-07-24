import Image from "next/image";
import { notFound } from "next/navigation";
import { FlavorGeometry } from "@/components/FlavorGeometry";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { ProductReviews } from "@/components/ProductReviews";
import { ProductViewTracker } from "@/components/ProductViewTracker";
import { Reveal } from "@/components/Reveal";
import { getProductBySlug } from "@/lib/api";
import { getSiteSettings } from "@/lib/cms";
import { productImage } from "@/lib/format";
import {
  JsonLd,
  breadcrumbJsonLd,
  buildProductMetadata,
  productJsonLd,
} from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

type RoastPhase = {
  phase: string;
  duration: string;
  target: string;
  airflow: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);
  if (!product) return { title: "Ürün" };
  return buildProductMetadata(product, settings);
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);

  if (!product) notFound();

  const images =
    product.gallery?.length > 0
      ? product.gallery
      : [productImage(product.imageUrl, product.slug)];

  const roastLog = (product.roastLog || {}) as Record<string, unknown>;
  const roastTime = hasText(roastLog.roastTime) ? roastLog.roastTime : null;
  const dropTemp = hasText(roastLog.dropTemp) ? roastLog.dropTemp : null;
  const phases = (
    Array.isArray(roastLog.phases) ? (roastLog.phases as RoastPhase[]) : []
  ).filter(
    (row) =>
      hasText(row.phase) ||
      hasText(row.duration) ||
      hasText(row.target) ||
      hasText(row.airflow),
  );

  const specs = [
    ["Altitude", product.altitude],
    ["Process", product.process],
    ["Varietal", product.varietal],
    ["Roast Profile", product.roastLevel],
    ["Origin", product.originRegion || product.originCountry],
    ["Notes", product.flavorNotes?.filter(Boolean).join(", ")],
  ].filter(([, value]) => hasText(value));

  const showRoastMetrics = Boolean(roastTime || dropTemp);
  const showRoastTable = phases.length > 0;
  const showRoastSection =
    Boolean(product.description) || showRoastMetrics || showRoastTable;

  return (
    <div>
      <ProductViewTracker
        id={product.id}
        name={product.name}
        price={Number(
          product.salePrice ?? product.basePrice ?? 0,
        )}
        currency={product.currency || "TRY"}
      />
      <JsonLd data={productJsonLd(product, settings)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana sayfa", path: "/" },
          { name: "Kavrumlar", path: "/urunler" },
          { name: product.name, path: `/urunler/${product.slug}` },
        ])}
      />
      <section className="grid grid-cols-1 border-b border-outline-variant/20 lg:grid-cols-12">
        <Reveal
          className="relative min-h-130 overflow-hidden border-r border-outline-variant/20 bg-surface lg:col-span-7 lg:min-h-217.5"
          variant="fade"
        >
          {product.batchId ? (
            <div className="absolute left-8 top-8 z-10">
              <span className="border border-primary bg-surface/80 px-3 py-1 font-meta text-xs text-primary">
                BATCH_ID: {product.batchId}
              </span>
            </div>
          ) : null}
          <Image
            src={images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 58vw"
            priority
          />
          <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-black/80 to-transparent p-8">
            <h1 className="font-display text-5xl leading-none tracking-tighter md:text-7xl">
              {product.name}
            </h1>
          </div>
        </Reveal>

        <Reveal
          className="flex flex-col justify-between bg-surface p-8 lg:col-span-5 lg:p-12"
          variant="right"
          delay={100}
        >
          <div>
            <div className="mb-10 flex items-start justify-between gap-6">
              <div>
                <div className="mb-2 font-meta text-sm uppercase tracking-widest text-primary">
                  Configure / Buy
                </div>
                <p className="font-meta text-xs uppercase text-on-surface-variant">
                  Ağırlık · öğütme · stok
                </p>
                {(product.ratingCount ?? 0) > 0 ? (
                  <p className="mt-2 font-meta text-xs uppercase tracking-widest text-primary">
                    {Number(product.ratingAvg || 0).toFixed(1)} / 5 ·{" "}
                    {product.ratingCount} yorum
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mb-10 space-y-8">
              {specs.length > 0 ? (
                <div className="industrial-border relative p-6">
                  <div className="absolute -top-3 left-4 bg-surface px-2 font-meta text-[10px] uppercase text-on-surface-variant">
                    Technical Specs
                  </div>
                  <div className="grid grid-cols-2 gap-y-6">
                    {specs.map(([label, value]) => (
                      <div key={label as string}>
                        <p className="font-meta text-[10px] uppercase text-on-surface-variant">
                          {label}
                        </p>
                        <p className="font-meta text-lg uppercase text-on-surface">
                          {value as string}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <FlavorGeometry values={product.flavorGeometry} />
            </div>
          </div>

          <div>
            <ProductBuyBox product={product} />
            <div className="mt-4 flex justify-between font-meta text-[10px] uppercase tracking-widest text-on-surface-variant">
              <span>Secure_Protocol_V3</span>
              <span>Global_Logistics_Enabled</span>
            </div>
          </div>
        </Reveal>
      </section>

      {showRoastSection ? (
        <section className="cv-auto page-shell border-b border-outline-variant/20 py-section">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-4" variant="left">
              <h2 className="mb-6 font-display text-4xl uppercase">
                The Roaster&apos;s Log
              </h2>
              {product.description ? (
                <p className="max-w-sm font-sans text-lg leading-relaxed text-on-surface-variant">
                  {product.description}
                </p>
              ) : null}
              {showRoastMetrics ? (
                <div className="mt-8 flex gap-4">
                  {roastTime ? (
                    <div className="industrial-border w-32 p-4 text-center">
                      <span className="block font-display text-2xl">
                        {roastTime}
                      </span>
                      <span className="font-meta text-[10px] uppercase text-on-surface-variant">
                        Roast Time
                      </span>
                    </div>
                  ) : null}
                  {dropTemp ? (
                    <div className="industrial-border w-32 p-4 text-center">
                      <span className="block font-display text-2xl">
                        {dropTemp}
                      </span>
                      <span className="font-meta text-[10px] uppercase text-on-surface-variant">
                        Drop Temp
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Reveal>
            {showRoastTable ? (
              <Reveal className="lg:col-span-8" variant="right" delay={90}>
                <div className="industrial-border overflow-hidden bg-surface-container">
                  <table className="w-full text-left font-meta text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/20 bg-surface-container-high">
                        <th className="p-4 uppercase tracking-wider">Phase</th>
                        <th className="p-4 uppercase tracking-wider">Duration</th>
                        <th className="p-4 uppercase tracking-wider">
                          Target ΔT
                        </th>
                        <th className="p-4 uppercase tracking-wider">
                          Airflow %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-secondary">
                      {phases.map((row, index) => (
                        <tr
                          key={`${row.phase}-${index}`}
                          className="border-b border-outline-variant/10"
                        >
                          <td className="p-4 uppercase">{row.phase}</td>
                          <td className="p-4 uppercase">{row.duration}</td>
                          <td className="p-4 uppercase">{row.target}</td>
                          <td className="p-4 uppercase">{row.airflow}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      <ProductReviews
        productId={product.id}
        slug={product.slug}
        ratingAvg={product.ratingAvg}
        ratingCount={product.ratingCount}
      />
    </div>
  );
}
