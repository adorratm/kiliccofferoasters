import type { MetadataRoute } from "next";
import { getBlogSlugs, getProducts } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/urunler",
  "/blog",
  "/iletisim",
  "/giris",
  "/kayit",
  "/kvkk",
  "/gizlilik",
  "/cerez-politikasi",
  "/mesafeli-satis",
  "/on-bilgilendirme",
  "/iptal-iade",
  "/aydinlatma-metni",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, blogSlugs] = await Promise.all([
    getProducts(),
    getBlogSlugs(),
  ]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/blog" ? 0.8 : 0.7,
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

  return [...staticEntries, ...productEntries, ...blogEntries];
}
