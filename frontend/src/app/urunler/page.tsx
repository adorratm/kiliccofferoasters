import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategories } from "@/lib/api";
import { getSiteSettings } from "@/lib/cms";
import { buildCatalogMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import ProductsCatalog from "./ProductsCatalog";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getCategories().catch(() => []),
  ]);
  const category = sp.category
    ? categories.find((c) => c.slug === sp.category)
    : undefined;

  return buildCatalogMetadata(settings, {
    categorySlug: category?.slug || sp.category,
    categoryName: category?.name,
    categoryDescription: category?.description,
    q: sp.q,
  });
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const crumbs = [
    { name: "Ana sayfa", path: "/" },
    { name: "Kavrumlar", path: "/urunler" },
  ];
  if (sp.category) {
    const categories = await getCategories().catch(() => []);
    const category = categories.find((c) => c.slug === sp.category);
    if (category) {
      crumbs.push({
        name: category.name,
        path: `/urunler?category=${encodeURIComponent(category.slug)}`,
      });
    }
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Suspense
        fallback={
          <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
            Katalog yükleniyor…
          </div>
        }
      >
        <ProductsCatalog />
      </Suspense>
    </>
  );
}
