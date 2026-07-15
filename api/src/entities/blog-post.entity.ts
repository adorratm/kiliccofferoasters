import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@entities/base.entity';

@Entity('blog_posts')
export class BlogPost extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 180 })
  slug!: string;

  @Column({ type: 'varchar', length: 220 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  excerpt!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImageUrl!: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 120, nullable: true })
  authorName!: string | null;

  @Column({ name: 'tags', type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ name: 'seo_title', type: 'varchar', length: 220, nullable: true })
  seoTitle!: string | null;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription!: string | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'tr' })
  locale!: string;
}
