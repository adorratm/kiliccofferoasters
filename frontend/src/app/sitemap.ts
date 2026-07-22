import type { MetadataRoute } from "next";
import { getBlogSlugs, getCategories, getProductsPaged } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";
import type { Product } from "@/lib/types";

const STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/urunler", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.85 },
  { path: "/iletisim", changeFrequency: "monthly", priority: 0.7 },
  { path: "/takip", changeFrequency: "monthly", priority: 0.5 },
  { path: "/kvkk", changeFrequency: "yearly", priority: 0.3 },
  { path: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cerez-politikasi", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mesafeli-satis", changeFrequency: "yearly", priority: 0.3 },
  { path: "/on-bilgilendirme", changeFrequency: "yearly", priority: 0.3 },
  { path: "/iptal-iade", changeFrequency: "yearly", priority: 0.3 },
  { path: "/musteri-memnuniyeti", changeFrequency: "yearly", priority: 0.3 },
  { path: "/guvenli-alisveris", changeFrequency: "yearly", priority: 0.3 },
  { path: "/aydinlatma-metni", changeFrequency: "yearly", priority: 0.3 },
];

async function fetchAllProducts(): Promise<Product[]> {
  const limit = 100;
  const first = await getProductsPaged({ page: 1, limit }).catch(() => null);
  if (!first?.items?.length) return [];
  const pages = Math.max(1, first.totalPages || 1);
  if (pages === 1) return first.items;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      getProductsPaged({ page: i + 2, limit }).catch(() => ({
        items: [] as Product[],
      })),
    ),
  );
  return [...first.items, ...rest.flatMap((p) => p.items)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, blogSlugs, categories] = await Promise.all([
    fetchAllProducts(),
    getBlogSlugs().catch(() => []),
    getCategories().catch(() => []),
  ]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/urunler?category=${encodeURIComponent(cat.slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/urunler/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt
      ? new Date(post.updatedAt)
      : post.publishedAt
        ? new Date(post.publishedAt)
        : now,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...blogEntries,
  ];
}
