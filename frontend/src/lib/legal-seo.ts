import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/cms";
import { buildPageMetadata } from "@/lib/seo";

const LEGAL_META: Record<
  string,
  { title: string; description: string }
> = {
  gizlilik: {
    title: "Gizlilik Politikası",
    description:
      "Kılıç Coffee Roasters gizlilik politikası — kişisel verilerinizin korunması hakkında bilgilendirme.",
  },
  kvkk: {
    title: "KVKK",
    description:
      "6698 sayılı KVKK kapsamında Kılıç Coffee Roasters veri işleme bilgilendirmesi.",
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    description:
      "Kılıç Coffee Roasters web sitesinde kullanılan çerezler hakkında bilgilendirme.",
  },
  "mesafeli-satis": {
    title: "Mesafeli Satış Sözleşmesi",
    description:
      "Online siparişler için mesafeli satış sözleşmesi metni.",
  },
  "on-bilgilendirme": {
    title: "Ön Bilgilendirme Formu",
    description:
      "Mesafeli satış öncesi tüketici ön bilgilendirme formu.",
  },
  "iptal-iade": {
    title: "İptal ve İade",
    description:
      "Sipariş iptal, cayma hakkı ve iade koşulları.",
  },
  "musteri-memnuniyeti": {
    title: "Müşteri Memnuniyeti",
    description:
      "Kılıç Coffee Roasters müşteri memnuniyeti politikası ve destek süreci.",
  },
  "guvenli-alisveris": {
    title: "Güvenli Alışveriş",
    description:
      "PayTR ile güvenli ödeme, SSL ve kişisel veri koruma bilgilendirmesi.",
  },
  "aydinlatma-metni": {
    title: "Aydınlatma Metni",
    description:
      "Kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
  },
};

export async function legalMetadata(slug: string): Promise<Metadata> {
  const settings = await getSiteSettings();
  const meta = LEGAL_META[slug] || {
    title: slug,
    description: settings.seo.description,
  };
  return buildPageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/${slug}`,
    settings,
    keywords: ["yasal", "KVKK", meta.title],
  });
}
