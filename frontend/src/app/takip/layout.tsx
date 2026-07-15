import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/cms";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata({
    title: "Kargo Takip",
    description:
      "Siparişinizin kargo takip kodu ile teslimat durumunu sorgulayın.",
    path: "/takip",
    settings,
    keywords: ["kargo takip", "sipariş takip"],
  });
}

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
