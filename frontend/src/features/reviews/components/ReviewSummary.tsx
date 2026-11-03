import React from 'react';
import copy from '@/features/reviews/data/reviewCopy.json';
import type { ReviewSummary as ReviewSummaryData } from '@/features/reviews/types';

type Props = { summary: ReviewSummaryData };

export const ReviewSummary: React.FC<Props> = ({ summary }) => {
  const average = summary.rating === null ? '—' : summary.rating.toFixed(1);
  const total = Math.max(1, summary.reviewCount);
  return (
    <section className="reviews-summary rounded-3xl border border-slate-700/60 bg-slate-950/35 p-5" aria-label={copy.summaryLabel} dir="rtl">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <span className="text-4xl font-display font-semibold text-white">{average}</span>
        <span className="review-stars" aria-label={`${average} / 5`}>★★★★★</span>
        <span className="text-sm text-slate-400">{summary.reviewCount} {copy.reviewsLabel}</span>
      </div>
      <div className="review-distribution" aria-label={copy.summaryLabel}>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[String(rating)] ?? 0;
          return (
            <div className="review-distribution-row text-sm text-slate-300" key={rating}>
              <span>{rating}</span>
              <span className="review-distribution-track" aria-hidden="true"><span className="review-distribution-fill" style={{ width: `${(count / total) * 100}%` }} /></span>
              <span className="text-end text-slate-500">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
