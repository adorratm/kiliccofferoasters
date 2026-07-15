import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/api";
import { getSiteSettings } from "@/lib/cms";
import { productImage } from "@/lib/format";
import {
  JsonLd,
  blogPostJsonLd,
  breadcrumbJsonLd,
  buildBlogPostMetadata,
} from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getBlogPostBySlug(slug),
    getSiteSettings(),
  ]);
  if (!post) return { title: "Yazı" };
  return buildBlogPostMetadata(post, settings);
}

export async function generateStaticParams() {
  const paged = await getBlogPosts({ limit: 50, sort: "publishedAt" });
  return paged.items.map((p) => ({ slug: p.slug }));
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getBlogPostBySlug(slug),
    getSiteSettings(),
  ]);

  if (!post) notFound();

  const cover = productImage(post.coverImageUrl, post.slug);

  return (
    <article>
      <JsonLd data={blogPostJsonLd(post, settings)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana sayfa", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <section className="relative min-h-[52vh] overflow-hidden border-b border-outline-variant/20 md:min-h-[62vh]">
        <Image
          src={cover}
          alt={post.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/20" />
        <div className="page-shell relative flex min-h-[52vh] flex-col justify-end py-14 md:min-h-[62vh] md:py-20">
          <Reveal>
            <p className="font-meta text-xs uppercase tracking-widest text-primary">
              Blog / {post.slug}
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl leading-none tracking-tight text-white md:text-6xl lg:text-7xl">
              {post.title}
            </h1>
            <p className="mt-5 font-meta text-[11px] uppercase tracking-widest text-white/70">
              {formatDate(post.publishedAt)}
              {post.authorName ? ` · ${post.authorName}` : ""}
              {post.tags?.length ? ` · ${post.tags.join(" · ")}` : ""}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="page-shell mx-auto max-w-3xl py-14 md:py-20">
        {post.excerpt ? (
          <Reveal>
            <p className="mb-10 border-l-2 border-primary pl-5 text-lg leading-relaxed text-secondary md:text-xl">
              {post.excerpt}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={80}>
          <div
            className="prose-blog space-y-5 font-sans text-base leading-8 text-secondary [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-foreground [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:text-foreground [&_p]:mb-0 [&_strong]:text-foreground"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </Reveal>

        <Reveal delay={120} className="mt-14 border-t border-outline-variant/20 pt-8">
          <Link href="/blog" className="btn-ghost px-5 py-3 text-[10px]">
            ← Tüm yazılar
          </Link>
        </Reveal>
      </div>
    </article>
  );
}
