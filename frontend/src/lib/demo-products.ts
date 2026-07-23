import type { Product } from "@/lib/types";

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-turk-kahvesi",
    slug: "turk-kahvesi",
    name: "Türk Kahvesi",
    description:
      "Torbalı’da taze kavrulan geleneksel Türk kahvesi. Çekirdek veya öğütülmüş olarak, istediğiniz gramajda sipariş edin.",
    shortDescription: "Geleneksel · Taze kavrum · Çekirdek veya öğütülmüş",
    originCountry: "Türkiye",
    originRegion: "Torbalı / İzmir",
    altitude: null,
    process: null,
    varietal: null,
    batchId: null,
    roastLevel: "Orta-Koyu",
    flavorNotes: ["Kakao", "Fındık", "Baharat"],
    flavorGeometry: null,
    roastLog: null,
    imageUrl: null,
    gallery: [],
    badge: null,
    basePrice: "100.00",
    currency: "TRY",
    stock: 390,
    isActive: true,
    isFeatured: true,
    categoryId: null,
    variants: [
      {
        id: "v-tk-100",
        productId: "demo-turk-kahvesi",
        sku: "TK-100",
        weightLabel: "100gr",
        price: "100.00",
        stock: 100,
        isActive: true,
      },
      {
        id: "v-tk-250",
        productId: "demo-turk-kahvesi",
        sku: "TK-250",
        weightLabel: "250gr",
        price: "250.00",
        stock: 100,
        isActive: true,
      },
      {
        id: "v-tk-500",
        productId: "demo-turk-kahvesi",
        sku: "TK-500",
        weightLabel: "500gr",
        price: "500.00",
        stock: 80,
        isActive: true,
      },
      {
        id: "v-tk-750",
        productId: "demo-turk-kahvesi",
        sku: "TK-750",
        weightLabel: "750gr",
        price: "750.00",
        stock: 60,
        isActive: true,
      },
      {
        id: "v-tk-1000",
        productId: "demo-turk-kahvesi",
        sku: "TK-1000",
        weightLabel: "1kg",
        price: "1000.00",
        stock: 50,
        isActive: true,
      },
    ],
  },
];

export function resolveProducts(apiProducts: Product[], featuredOnly = false) {
  if (apiProducts.length) {
    if (!featuredOnly) return apiProducts;
    const featured = apiProducts.filter((p) => p.isFeatured);
    return (featured.length ? featured : apiProducts).slice(0, 6);
  }
  return DEMO_PRODUCTS;
}
