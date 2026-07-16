import type { Metadata } from "next";
import type { SiteSettings } from "@/lib/cms";
import type { BlogPost, Product } from "@/lib/types";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  settings: SiteSettings;
  keywords?: string[];
  image?: string | null;
  noIndex?: boolean;
};

function ogImages(
  image: string | undefined | null,
  alt: string,
): NonNullable<Metadata["openGraph"]>["images"] {
  if (!image) return undefined;
  return [{ url: image, width: 1200, height: 630, alt }];
}

export function buildPageMetadata({
  title,
  description,
  path,
  settings,
  keywords,
  image,
  noIndex,
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogImage = image || settings.seo.ogImage;
  const fullTitle = `${title} | ${settings.brand.name}`;
  return {
    title,
    description,
    keywords: keywords?.length
      ? [...(settings.seo.keywords || []), ...keywords]
      : undefined,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: settings.brand.name,
      title: fullTitle,
      description,
      images: ogImages(ogImage, settings.brand.name),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export function buildCatalogMetadata(
  settings: SiteSettings,
  opts: {
    categorySlug?: string;
    categoryName?: string;
    categoryDescription?: string | null;
    q?: string;
  } = {},
): Metadata {
  const { categorySlug, categoryName, categoryDescription, q } = opts;
  const query = q?.trim();

  let title = "Kavrumlar";
  let description =
    "Torbalı / İzmir’den specialty kahve kavrumları. Batch bazlı, profile kontrollü, taze kavrulmuş çekirdekler.";
  let path = "/urunler";

  if (categorySlug && categoryName) {
    title = categoryName;
    description =
      categoryDescription?.trim() ||
      `${categoryName} kategorisindeki kavrumlar — ${settings.brand.name}.`;
    path = `/urunler?category=${encodeURIComponent(categorySlug)}`;
  } else if (query) {
    title = `Arama: ${query}`;
    description = `“${query}” için kavrum sonuçları — ${settings.brand.name}.`;
    path = `/urunler?q=${encodeURIComponent(query)}`;
  }

  return buildPageMetadata({
    title,
    description,
    path,
    settings,
    keywords: categoryName
      ? [categoryName, categorySlug || "", "kahve", "kavrum"]
      : ["katalog", "kahve", "specialty coffee"],
    noIndex: Boolean(query),
  });
}

export function buildSiteMetadata(settings: SiteSettings): Metadata {
  const { seo, brand } = settings;
  const verification =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.title || brand.name,
      template: `%s | ${brand.name}`,
    },
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: SITE_URL,
      siteName: brand.name,
      title: seo.title,
      description: seo.description,
      images: ogImages(seo.ogImage, brand.name),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    alternates: {
      canonical: SITE_URL,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(verification
      ? { verification: { google: verification } }
      : {}),
  };
}

export function buildProductMetadata(
  product: Product,
  settings: SiteSettings,
): Metadata {
  const description =
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    settings.seo.description;
  const image = product.imageUrl || settings.seo.ogImage;
  const url = `${SITE_URL}/urunler/${product.slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: settings.brand.name,
      title: product.name,
      description,
      images: ogImages(image, product.name),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildBlogIndexMetadata(
  settings: SiteSettings,
  opts: { page?: number; tag?: string } = {},
): Metadata {
  const page = opts.page && opts.page > 1 ? opts.page : undefined;
  const tag = opts.tag?.trim();
  let title = "Blog";
  let description =
    "Kavrum teknikleri, demleme notları ve Kılıç Coffee Roasters günlüklerinden yazılar.";
  let path = "/blog";
  const qs = new URLSearchParams();
  if (tag) {
    title = `Blog · ${tag}`;
    description = `“${tag}” etiketli yazılar — ${settings.brand.name}.`;
    qs.set("tag", tag);
  }
  if (page) {
    title = `${title} · Sayfa ${page}`;
    qs.set("page", String(page));
  }
  const query = qs.toString();
  if (query) path = `/blog?${query}`;

  return buildPageMetadata({
    title,
    description,
    path,
    settings,
    keywords: ["blog", "kahve blog", "specialty coffee", tag || ""].filter(
      Boolean,
    ),
    noIndex: Boolean(page || tag),
  });
}

export function buildBlogPostMetadata(
  post: BlogPost,
  settings: SiteSettings,
): Metadata {
  const title = post.seoTitle || post.title;
  const description =
    post.seoDescription ||
    post.excerpt ||
    post.content.replace(/<[^>]+>/g, "").slice(0, 160) ||
    settings.seo.description;
  const image = post.coverImageUrl || settings.seo.ogImage;
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title,
    description,
    keywords: [...(settings.seo.keywords || []), ...(post.tags || [])],
    authors: post.authorName ? [{ name: post.authorName }] : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url,
      siteName: settings.brand.name,
      title,
      description,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      images: ogImages(image, post.title),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function websiteJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.brand.name,
    url: SITE_URL,
    description: settings.seo.description,
    inLanguage: "tr-TR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/urunler?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(settings: SiteSettings) {
  const { brand, contact, social, seo } = settings;
  const sameAs = [social.instagram, social.facebook, social.googleMaps]
    .map((u) => u?.trim())
    .filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@type": "CoffeeShop",
    "@id": `${SITE_URL}/#organization`,
    name: brand.name,
    description: brand.tagline || seo.description,
    url: SITE_URL,
    logo: seo.ogImage
      ? { "@type": "ImageObject", url: seo.ogImage }
      : undefined,
    image: seo.ogImage || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: "Torbalı",
      addressRegion: "İzmir",
      addressCountry: "TR",
    },
    email: contact.email || undefined,
    telephone: contact.phone || undefined,
    openingHours: contact.hours || undefined,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function productJsonLd(product: Product, settings: SiteSettings) {
  const price = product.variants?.[0]?.price ?? product.basePrice;
  const stock =
    product.variants?.some((v) => v.isActive && v.stock > 0) ||
    product.stock > 0;
  const ratingCount = product.ratingCount ?? 0;
  const ratingAvg = Number(product.ratingAvg || 0);
  const images = [
    product.imageUrl,
    ...(product.gallery || []),
  ].filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: images.length ? images : settings.seo.ogImage || undefined,
    sku: product.batchId || product.slug,
    brand: {
      "@type": "Brand",
      name: settings.brand.name,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency || "TRY",
      price,
      itemCondition: "https://schema.org/NewCondition",
      availability: stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/urunler/${product.slug}`,
      seller: {
        "@type": "Organization",
        name: settings.brand.name,
      },
    },
    ...(ratingCount > 0 && ratingAvg > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingAvg.toFixed(1),
            reviewCount: ratingCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };
}

export function blogPostJsonLd(post: BlogPost, settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.seoDescription || undefined,
    image: post.coverImageUrl || settings.seo.ogImage || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: {
      "@type": "Person",
      name: post.authorName || settings.brand.name,
    },
    publisher: {
      "@type": "Organization",
      name: settings.brand.name,
      logo: settings.seo.ogImage
        ? { "@type": "ImageObject", url: settings.seo.ogImage }
        : undefined,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: post.tags?.join(", ") || undefined,
    inLanguage: post.locale || "tr",
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
