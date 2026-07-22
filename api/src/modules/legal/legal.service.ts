import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LegalDocument } from '@entities/legal-document.entity';
import { CookieConsentLog } from '@entities/cookie-consent-log.entity';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  CreateCookieConsentDto,
} from '@modules/legal/dto/legal.dto';
import { LEGAL_DEFAULTS } from '@database/legal-defaults';

function isPlaceholderContent(content: string | null | undefined): boolean {
  const c = (content || '').trim();
  if (!c) return true;
  if (c.includes('örnek içerik')) return true;
  return false;
}

@Injectable()
export class LegalService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async listAllAdmin(): Promise<LegalDocument[]> {
    return this.em.find(LegalDocument, {
      order: { slug: 'ASC', publishedAt: 'DESC' },
    });
  }

  async getLatestPublished(slug: string): Promise<LegalDocument> {
    const docs = await this.em.find(LegalDocument, {
      where: { slug, isPublished: true },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 1,
    });
    const doc = docs[0];
    if (!doc) {
      throw new NotFoundException('Yasal belge bulunamadı');
    }
    return doc;
  }

  async create(dto: CreateLegalDocumentDto): Promise<LegalDocument> {
    const publish = dto.isPublished !== false;
    const doc = this.em.create(LegalDocument, {
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      version: dto.version,
      isPublished: publish,
      publishedAt: publish ? new Date() : null,
      locale: dto.locale ?? 'tr',
    });
    return this.em.save(doc);
  }

  async update(id: string, dto: UpdateLegalDocumentDto): Promise<LegalDocument> {
    const doc = await this.em.findOne(LegalDocument, { where: { id } });
    if (!doc) {
      throw new NotFoundException('Yasal belge bulunamadı');
    }
    const wasPublished = doc.isPublished;
    Object.assign(doc, dto);
    if (dto.isPublished === true && !wasPublished) {
      doc.publishedAt = new Date();
    }
    if (dto.isPublished === false) {
      doc.publishedAt = null;
    }
    return this.em.save(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.em.findOne(LegalDocument, { where: { id } });
    if (!doc) {
      throw new NotFoundException('Yasal belge bulunamadı');
    }
    await this.em.remove(doc);
  }

  /**
   * Varsayılan yönetmelik metinlerini DB’ye yazar.
   * force=false: yalnızca eksik veya seed placeholder kayıtları doldurur.
   * force=true: tüm varsayılan slug’ları günceller.
   */
  async syncDefaults(force = false): Promise<{
    created: string[];
    updated: string[];
    skipped: string[];
  }> {
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const [slug, meta] of Object.entries(LEGAL_DEFAULTS)) {
      const existing = await this.em.findOne(LegalDocument, {
        where: { slug },
        order: { createdAt: 'ASC' },
      });

      if (!existing) {
        await this.em.save(
          this.em.create(LegalDocument, {
            slug,
            title: meta.title,
            content: meta.content,
            version: '1.0',
            isPublished: true,
            publishedAt: new Date(),
            locale: 'tr',
          }),
        );
        created.push(slug);
        continue;
      }

      if (force || isPlaceholderContent(existing.content)) {
        existing.title = meta.title;
        existing.content = meta.content;
        existing.isPublished = true;
        existing.publishedAt = existing.publishedAt || new Date();
        await this.em.save(existing);
        updated.push(slug);
      } else {
        skipped.push(slug);
      }
    }

    return { created, updated, skipped };
  }

  async createCookieConsent(
    dto: CreateCookieConsentDto,
  ): Promise<CookieConsentLog> {
    const log = this.em.create(CookieConsentLog, {
      sessionId: dto.sessionId || `anon-${Date.now()}`,
      userId: dto.userId ?? null,
      necessary: dto.necessary ?? true,
      analytics: dto.analytics ?? false,
      marketing: dto.marketing ?? false,
      userAgent: dto.userAgent ?? null,
      ipHash: dto.ipHash ?? null,
    });
    return this.em.save(log);
  }
}
