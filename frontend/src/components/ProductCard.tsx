import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatMoney, productImage } from "@/lib/format";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const img = productImage(product.imageUrl, product.slug);
  const price = product.variants?.[0]?.price ?? product.basePrice;
  const specs = [
    { label: "Rakım", value: product.altitude },
    { label: "İşlem", value: product.process },
    { label: "Batch", value: product.batchId },
    { label: "Çeşit", value: product.varietal },
  ].filter((s) => Boolean(s.value?.trim()));

  return (
    <article className="group relative card-motion border border-outline-variant/20 bg-surface-container-low p-6 hover:border-primary">
      <div className="absolute left-10 top-10 z-10">
        <FavoriteButton productId={product.id} />
      </div>
      <Link href={`/urunler/${product.slug}`} className="block">
        <div className="relative mb-6 aspect-4/5 overflow-hidden bg-surface-dim">
          <Image
            src={img}
            alt={product.name}
            fill
            className="media-lift object-cover grayscale"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {product.badge ? (
            <div className="absolute right-4 top-4 bg-cta px-2 py-1 font-meta text-[10px] uppercase text-on-cta">
              {product.badge}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-2xl uppercase leading-none">
              {product.name}
            </h3>
            <span className="shrink-0 font-meta text-sm text-primary">
              {formatMoney(price, product.currency)}
            </span>
          </div>

          {specs.length > 0 ? (
            <div className="grid grid-cols-2 gap-y-2 border-t border-outline-variant/30 pt-4 font-meta text-[11px] uppercase text-secondary">
              {specs.map((s) => (
                <div key={s.label} className="contents">
                  <div>{s.label}</div>
                  <div className="text-on-background">{s.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          <span className="mt-2 block w-full border border-primary py-4 text-center font-meta text-xs uppercase tracking-widest text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-background">
            İncele / Satın Al
          </span>
        </div>
      </Link>
    </article>
  );
}
