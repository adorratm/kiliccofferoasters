import { API_BASE } from "@/lib/api";

export type NavLink = { href: string; label: string };

export type SiteSettings = {
  brand: {
    name: string;
    slogan: string;
    tagline: string;
    established: string;
    location: string;
  };
  contact: {
    address: string;
    email: string;
    phone: string;
    hours: string;
    locationLabel: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
  navigation: {
    header: NavLink[];
    footerNav: NavLink[];
    footerLegal: NavLink[];
  };
  social: {
    instagram: string;
    facebook: string;
    googleMaps: string;
  };
  footer: {
    description: string;
    copyrightSuffix: string;
  };
};

export type ContentSection = {
  id: string;
  page: string;
  sectionKey: string;
  title: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isPublished: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "Kılıç Coffee Roasters",
    slogan: "Engineered Precision. Artisanal Depth.",
    tagline:
      "Engineered Precision. Artisanal Depth. Seçkin profesyoneller için yüksek teknolojili kavrum.",
    established: "EST. 2024",
    location: "Torbalı · İzmir",
  },
  contact: {
    address:
      "AYRANCILAR MAHALLESİ DEĞİRMEN CAD. NO:55A AYRANCILAR, 35870 Torbalı/İzmir",
    email: "info@kiliccoffeeroasters.com.tr",
    phone: "+90 232 000 00 00",
    hours: "Pzt — Cmt / 08:00 — 18:00",
    locationLabel: "Torbalı / İzmir",
  },
  seo: {
    title: "Kılıç Coffee Roasters",
    description:
      "Engineered Precision. Artisanal Depth. Torbalı / İzmir özel kahve kavurucusu.",
    keywords: [
      "kahve",
      "kavurma",
      "specialty coffee",
      "Torbalı",
      "İzmir",
      "Kılıç Coffee Roasters",
    ],
    ogImage:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
  },
  navigation: {
    header: [
      { href: "/urunler", label: "Kavrumlar" },
      { href: "/blog", label: "Blog" },
      { href: "/iletisim", label: "İletişim" },
      { href: "/takip/ornek", label: "Takip" },
    ],
    footerNav: [
      { href: "/urunler", label: "Kavrumlar" },
      { href: "/blog", label: "Blog" },
      { href: "/iletisim", label: "İletişim" },
      { href: "/sepet", label: "Sepet" },
      { href: "/hesabim", label: "Hesabım" },
    ],
    footerLegal: [
      { href: "/kvkk", label: "KVKK" },
      { href: "/gizlilik", label: "Gizlilik" },
      { href: "/cerez-politikasi", label: "Çerez Politikası" },
      { href: "/mesafeli-satis", label: "Mesafeli Satış" },
      { href: "/on-bilgilendirme", label: "Ön Bilgilendirme" },
      { href: "/iptal-iade", label: "İptal & İade" },
      { href: "/aydinlatma-metni", label: "Aydınlatma Metni" },
    ],
  },
  social: {
    instagram: "",
    facebook: "",
    googleMaps: "",
  },
  footer: {
    description:
      "Ampirik veri ve zanaat sezgisiyle mükemmel kavrum profilini mühendislik seviyesinde üretir. Torbalı / İzmir.",
    copyrightSuffix: "Engineered Precision.",
  },
};

const CMS_REVALIDATE = 300;

function mergeSettings(
  raw: Record<string, Record<string, unknown>> | null,
): SiteSettings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    brand: { ...DEFAULT_SETTINGS.brand, ...(raw.brand as object) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(raw.contact as object) },
    seo: { ...DEFAULT_SETTINGS.seo, ...(raw.seo as object) },
    navigation: {
      header:
        (raw.navigation as SiteSettings["navigation"])?.header ??
        DEFAULT_SETTINGS.navigation.header,
      footerNav:
        (raw.navigation as SiteSettings["navigation"])?.footerNav ??
        DEFAULT_SETTINGS.navigation.footerNav,
      footerLegal:
        (raw.navigation as SiteSettings["navigation"])?.footerLegal ??
        DEFAULT_SETTINGS.navigation.footerLegal,
    },
    social: { ...DEFAULT_SETTINGS.social, ...(raw.social as object) },
    footer: { ...DEFAULT_SETTINGS.footer, ...(raw.footer as object) },
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_BASE}/cms/settings`, {
      next: { revalidate: CMS_REVALIDATE },
    });
    if (!res.ok) return DEFAULT_SETTINGS;
    const data = (await res.json()) as Record<string, Record<string, unknown>>;
    return mergeSettings(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getContentSections(
  page: string,
): Promise<ContentSection[]> {
  try {
    const res = await fetch(
      `${API_BASE}/cms/sections?page=${encodeURIComponent(page)}`,
      { next: { revalidate: CMS_REVALIDATE } },
    );
    if (!res.ok) return [];
    return (await res.json()) as ContentSection[];
  } catch {
    return [];
  }
}

export function sectionContent<T extends Record<string, unknown>>(
  sections: ContentSection[],
  key: string,
  fallback: T,
): T {
  const section = sections.find((s) => s.sectionKey === key);
  if (!section?.content) return fallback;
  return { ...fallback, ...section.content } as T;
}

export function cmsImageUrl(url: string | null | undefined, fallback: string) {
  if (!url) return fallback;
  if (url.includes("aida-public") || url.includes("lh3.googleusercontent.com/aida")) {
    return fallback;
  }
  return url;
}
