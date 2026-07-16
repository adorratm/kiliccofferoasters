import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/hesabim",
        "/hesabim/",
        "/sepet",
        "/odeme",
        "/odeme/",
        "/auth/",
        "/giris",
        "/kayit",
        "/siparis-sorgula",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
