import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ProductReview } from '@entities/product-review.entity';
import { Product } from '@entities/product.entity';
import { Order, OrderStatus } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { User } from '@entities/user.entity';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ModerateReviewDto,
} from '@modules/reviews/dto/reviews.dto';
import { paginateResult } from '@common/utils/pagination';

const VERIFIED_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class ReviewsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async listPublicBySlug(slug: string, page = 1, limit = 20) {
    const product = await this.em.findOne(Product, { where: { slug } });
    if (!product) throw new NotFoundException('Ürün bulunamadı');

    const [items, total] = await this.em.findAndCount(ProductReview, {
      where: { productId: product.id, isApproved: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      productId: product.id,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      ...paginateResult(items, total, page, limit),
    };
  }

  async listAdmin(query: ListReviewsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const qb = this.em
      .createQueryBuilder(ProductReview, 'r')
      .leftJoinAndSelect('r.product', 'p')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.productId) {
      qb.andWhere('r.product_id = :productId', { productId: query.productId });
    }
    if (query.status === 'pending') {
      qb.andWhere('r.is_approved = false');
    } else if (query.status === 'approved') {
      qb.andWhere('r.is_approved = true');
    }

    const [items, total] = await qb.getManyAndCount();
    return paginateResult(items, total, page, limit);
  }

  async create(user: User, dto: CreateReviewDto): Promise<ProductReview> {
    const product = await this.em.findOne(Product, {
      where: { id: dto.productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı');

    const existing = await this.em.findOne(ProductReview, {
      where: { productId: product.id, userId: user.id },
    });
    if (existing) {
      throw new ConflictException('Bu ürün için zaten yorum yaptınız');
    }

    const verified = await this.hasVerifiedPurchase(user.id, product.id);
    const authorName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email.split('@')[0];

    const review = this.em.create(ProductReview, {
      productId: product.id,
      userId: user.id,
      rating: dto.rating,
      title: dto.title?.trim() || null,
      body: dto.body.trim(),
      authorName,
      isApproved: false,
      isVerifiedPurchase: verified,
    });
    return this.em.save(review);
  }

  async moderate(id: string, dto: ModerateReviewDto): Promise<ProductReview> {
    const review = await this.em.findOne(ProductReview, { where: { id } });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    review.isApproved = dto.isApproved;
    await this.em.save(review);
    await this.recalculateProductRating(review.productId);
    return review;
  }

  async remove(id: string): Promise<void> {
    const review = await this.em.findOne(ProductReview, { where: { id } });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    const productId = review.productId;
    await this.em.remove(review);
    await this.recalculateProductRating(productId);
  }

  private async hasVerifiedPurchase(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const count = await this.em
      .createQueryBuilder(OrderItem, 'oi')
      .innerJoin(Order, 'o', 'o.id = oi.order_id')
      .where('oi.product_id = :productId', { productId })
      .andWhere('o.user_id = :userId', { userId })
      .andWhere('o.status IN (:...statuses)', { statuses: VERIFIED_STATUSES })
      .getCount();
    return count > 0;
  }

  private async recalculateProductRating(productId: string): Promise<void> {
    const product = await this.em.findOne(Product, { where: { id: productId } });
    if (!product) return;

    const raw = await this.em
      .createQueryBuilder(ProductReview, 'r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.product_id = :productId', { productId })
      .andWhere('r.is_approved = true')
      .getRawOne<{ avg: string | null; count: string }>();

    const count = Number(raw?.count || 0);
    product.ratingCount = count;
    product.ratingAvg = count
      ? Number(raw?.avg || 0).toFixed(2)
      : '0.00';
    await this.em.save(product);
  }
}
