import React, { useState } from 'react';
import copy from '@/features/reviews/data/reviewCopy.json';
import { fetchStudioReviews, replyToCourseReview } from '@/features/reviews/data/reviewFetchers';
import { useCachedData } from '@/shared/hooks/useCachedData';
import type { StudioReviewPage } from '@/features/reviews/types';
import '../reviews.css';

const EMPTY: StudioReviewPage = { items: [], page: 1, pageSize: 20, totalPages: 0, totalResults: 0 };

export const StudioReviewsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const state = useCachedData<StudioReviewPage>(['studio-reviews', page], () => fetchStudioReviews(page), { initialData: EMPTY, keepPreviousData: true });
  const data = state.data ?? EMPTY;
  const submitReply = async (reviewId: string, slug: string) => {
    const body = drafts[reviewId]?.trim();
    if (!body) return;
    setSaving(reviewId);
    try { await replyToCourseReview(slug, reviewId, body); setDrafts((current) => ({ ...current, [reviewId]: '' })); await state.refetch(); } finally { setSaving(null); }
  };
  return <main className="content-container reviews-shell" dir="rtl"><header><p className="text-sm text-cyan-300">Studio</p><h1 className="font-display text-3xl font-semibold text-white">{copy.studioTitle}</h1></header>{state.isError ? <p role="alert" className="text-rose-200">{copy.loadError}</p> : data.items.length === 0 ? <p className="rounded-2xl border border-slate-700/60 p-6 text-slate-400">{copy.noReviews}</p> : <div className="grid gap-4">{data.items.map((review) => <article className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-5" key={review.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-white">{review.courseTitle}</h2><p className="text-sm text-slate-400">{review.author.name} · <span className="review-stars">{'★'.repeat(review.rating)}</span></p></div><time className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('ar')}</time></div><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-300">{review.body}</p>{review.reply?.body ? <p className="mt-4 rounded-xl bg-cyan-400/5 p-3 text-sm text-cyan-100">{copy.replySent}</p> : <div className="mt-4 flex gap-2"><textarea className="min-h-20 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-white" placeholder={copy.replyPlaceholder} value={drafts[review.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))} maxLength={3000} /><button className="self-end rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving === review.id} onClick={() => { void submitReply(review.id, review.courseSlug); }}>{copy.reply}</button></div>}</article>)}</div>}{data.totalPages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={page <= 1} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 disabled:opacity-40" onClick={() => setPage((value) => value - 1)}>{copy.previous}</button><span className="text-sm text-slate-500">{page} / {data.totalPages}</span><button disabled={page >= data.totalPages} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 disabled:opacity-40" onClick={() => setPage((value) => value + 1)}>{copy.next}</button></div>}</main>;
};
