import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { AppDataSource } from '@database/data-source';
import { AdminAllowlist } from '@entities/admin-allowlist.entity';
import { Category } from '@entities/category.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { LegalDocument } from '@entities/legal-document.entity';
import { BlogPost } from '@entities/blog-post.entity';
import { Coupon, CouponType } from '@entities/coupon.entity';
import { ShippingProviderConfig } from '@entities/shipping-provider-config.entity';
import { ShippingProviderCode } from '@entities/shipment.entity';
import { SiteSetting } from '@entities/site-setting.entity';
import { ContentSection } from '@entities/content-section.entity';
import {
  DEFAULT_HOME_SECTIONS,
  DEFAULT_SITE_SETTINGS,
} from '@database/cms-defaults';
import { LEGAL_DEFAULTS } from '@database/legal-defaults';

config({ path: join(process.cwd(), '..', '.env') });
config();

async function seed() {
  await AppDataSource.initialize();
  const em = AppDataSource.manager;

  const adminEmail = (
    process.env.ADMIN_ALLOWLIST || 'emrekilic19983@gmail.com'
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  let allow = await em.findOne(AdminAllowlist, {
    where: { email: adminEmail },
  });
  if (!allow) {
    allow = em.create(AdminAllowlist, {
      email: adminEmail,
      active: true,
      note: 'Seed admin',
    });
    await em.save(allow);
    console.log('Admin allowlist:', adminEmail);
  }

  let singleOrigin = await em.findOne(Category, {
    where: { slug: 'single-origin' },
  });
  if (!singleOrigin) {
    singleOrigin = em.create(Category, {
      slug: 'single-origin',
      name: 'Single Origin',
      description: 'Tek ülke / bölge kahveleri',
      sortOrder: 1,
      isActive: true,
    });
    await em.save(singleOrigin);
  }

  let blends = await em.findOne(Category, { where: { slug: 'blends' } });
  if (!blends) {
    blends = em.create(Category, {
      slug: 'blends',
      name: 'Harmanlar',
      description: 'Özenle harmanlanmış kavrulmuş kahveler',
      sortOrder: 2,
      isActive: true,
    });
    await em.save(blends);
  }

  const products = [
    {
      slug: 'ethiopia-yirgacheffe',
      name: 'Ethiopia Yirgacheffe',
      description:
        'Çiçeksi aromalar, bergamot ve jasmine notalarıyla bilinen Etiyopya Yirgacheffe.',
      shortDescription: 'Çiçeksi, bergamot, jasmine',
      originCountry: 'Ethiopia',
      originRegion: 'Yirgacheffe',
      altitude: '1800-2200m',
      process: 'Washed',
      varietal: 'Heirloom',
      roastLevel: 'Light',
      flavorNotes: ['jasmine', 'bergamot', 'peach'],
      basePrice: '450.00',
      stock: 100,
      isFeatured: true,
      badge: 'Yeni Hasat',
      categoryId: singleOrigin.id,
    },
    {
      slug: 'colombia-huila',
      name: 'Colombia Huila',
      description:
        'Karamel tatlılığı ve dengeli asiditeye sahip Kolombiya Huila.',
      shortDescription: 'Karamel, fındık, kırmızı elma',
      originCountry: 'Colombia',
      originRegion: 'Huila',
      altitude: '1600-1900m',
      process: 'Washed',
      varietal: 'Caturra, Castillo',
      roastLevel: 'Medium',
      flavorNotes: ['caramel', 'hazelnut', 'red apple'],
      basePrice: '420.00',
      stock: 120,
      isFeatured: true,
      badge: null,
      categoryId: singleOrigin.id,
    },
    {
      slug: 'brazil-cerrado',
      name: 'Brazil Cerrado',
      description:
        'Çikolata ve fındık profiliyle espresso ve filtreye uygun Brezilya Cerrado.',
      shortDescription: 'Çikolata, fındık, kakao',
      originCountry: 'Brazil',
      originRegion: 'Cerrado',
      altitude: '900-1200m',
      process: 'Natural',
      varietal: 'Bourbon, Catuaí',
      roastLevel: 'Medium-Dark',
      flavorNotes: ['chocolate', 'nut', 'cocoa'],
      basePrice: '380.00',
      stock: 150,
      isFeatured: false,
      badge: 'Espresso',
      categoryId: blends.id,
    },
  ];

  for (const p of products) {
    let product = await em.findOne(Product, { where: { slug: p.slug } });
    if (!product) {
      product = await em.save(
        em.create(Product, {
          ...p,
          currency: 'TRY',
          isActive: true,
          gallery: [],
        }),
      );
      console.log('Product:', p.slug);
    }

    const variantCount = await em.count(ProductVariant, {
      where: { productId: product.id },
    });
    if (variantCount === 0) {
      await em.save(
        em.create(ProductVariant, {
          productId: product.id,
          sku: `${p.slug}-250`.toUpperCase().slice(0, 80),
          weightLabel: '250g',
          price: p.basePrice,
          stock: p.stock,
          isActive: true,
        }),
      );
      await em.save(
        em.create(ProductVariant, {
          productId: product.id,
          sku: `${p.slug}-1000`.toUpperCase().slice(0, 80),
          weightLabel: '1kg',
          price: (Number(p.basePrice) * 3.6).toFixed(2),
          stock: Math.max(10, Math.floor(p.stock / 2)),
          isActive: true,
        }),
      );
      console.log('Variants:', p.slug);
    }
  }

  for (const [slug, meta] of Object.entries(LEGAL_DEFAULTS)) {
    const exists = await em.findOne(LegalDocument, {
      where: { slug },
    });
    if (!exists) {
      await em.save(
        em.create(LegalDocument, {
          slug,
          title: meta.title,
          content: meta.content,
          version: '1.0',
          isPublished: true,
          publishedAt: new Date(),
          locale: 'tr',
        }),
      );
      console.log('Legal:', slug);
    } else if (
      !exists.content ||
      exists.content.includes('örnek içerik')
    ) {
      exists.title = meta.title;
      exists.content = meta.content;
      exists.isPublished = true;
      exists.publishedAt = exists.publishedAt || new Date();
      await em.save(exists);
      console.log('Legal updated:', slug);
    }
  }

  const blogPosts = [
    {
      slug: 'birinci-crack-nedir',
      title: 'Birinci Crack Nedir?',
      excerpt:
        'Kavrumda birinci crack anı, tat profilinin yönünü belirleyen kritik bir eşiktir.',
      content: `<p>Birinci crack, çekirdeğin içinde biriken buharın hücre duvarlarını aşmasıyla duyulan fiziksel kırılmadır. Bu an, kavrumun “geliştirme” fazına giriş kapısıdır.</p>
<p>Çok erken drop yapmak asiditeyi canlı bırakır; fazla uzatmak gövdeyi artırırken çiçeksi notaları baskılar. Torbalı’daki kavurularımızda crack zamanlamasını batch bazında log’larız.</p>
<p>Profillerinizi tekrarlanabilir kılmak için crack zamanı, drop sıcaklığı ve airflow değerlerini birlikte okuyun — tek başına süre yetmez.</p>`,
      coverImageUrl:
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1400&q=80',
      authorName: 'Kılıç Coffee Roasters',
      tags: ['kavrum', 'teknik'],
      seoTitle: 'Birinci Crack Nedir? | Kavrum Tekniği',
      seoDescription:
        'Specialty kahvede birinci crack nedir, neden önemlidir ve tat profilini nasıl etkiler?',
    },
    {
      slug: 'filtre-kahve-ogutme-ipuclari',
      title: 'Filtre Kahve İçin Öğütme İpuçları',
      excerpt:
        'Doğru öğütme boyutu, ekstraksiyonu dengeler; ince değil, kararlı olmalı.',
      content: `<p>Filtre demlemede öğütme, sıcaklık ve oran kadar belirleyicidir. Çok ince öğütme acılaştırır; çok kalın öğütme ise ekşi ve zayıf bir fincan üretir.</p>
<p>Önerilen başlangıç: V60 için orta-ince, batch brew için biraz daha kaba. Aynı kahveyi farklı ekipmanlarda kullanırken önce oranları sabitleyin, sonra öğütmeyi ince ayarlayın.</p>
<p>Yirgacheffe gibi light kavrumlarda biraz daha ince giderek floral notaları öne çıkarabilirsiniz; Brazil gibi gövdeli kahvelerde kaba tarafı tercih edin.</p>`,
      coverImageUrl:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80',
      authorName: 'Kılıç Coffee Roasters',
      tags: ['demleme', 'filtre'],
      seoTitle: 'Filtre Kahve Öğütme İpuçları',
      seoDescription:
        'Filtre demleme için öğütme boyutu, oran ve ekipman bazlı pratik ayar önerileri.',
    },
  ];

  for (const post of blogPosts) {
    const exists = await em.findOne(BlogPost, { where: { slug: post.slug } });
    if (!exists) {
      await em.save(
        em.create(BlogPost, {
          ...post,
          isPublished: true,
          publishedAt: new Date(),
          locale: 'tr',
        }),
      );
      console.log('Blog:', post.slug);
    }
  }

  const shippingProviders: {
    provider: ShippingProviderCode;
    displayName: string;
  }[] = [
    { provider: ShippingProviderCode.YURTICI, displayName: 'Yurtiçi Kargo' },
    {
      provider: ShippingProviderCode.KOLAY_GELSIN,
      displayName: 'Kolay Gelsin',
    },
    { provider: ShippingProviderCode.DHL, displayName: 'DHL' },
    { provider: ShippingProviderCode.SURAT, displayName: 'Sürat Kargo' },
    { provider: ShippingProviderCode.PTT, displayName: 'PTT Kargo' },
    { provider: ShippingProviderCode.HEPSIJET, displayName: 'HepsiJet' },
    {
      provider: ShippingProviderCode.TRENDYOL_EXPRESS,
      displayName: 'Trendyol Express',
    },
  ];

  for (const sp of shippingProviders) {
    const exists = await em.findOne(ShippingProviderConfig, {
      where: { provider: sp.provider },
    });
    if (!exists) {
      await em.save(
        em.create(ShippingProviderConfig, {
          provider: sp.provider,
          displayName: sp.displayName,
          isEnabled: true,
          credentials: {},
          settings: { fee: '89.90', estimatedDays: '2-5 gün' },
        }),
      );
      console.log('Shipping provider:', sp.provider);
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
    const exists = await em.findOne(SiteSetting, { where: { key } });
    if (!exists) {
      await em.save(
        em.create(SiteSetting, {
          key,
          value,
          group: key,
          description: `${key} site ayarları`,
        }),
      );
      console.log('Site setting:', key);
    } else if (key === 'navigation') {
      const nav = (exists.value || {}) as {
        header?: { href: string; label: string }[];
        footerNav?: { href: string; label: string }[];
        footerLegal?: { href: string; label: string }[];
      };
      let changed = false;
      if (nav.header && !nav.header.some((l) => l.href === '/blog')) {
        const idx = nav.header.findIndex((l) => l.href === '/urunler');
        nav.header.splice(idx >= 0 ? idx + 1 : nav.header.length, 0, {
          href: '/blog',
          label: 'Blog',
        });
        changed = true;
      }
      if (nav.footerNav && !nav.footerNav.some((l) => l.href === '/blog')) {
        const idx = nav.footerNav.findIndex((l) => l.href === '/urunler');
        nav.footerNav.splice(idx >= 0 ? idx + 1 : nav.footerNav.length, 0, {
          href: '/blog',
          label: 'Blog',
        });
        changed = true;
      }
      for (const list of [nav.header, nav.footerNav]) {
        if (!list) continue;
        for (const link of list) {
          if (link.href === '/takip/ornek') {
            link.href = '/takip';
            changed = true;
          }
        }
      }
      if (nav.footerLegal) {
        const extras = [
          {
            href: '/musteri-memnuniyeti',
            label: 'Müşteri Memnuniyeti',
          },
          { href: '/guvenli-alisveris', label: 'Güvenli Alışveriş' },
        ];
        for (const extra of extras) {
          if (!nav.footerLegal.some((l) => l.href === extra.href)) {
            const idx = nav.footerLegal.findIndex(
              (l) => l.href === '/iptal-iade',
            );
            nav.footerLegal.splice(
              idx >= 0 ? idx + 1 : nav.footerLegal.length,
              0,
              extra,
            );
            changed = true;
          }
        }
        for (const link of nav.footerLegal) {
          if (link.href === '/cerez-politikasi' && link.label === 'Çerez Politikası') {
            link.label = 'Çerez Kullanımı';
            changed = true;
          }
          if (link.href === '/iptal-iade' && link.label.includes('İptal')) {
            link.label = 'İade Politikası';
            changed = true;
          }
        }
      }
      if (changed) {
        exists.value = nav;
        await em.save(exists);
        console.log('Site setting navigation: updated');
      }
    }
  }

  for (const section of DEFAULT_HOME_SECTIONS) {
    const exists = await em.findOne(ContentSection, {
      where: { page: section.page, sectionKey: section.sectionKey },
    });
    if (!exists) {
      await em.save(
        em.create(ContentSection, {
          page: section.page,
          sectionKey: section.sectionKey,
          title: section.title,
          content: section.content,
          sortOrder: section.sortOrder,
          isPublished: true,
        }),
      );
      console.log('Content section:', section.page, section.sectionKey);
    }
  }

  const welcomeCoupon = await em.findOne(Coupon, {
    where: { code: 'HOSGELDIN10' },
  });
  if (!welcomeCoupon) {
    await em.save(
      em.create(Coupon, {
        code: 'HOSGELDIN10',
        title: 'Hoş geldin %10',
        type: CouponType.PERCENT,
        value: '10',
        minSubtotal: '0',
        maxUses: null,
        usedCount: 0,
        firstOrderOnly: true,
        startsAt: null,
        endsAt: null,
        isActive: true,
      }),
    );
    console.log('Coupon: HOSGELDIN10');
  }

  console.log('Seed tamamlandı.');
  await AppDataSource.destroy();
}

seed().catch(async (err) => {
  console.error(err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
