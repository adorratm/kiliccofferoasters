import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/cms";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata({
    title: "İletişim",
    description:
      "Kılıç Coffee Roasters ile iletişime geçin — Torbalı / İzmir atölye ve sipariş soruları.",
    path: "/iletisim",
    settings,
    keywords: ["iletişim", "Torbalı", "kahve kavurma"],
  });
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
