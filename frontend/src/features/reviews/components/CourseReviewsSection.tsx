import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import copy from '@/features/reviews/data/reviewCopy.json';
import { fetchCourseReviews } from '@/features/reviews/data/reviewFetchers';
import type { CourseReviewPage, ReviewSort } from '@/features/reviews/types';
import { ReviewDialog } from './ReviewDialog';
import { ReviewSummary } from './ReviewSummary';
import '../reviews.css';

type Props = { slug: string };
const EMPTY: CourseReviewPage = { summary: { rating: null, reviewCount: 0, distribution: {} }, items: [], page: 1, pageSize: 10, totalPages: 0, totalResults: 0, eligibility: { enrolled: false, progress: 0, minimumProgress: 20, eligible: false }, ownReview: null };

export const CourseReviewsSection: React.FC<Props> = ({ slug }) => {
  const { user } = useAuth();
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const state = useCachedData<CourseReviewPage>(['course-reviews', slug, sort, page], () => fetchCourseReviews(slug, sort, page), { initialData: EMPTY, keepPreviousData: true });
  const data = state.data ?? EMPTY;
  const canReview = data.eligibility.eligible;

  return <section className="reviews-shell mt-10" aria-labelledby="course-reviews-title" dir="rtl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="course-reviews-title" className="font-display text-2xl font-semibold text-white">{copy.reviewsLabel}</h2>{!data.eligibility.eligible && user && <p className="mt-1 text-sm text-slate-400">{data.eligibility.enrolled ? copy.ineligible : copy.eligibleHint}</p>}</div><div className="flex items-center gap-2"><select className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300" value={sort} onChange={(event) => { setSort(event.target.value as ReviewSort); setPage(1); }} aria-label={copy.summaryLabel}><option value="newest">{copy.newest}</option><option value="highest">{copy.highest}</option><option value="lowest">{copy.lowest}</option></select>{user && canReview && <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => setDialogOpen(true)}>{data.ownReview ? copy.editReview : copy.writeReview}</button>}</div></div>
    <ReviewSummary summary={data.summary} />
    {state.isError ? <p role="alert" className="rounded-2xl border border-rose-400/30 p-4 text-rose-200">{copy.loadError}</p> : data.items.length === 0 ? <p className="rounded-2xl border border-slate-700/60 p-6 text-center text-slate-400">{copy.noReviews}</p> : <div className="grid gap-4">{data.items.map((review) => <article className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-5" key={review.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-white">{review.author.name}</strong><span className="mx-2 text-slate-600">·</span><span className="review-stars" aria-label={`${review.rating} / 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><time className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('ar')}</time></div>{review.title && <h3 className="mt-3 font-semibold text-slate-100">{review.title}</h3>}<p className="mt-2 whitespace-pre-wrap leading-7 text-slate-300">{review.body}</p>{review.reply?.body && <div className="mt-4 border-s-2 border-cyan-400/60 bg-cyan-400/5 p-3"><p className="text-xs text-cyan-200">{copy.replyLabel} · {review.reply.author.name}</p><p className="mt-1 text-sm leading-6 text-slate-300">{review.reply.body}</p></div>}</article>)}</div>}
    {data.totalPages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={page <= 1} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 disabled:opacity-40" onClick={() => setPage((value) => value - 1)}>{copy.previous}</button><span className="text-sm text-slate-500">{page} / {data.totalPages}</span><button disabled={page >= data.totalPages} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 disabled:opacity-40" onClick={() => setPage((value) => value + 1)}>{copy.next}</button></div>}
    <ReviewDialog slug={slug} review={data.ownReview} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => { void state.refetch(); }} />
  </section>;
};
