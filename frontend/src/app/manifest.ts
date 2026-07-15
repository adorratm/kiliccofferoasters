import type { MetadataRoute } from "next";
import { DEFAULT_SETTINGS } from "@/lib/cms";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DEFAULT_SETTINGS.brand.name,
    short_name: "Kılıç Coffee",
    description: DEFAULT_SETTINGS.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#131313",
    theme_color: "#131313",
    lang: "tr",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
