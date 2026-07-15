import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { getBlogPosts } from "@/lib/api";
import { getSiteSettings } from "@/lib/cms";
import { productImage } from "@/lib/format";
import { buildBlogIndexMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildBlogIndexMetadata(settings);
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

type Props = {
  searchParams: Promise<{ page?: string; tag?: string }>;
};

export default async function BlogIndexPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const tag = params.tag || undefined;
  const paged = await getBlogPosts({
    page,
    limit: 9,
    tag,
    sort: "publishedAt",
    order: "desc",
  });

  return (
    <div>
      <section className="relative min-h-[42vh] overflow-hidden border-b border-outline-variant/20">
        <Image
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=80"
          alt="Kılıç Coffee Roasters blog"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/25" />
        <div className="page-shell relative flex min-h-[42vh] flex-col justify-end py-16 md:py-20">
          <Reveal>
            <p className="font-meta text-xs uppercase tracking-widest text-primary">
              Journal / Notes
            </p>
            <h1 className="mt-3 font-display text-5xl leading-none tracking-tight text-white md:text-7xl">
              Blog
            </h1>
            <p className="mt-4 max-w-xl font-meta text-xs uppercase leading-relaxed tracking-widest text-white/75">
              Kavrum, demleme ve atölyeden notlar
            </p>
          </Reveal>
        </div>
      </section>

      <div className="page-shell py-16 md:py-24">
        {paged.items.length === 0 ? (
          <Reveal className="industrial-border bg-surface-container-low p-8 md:p-10">
            <p className="font-meta text-[11px] uppercase tracking-widest text-primary">
              Empty_Feed
            </p>
            <h2 className="mt-3 font-display text-3xl">Henüz yazı yok</h2>
            <p className="mt-4 font-meta text-xs uppercase text-secondary">
              Yeni yazılar yakında burada yayınlanacak.
            </p>
          </Reveal>
        ) : (
          <div className="space-y-0 border-t border-outline-variant/20">
            {paged.items.map((post, i) => {
              const cover = productImage(post.coverImageUrl, post.slug);
              return (
                <Reveal
                  key={post.id}
                  delay={Math.min(i, 5) * 50}
                  className="group grid border-b border-outline-variant/20 lg:grid-cols-12"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="relative block min-h-56 overflow-hidden bg-surface lg:col-span-5 lg:min-h-72"
                  >
                    <Image
                      src={cover}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 42vw"
                    />
                  </Link>
                  <div className="flex flex-col justify-center px-0 py-8 lg:col-span-7 lg:px-10 lg:py-12">
                    <p className="font-meta text-[11px] uppercase tracking-widest text-secondary">
                      {formatDate(post.publishedAt)}
                      {post.authorName ? ` · ${post.authorName}` : ""}
                    </p>
                    <h2 className="mt-3 font-display text-3xl leading-none tracking-tight md:text-4xl">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-4 max-w-xl text-base leading-relaxed text-secondary">
                        {post.excerpt}
                      </p>
                    ) : null}
                    {post.tags?.length ? (
                      <p className="mt-5 font-meta text-[10px] uppercase tracking-widest text-secondary">
                        {post.tags.join(" · ")}
                      </p>
                    ) : null}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="btn-ghost mt-6 w-fit px-5 py-3 text-[10px]"
                    >
                      Devamını oku
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {paged.totalPages > 1 ? (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={`/blog?page=${page - 1}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                className="btn-ghost px-5 py-3 text-[10px]"
              >
                Önceki
              </Link>
            ) : null}
            <span className="font-meta text-[11px] uppercase text-secondary">
              {page} / {paged.totalPages}
            </span>
            {page < paged.totalPages ? (
              <Link
                href={`/blog?page=${page + 1}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                className="btn-ghost px-5 py-3 text-[10px]"
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
