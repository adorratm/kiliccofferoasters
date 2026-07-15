"use client";

import { FormEvent, useEffect, useState } from "react";
import { createReview, getProductReviews } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ProductReview, ProductReviewsResponse } from "@/lib/types";

type Props = {
  productId: string;
  slug: string;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
};

export function ProductReviews({
  productId,
  slug,
  ratingAvg: initialAvg,
  ratingCount: initialCount,
}: Props) {
  const [data, setData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 5,
    title: "",
    body: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await getProductReviews(slug);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const avg = Number(data?.ratingAvg ?? initialAvg ?? 0);
  const count = Number(data?.ratingCount ?? initialCount ?? 0);
  const items = data?.items ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const token = getToken();
    if (!token) {
      setError("Yorum yazmak için giriş yapın.");
      return;
    }
    setSubmitting(true);
    try {
      await createReview(
        {
          productId,
          rating: form.rating,
          title: form.title.trim() || undefined,
          body: form.body.trim(),
        },
        token,
      );
      setForm({ rating: 5, title: "", body: "" });
      setMessage("Yorumunuz incelemeye gönderildi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yorum gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="cv-auto page-shell border-b border-outline-variant/20 py-section">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="mb-4 font-display text-4xl uppercase">Yorumlar</h2>
          <p className="font-meta text-sm uppercase tracking-widest text-primary">
            {count > 0 ? (
              <>
                {avg.toFixed(1)} / 5 · {count} değerlendirme
              </>
            ) : (
              "Henüz değerlendirme yok"
            )}
          </p>
          <p className="mt-4 max-w-sm font-sans text-base leading-relaxed text-on-surface-variant">
            Satın aldığınız kahveyi deneyimledikten sonra puan ve yorum
            bırakabilirsiniz. Yorumlar yayınlanmadan önce incelenir.
          </p>
        </div>

        <div className="space-y-10 lg:col-span-8">
          <form
            onSubmit={onSubmit}
            className="border border-outline-variant/30 bg-surface-container-low p-6"
          >
            <h3 className="mb-4 font-display text-2xl">Yorum yaz</h3>
            <div className="mb-4">
              <label className="field-label">Puan</label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    className={`h-10 w-10 border font-meta text-sm ${
                      form.rating >= n
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/40 text-secondary"
                    }`}
                    aria-label={`${n} yıldız`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="field-label">Başlık (ops.)</label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="field-input"
                maxLength={160}
              />
            </div>
            <div className="mb-4">
              <label className="field-label">Yorum</label>
              <textarea
                required
                minLength={10}
                rows={4}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                className="field-input"
              />
            </div>
            {error ? (
              <p className="mb-3 font-meta text-[11px] uppercase text-error">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mb-3 font-meta text-[11px] uppercase text-primary">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="btn-cta px-8 py-3 text-xs disabled:opacity-50"
            >
              {submitting ? "Gönderiliyor…" : "Gönder"}
            </button>
          </form>

          <div className="space-y-6">
            {loading ? (
              <p className="font-meta text-xs uppercase text-secondary">
                Yükleniyor…
              </p>
            ) : items.length === 0 ? (
              <p className="font-meta text-xs uppercase text-secondary">
                Henüz yayınlanmış yorum yok.
              </p>
            ) : (
              items.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="border-b border-outline-variant/20 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-meta text-xs uppercase tracking-widest text-primary">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>
          <p className="mt-1 font-display text-xl">
            {review.title || review.authorName}
          </p>
        </div>
        <div className="text-right font-meta text-[10px] uppercase text-secondary">
          <p>{review.authorName}</p>
          {review.isVerifiedPurchase ? <p>Doğrulanmış alım</p> : null}
          {review.createdAt ? (
            <p>{new Date(review.createdAt).toLocaleDateString("tr-TR")}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 font-sans text-base leading-relaxed text-on-surface-variant">
        {review.body}
      </p>
    </article>
  );
}
