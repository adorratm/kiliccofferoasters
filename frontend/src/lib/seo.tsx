import type { Metadata } from "next";
import type { SiteSettings } from "@/lib/cms";
import type { BlogPost, Product } from "@/lib/types";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function buildSiteMetadata(settings: SiteSettings): Metadata {
  const { seo, brand } = settings;
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
      images: seo.ogImage
        ? [{ url: seo.ogImage, width: 1200, height: 630, alt: brand.name }]
        : undefined,
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
    openGraph: {
      type: "website",
      url,
      title: product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildBlogIndexMetadata(settings: SiteSettings): Metadata {
  const title = "Blog";
  const description =
    "Kavrum teknikleri, demleme notları ve Kılıç Coffee Roasters günlüklerinden yazılar.";
  const url = `${SITE_URL}/blog`;
  return {
    title,
    description,
    keywords: [
      ...(settings.seo.keywords || []),
      "blog",
      "kahve blog",
      "specialty coffee",
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${title} | ${settings.brand.name}`,
      description,
      images: settings.seo.ogImage
        ? [{ url: settings.seo.ogImage, alt: settings.brand.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.seo.ogImage ? [settings.seo.ogImage] : undefined,
    },
  };
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
      url,
      title,
      description,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      images: image ? [{ url: image, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function organizationJsonLd(settings: SiteSettings) {
  const { brand, contact } = settings;
  return {
    "@context": "https://schema.org",
    "@type": "CoffeeShop",
    name: brand.name,
    description: brand.tagline,
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: "Torbalı",
      addressRegion: "İzmir",
      addressCountry: "TR",
    },
    email: contact.email || undefined,
    telephone: contact.phone || undefined,
  };
}

export function productJsonLd(product: Product, settings: SiteSettings) {
  const price = product.variants?.[0]?.price ?? product.basePrice;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.imageUrl || settings.seo.ogImage,
    sku: product.batchId || product.slug,
    brand: {
      "@type": "Brand",
      name: settings.brand.name,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency || "TRY",
      price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/urunler/${product.slug}`,
    },
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
