import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import {
  CreateProductDto,
  ProductQueryDto,
  ProductVariantDto,
  UpdateProductDto,
} from '@modules/catalog/dto/catalog.dto';
import {
  paginateResult,
  PaginatedResult,
} from '@common/utils/pagination';

@Injectable()
export class ProductsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async findAllPublic(
    query: ProductQueryDto = {},
  ): Promise<PaginatedResult<Product>> {
    return this.queryProducts({ ...query, includeInactive: false });
  }

  async findAllAdmin(
    query: ProductQueryDto = {},
  ): Promise<PaginatedResult<Product>> {
    return this.queryProducts({
      ...query,
      includeInactive: query.includeInactive ?? true,
    });
  }

  private async queryProducts(
    query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 12;
    const sort = query.sort || 'name';
    const orderDir = (query.order || (sort === 'name' ? 'asc' : 'desc')).toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.em
      .createQueryBuilder(Product, 'p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.variants', 'variants');

    if (!query.includeInactive) {
      qb.andWhere('p.is_active = true');
    }

    if (query.featured === true) {
      qb.andWhere('p.is_featured = true');
    }

    if (query.categoryId) {
      qb.andWhere('p.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: query.categorySlug,
      });
    }

    if (query.roastLevel) {
      qb.andWhere('p.roast_level ILIKE :roastLevel', {
        roastLevel: `%${query.roastLevel}%`,
      });
    }

    if (query.originCountry) {
      qb.andWhere('p.origin_country ILIKE :originCountry', {
        originCountry: `%${query.originCountry}%`,
      });
    }

    if (query.minPrice != null && !Number.isNaN(query.minPrice)) {
      qb.andWhere('p.base_price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice != null && !Number.isNaN(query.maxPrice)) {
      qb.andWhere('p.base_price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim()}%`;
      qb.andWhere(
        `(
          p.name ILIKE :q OR
          p.slug ILIKE :q OR
          p.description ILIKE :q OR
          COALESCE(p.short_description, '') ILIKE :q OR
          COALESCE(p.origin_country, '') ILIKE :q OR
          COALESCE(p.origin_region, '') ILIKE :q OR
          COALESCE(p.process, '') ILIKE :q OR
          COALESCE(p.varietal, '') ILIKE :q OR
          COALESCE(p.batch_id, '') ILIKE :q OR
          COALESCE(p.roast_level, '') ILIKE :q OR
          COALESCE(p.badge, '') ILIKE :q OR
          EXISTS (
            SELECT 1 FROM unnest(p.flavor_notes) AS note
            WHERE note ILIKE :q
          )
        )`,
        { q },
      );
    }

    const sortMap: Record<string, string> = {
      name: 'p.name',
      price: 'p.base_price',
      createdAt: 'p.created_at',
      stock: 'p.stock',
    };
    qb.orderBy(sortMap[sort] || 'p.name', orderDir);

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginateResult(items, total, page, limit);
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.em.findOne(Product, {
      where: { slug, isActive: true },
      relations: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }
    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.em.findOne(Product, {
      where: { id },
      relations: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const exists = await this.em.findOne(Product, { where: { slug: dto.slug } });
    if (exists) {
      throw new ConflictException('Bu slug zaten kullanılıyor');
    }
    const { variants, ...productFields } = dto;
    const product = this.em.create(Product, {
      slug: productFields.slug,
      name: productFields.name,
      description: productFields.description,
      shortDescription: productFields.shortDescription ?? null,
      originCountry: productFields.originCountry ?? null,
      originRegion: productFields.originRegion ?? null,
      altitude: productFields.altitude ?? null,
      process: productFields.process ?? null,
      varietal: productFields.varietal ?? null,
      batchId: productFields.batchId ?? null,
      roastLevel: productFields.roastLevel ?? null,
      flavorNotes: productFields.flavorNotes ?? [],
      flavorGeometry: productFields.flavorGeometry ?? null,
      roastLog: productFields.roastLog ?? null,
      imageUrl: productFields.imageUrl ?? null,
      gallery: productFields.gallery ?? [],
      badge: productFields.badge ?? null,
      basePrice: productFields.basePrice,
      currency: productFields.currency ?? 'TRY',
      stock: productFields.stock ?? 0,
      isActive: productFields.isActive ?? true,
      isFeatured: productFields.isFeatured ?? false,
      categoryId: productFields.categoryId ?? null,
    });
    const saved = await this.em.save(product);
    if (variants?.length) {
      await this.syncVariants(saved.id, variants);
    }
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    if (dto.slug && dto.slug !== product.slug) {
      const exists = await this.em.findOne(Product, {
        where: { slug: dto.slug },
      });
      if (exists) {
        throw new ConflictException('Bu slug zaten kullanılıyor');
      }
    }
    const { variants, ...rest } = dto;
    Object.assign(product, {
      ...rest,
      shortDescription:
        rest.shortDescription !== undefined
          ? rest.shortDescription
          : product.shortDescription,
      categoryId:
        rest.categoryId !== undefined ? rest.categoryId : product.categoryId,
    });
    await this.em.save(product);
    if (variants !== undefined) {
      await this.syncVariants(product.id, variants);
    }
    return this.findById(product.id);
  }

  private async syncVariants(
    productId: string,
    variants: ProductVariantDto[],
  ): Promise<void> {
    const existing = await this.em.find(ProductVariant, {
      where: { productId },
    });
    const keepIds = new Set(
      variants.map((v) => v.id).filter((id): id is string => Boolean(id)),
    );

    for (const row of existing) {
      if (!keepIds.has(row.id)) {
        await this.em.remove(row);
      }
    }

    for (const v of variants) {
      if (v.id) {
        const current = existing.find((e) => e.id === v.id);
        if (!current) continue;
        current.sku = v.sku;
        current.weightLabel = v.weightLabel;
        current.price = v.price;
        current.stock = v.stock ?? current.stock;
        current.isActive = v.isActive ?? true;
        await this.em.save(current);
      } else {
        await this.em.save(
          this.em.create(ProductVariant, {
            productId,
            sku: v.sku,
            weightLabel: v.weightLabel,
            price: v.price,
            stock: v.stock ?? 0,
            isActive: v.isActive ?? true,
          }),
        );
      }
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.em.remove(product);
  }
}
