import React, { useEffect, useState } from 'react';
import copy from '@/features/reviews/data/reviewCopy.json';
import { createCourseReview, updateCourseReview } from '@/features/reviews/data/reviewFetchers';
import type { CourseReview } from '@/features/reviews/types';

type Props = {
  slug: string;
  review: CourseReview | null;
  open: boolean;
  onClose: () => void;
  onSaved: (review: CourseReview) => void;
};

export const ReviewDialog: React.FC<Props> = ({ slug, review, open, onClose, onSaved }) => {
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [title, setTitle] = useState(review?.title ?? '');
  const [body, setBody] = useState(review?.body ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(review?.rating ?? 5);
    setTitle(review?.title ?? '');
    setBody(review?.body ?? '');
    setError('');
  }, [open, review]);

  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = review
        ? await updateCourseReview(slug, review.id, { rating, title, body })
        : await createCourseReview(slug, { rating, title, body });
      onSaved(saved);
      onClose();
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" role="presentation" onMouseDown={onClose}>
      <form className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-slate-900 p-6 shadow-2xl" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="review-dialog-title" className="font-display text-xl font-semibold text-white">{review ? copy.editReview : copy.writeReview}</h2><p className="mt-1 text-sm text-slate-400">{copy.ratingLabel}</p></div><button type="button" className="text-slate-400 hover:text-white" onClick={onClose} aria-label={copy.cancel}>×</button></div>
        <div className="mb-5 flex gap-2" role="radiogroup" aria-label={copy.ratingLabel}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} className={`text-2xl ${rating >= value ? 'text-yellow-300' : 'text-slate-600'}`} onClick={() => setRating(value)}>★</button>)}</div>
        <label className="mb-4 block text-sm text-slate-300">{copy.reviewTitle}<input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-white" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /></label>
        <label className="mb-4 block text-sm text-slate-300">{copy.reviewBody}<textarea className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-white" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} required /></label>
        {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
        <div className="flex justify-start gap-3"><button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300" onClick={onClose}>{copy.cancel}</button><button type="submit" disabled={saving} className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{copy.save}</button></div>
      </form>
    </div>
  );
};
