import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Product } from '@entities/product.entity';
import { Order } from '@entities/order.entity';
import { Category } from '@entities/category.entity';
import { ContactMessage } from '@entities/contact-message.entity';
import { MediaAsset } from '@entities/media-asset.entity';
import { NewsletterSubscriber } from '@entities/newsletter-subscriber.entity';
import { LegalDocument } from '@entities/legal-document.entity';
import { ContentSection } from '@entities/content-section.entity';
import { BlogPost } from '@entities/blog-post.entity';

export type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchResponse = {
  q: string;
  groups: { type: string; label: string; items: SearchHit[] }[];
};

@Injectable()
export class SearchService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async searchPublic(q: string, limit = 8): Promise<SearchResponse> {
    const term = q.trim();
    if (term.length < 2) {
      return { q: term, groups: [] };
    }
    const like = `%${term}%`;
    const per = Math.min(limit, 12);

    const [products, sections, legal, posts] = await Promise.all([
      this.em
        .createQueryBuilder(Product, 'p')
        .where('p.is_active = true')
        .andWhere(
          `(p.name ILIKE :like OR p.slug ILIKE :like OR COALESCE(p.origin_country,'') ILIKE :like OR COALESCE(p.origin_region,'') ILIKE :like OR COALESCE(p.roast_level,'') ILIKE :like OR COALESCE(p.batch_id,'') ILIKE :like)`,
          { like },
        )
        .orderBy('p.name', 'ASC')
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(ContentSection, 's')
        .where('s.is_published = true')
        .andWhere(
          `(COALESCE(s.title,'') ILIKE :like OR s.section_key ILIKE :like OR s.page ILIKE :like)`,
          { like },
        )
        .take(Math.min(per, 5))
        .getMany(),
      this.em
        .createQueryBuilder(LegalDocument, 'd')
        .where('d.is_published = true')
        .andWhere(`(d.title ILIKE :like OR d.slug ILIKE :like)`, { like })
        .take(Math.min(per, 5))
        .getMany(),
      this.em
        .createQueryBuilder(BlogPost, 'b')
        .where('b.is_published = true')
        .andWhere(
          `(b.title ILIKE :like OR b.slug ILIKE :like OR COALESCE(b.excerpt,'') ILIKE :like OR COALESCE(b.author_name,'') ILIKE :like)`,
          { like },
        )
        .orderBy('b.published_at', 'DESC')
        .take(per)
        .getMany(),
    ]);

    const groups: SearchResponse['groups'] = [];

    if (products.length) {
      groups.push({
        type: 'products',
        label: 'Ürünler',
        items: products.map((p) => ({
          type: 'product',
          id: p.id,
          title: p.name,
          subtitle: [p.originCountry, p.roastLevel].filter(Boolean).join(' · '),
          href: `/urunler/${p.slug}`,
        })),
      });
    }

    if (sections.length) {
      groups.push({
        type: 'content',
        label: 'İçerik',
        items: sections.map((s) => ({
          type: 'content',
          id: s.id,
          title: s.title || s.sectionKey,
          subtitle: s.page,
          href: s.page === 'home' ? '/' : `/${s.page}`,
        })),
      });
    }

    if (legal.length) {
      groups.push({
        type: 'legal',
        label: 'Yasal',
        items: legal.map((d) => ({
          type: 'legal',
          id: d.id,
          title: d.title,
          subtitle: d.slug,
          href: `/${d.slug}`,
        })),
      });
    }

    if (posts.length) {
      groups.push({
        type: 'blog',
        label: 'Blog',
        items: posts.map((p) => ({
          type: 'blog',
          id: p.id,
          title: p.title,
          subtitle: p.excerpt || p.authorName || undefined,
          href: `/blog/${p.slug}`,
        })),
      });
    }

    return { q: term, groups };
  }

  async searchAdmin(q: string, limit = 8): Promise<SearchResponse> {
    const term = q.trim();
    if (term.length < 2) {
      return { q: term, groups: [] };
    }
    const like = `%${term}%`;
    const per = Math.min(limit, 12);

    const [
      products,
      orders,
      categories,
      messages,
      media,
      newsletter,
      legal,
      posts,
    ] = await Promise.all([
      this.em
        .createQueryBuilder(Product, 'p')
        .where(
          `(p.name ILIKE :like OR p.slug ILIKE :like OR COALESCE(p.batch_id,'') ILIKE :like)`,
          { like },
        )
        .orderBy('p.updated_at', 'DESC')
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(Order, 'o')
        .where(
          `(o.order_number ILIKE :like OR o.customer_email ILIKE :like OR o.customer_name ILIKE :like OR o.customer_phone ILIKE :like)`,
          { like },
        )
        .orderBy('o.created_at', 'DESC')
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(Category, 'c')
        .where(`(c.name ILIKE :like OR c.slug ILIKE :like)`, { like })
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(ContactMessage, 'm')
        .where(
          `(m.sender_name ILIKE :like OR m.sender_email ILIKE :like OR m.message ILIKE :like OR m.protocol_type ILIKE :like)`,
          { like },
        )
        .orderBy('m.created_at', 'DESC')
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(MediaAsset, 'a')
        .where(
          `(a.filename ILIKE :like OR a.url ILIKE :like OR COALESCE(a.alt,'') ILIKE :like)`,
          { like },
        )
        .orderBy('a.created_at', 'DESC')
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(NewsletterSubscriber, 'n')
        .where(`n.email ILIKE :like`, { like })
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(LegalDocument, 'd')
        .where(`(d.title ILIKE :like OR d.slug ILIKE :like)`, { like })
        .take(per)
        .getMany(),
      this.em
        .createQueryBuilder(BlogPost, 'b')
        .where(
          `(b.title ILIKE :like OR b.slug ILIKE :like OR COALESCE(b.excerpt,'') ILIKE :like)`,
          { like },
        )
        .orderBy('b.updated_at', 'DESC')
        .take(per)
        .getMany(),
    ]);

    const groups: SearchResponse['groups'] = [];

    if (products.length) {
      groups.push({
        type: 'products',
        label: 'Ürünler',
        items: products.map((p) => ({
          type: 'product',
          id: p.id,
          title: p.name,
          subtitle: p.slug,
          href: '/urunler',
        })),
      });
    }
    if (orders.length) {
      groups.push({
        type: 'orders',
        label: 'Siparişler',
        items: orders.map((o) => ({
          type: 'order',
          id: o.id,
          title: o.orderNumber,
          subtitle: `${o.customerName} · ${o.status}`,
          href: `/siparisler/${o.id}`,
        })),
      });
    }
    if (categories.length) {
      groups.push({
        type: 'categories',
        label: 'Kategoriler',
        items: categories.map((c) => ({
          type: 'category',
          id: c.id,
          title: c.name,
          subtitle: c.slug,
          href: '/kategoriler',
        })),
      });
    }
    if (messages.length) {
      groups.push({
        type: 'messages',
        label: 'Mesajlar',
        items: messages.map((m) => ({
          type: 'message',
          id: m.id,
          title: m.senderName,
          subtitle: m.senderEmail,
          href: '/mesajlar',
        })),
      });
    }
    if (media.length) {
      groups.push({
        type: 'media',
        label: 'Medya',
        items: media.map((a) => ({
          type: 'media',
          id: a.id,
          title: a.filename,
          subtitle: a.mimeType,
          href: '/medya',
        })),
      });
    }
    if (newsletter.length) {
      groups.push({
        type: 'newsletter',
        label: 'Bülten',
        items: newsletter.map((n) => ({
          type: 'newsletter',
          id: n.id,
          title: n.email,
          subtitle: n.source,
          href: '/bulten',
        })),
      });
    }
    if (legal.length) {
      groups.push({
        type: 'legal',
        label: 'Sözleşmeler',
        items: legal.map((d) => ({
          type: 'legal',
          id: d.id,
          title: d.title,
          subtitle: d.slug,
          href: '/sozlesmeler',
        })),
      });
    }
    if (posts.length) {
      groups.push({
        type: 'blog',
        label: 'Blog',
        items: posts.map((p) => ({
          type: 'blog',
          id: p.id,
          title: p.title,
          subtitle: p.isPublished ? 'published' : 'draft',
          href: '/blog',
        })),
      });
    }

    return { q: term, groups };
  }
}
