import { Reveal } from "@/components/Reveal";
import { getLegalDocument } from "@/lib/api";
import { getSiteSettings } from "@/lib/cms";
import {
  applyLiveSellerContact,
  buildLegalFallback,
  sellerFromSettings,
} from "@/lib/legal-content";

type Props = {
  slug: string;
};

export async function LegalPage({ slug }: Props) {
  const [doc, settings] = await Promise.all([
    getLegalDocument(slug),
    getSiteSettings(),
  ]);

  const seller = sellerFromSettings(settings);
  const fallbackMap = buildLegalFallback(seller);
  const fallback = fallbackMap[slug] ?? {
    title: slug,
    content: "Bu yasal metin yakında yayınlanacaktır.",
  };

  const title = doc?.title || fallback.title;
  const apiContent = doc?.content?.trim() || "";
  const isPlaceholder =
    !apiContent || apiContent.includes("örnek içerik");
  const rawContent = isPlaceholder ? fallback.content : apiContent;
  const content = applyLiveSellerContact(rawContent, seller);

  return (
    <article className="page-shell mx-auto max-w-3xl py-16 md:py-24">
      <div className="page-enter">
        <div className="mb-3 font-meta text-xs uppercase tracking-widest text-primary">
          Legal_Document / {slug}
        </div>
        <h1 className="font-display text-4xl leading-none md:text-5xl">{title}</h1>
        {doc?.version ? (
          <p className="mt-4 font-meta text-[11px] uppercase text-secondary">
            Sürüm {doc.version}
          </p>
        ) : null}
      </div>
      <Reveal className="mt-10" variant="scale" delay={120}>
        <div className="prose-legal whitespace-pre-wrap border border-outline-variant/20 bg-surface-container-low p-6 font-sans text-base leading-7 text-secondary md:p-10">
          {content}
        </div>
      </Reveal>
    </article>
  );
}
