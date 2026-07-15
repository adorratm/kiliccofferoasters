import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/cms";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata({
    title: "Sipariş Sorgula",
    description:
      "Misafir siparişlerinizi e-posta ve sipariş numarasıyla sorgulayın.",
    path: "/siparis-sorgula",
    settings,
    keywords: ["sipariş sorgu", "misafir sipariş"],
  });
}

export default function GuestLookupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
