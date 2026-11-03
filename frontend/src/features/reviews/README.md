# Reviews — تقييمات الدورات

Learner ratings and reviews for a course, the instructor's reply, and the staff
inbox that reads them. Arabic-first, RTL, eligibility-gated.

## What lives here

| Path | Role |
| :--- | :--- |
| `components/CourseReviewsSection.tsx` | The review list + summary on the course page |
| `components/ReviewSummary.tsx` | Aggregate rating, distribution, "write a review" entry point |
| `components/ReviewDialog.tsx` | Create/edit one's own review (stars, title, body) |
| `pages/StudioReviewsPage.tsx` | Staff inbox: newest reviews across the instructor's courses (**exported, not yet routed** — see Integration status) |
| `data/reviewFetchers.ts` | The only place that talks to the review endpoints |
| `data/reviewCopy.json` | Arabic strings — no literals in JSX (the i18n gate enforces this) |
| `types.ts` | `CourseReview`, `ReviewEligibility`, `CourseReviewPage`, `StudioReviewPage` |
| `index.ts` | Public surface: the three components + the page + the types |

Anything outside this feature imports it through `features/reviews` (`index.ts`),
never a deep path.

## Endpoints

| Method | Path | Who |
| :--- | :--- | :--- |
| `GET` | `/api/courses/<slug>/reviews?sort&page&pageSize=10` | anyone who can see the course |
| `POST` | `/api/courses/<slug>/reviews/write` | eligible learner |
| `PATCH` | `/api/courses/<slug>/reviews/<reviewId>` | the author, own review |
| `POST` | `/api/courses/<slug>/reviews/<reviewId>/reply` | course staff (`reviews.reply_own`) |
| `GET` | `/api/studio/reviews?page&pageSize=20` | staff inbox |

## Integration status (Phase 14 audit)

The backend is complete, classified, tested, and seeded for the demo journey, and
this folder's components compile and are covered by their own types — but **no
page outside this feature imports it today**. Neither
`app/routes.ts`/`app/pageLoads.ts` mounts `StudioReviewsPage`, nor does
`features/courses/pages/CourseLandingPage.tsx` mount `CourseReviewsSection`;
the landing page shows only the aggregate rating in its header block
(`CourseHeaderBlock.tsx`), never the list or the write dialog.

That means, in production today: a learner cannot post a review through the UI,
and a staff member cannot open the inbox — while `POST /api/.../reviews/write`
and `GET /api/studio/reviews` work exactly as documented. Adding the two mounts
is a frontend integration task with its own tests; it is deliberately **not**
squeezed into the release phase, and is listed as an open item in
`plan/release-checklist.md` and `plan/phase-14-result.md` rather than left implied.

A second gap sits behind it: `POST /api/reviews/<reviewId>/moderate`
(`reviews.moderate`, sets `is_hidden` + `hidden_reason`) exists and is tested, but
no fetcher in `data/reviewFetchers.ts` calls it, so the staff UI has no hide
action to wire either.

## Rules that are not UI preferences

- **Eligibility is server-derived.** `ReviewEligibility` carries `minimumProgress`
  and `eligible`; the course-progress rule lives in
  `backend/features/reviews/services.py::eligibility`, and the dialog only reflects
  it. A client cannot review its way past the threshold — the write endpoint
  re-checks.
- **One review per learner per course.** `CourseReview` has a unique
  `(user, course)` pair, so the dialog is create-or-edit, never "add another".
  `PATCH` is the same body, so the UI shares one form.
- **The aggregate is computed, not typed.** `Course.rating` / `review_count` are
  recomputed from visible reviews (`_recompute_aggregate`, average quantized to
  0.1) inside a row lock. Never write `rating` from the client; hidden reviews
  leave the average.
- **A reply is one field, not a thread.** `reply_body` / `reply_author` /
  `reply_created_at` live on the review — there is no second model, and the UI
  renders the reply under its review.
- **Moderation is API-only so far**, for the reason above; hidden reviews leave
  the aggregate because `_recompute_aggregate` counts `is_hidden=False` only.
- Reviews and replies are **plain text** here (no Markdown renderer, unlike
  discussions), so nothing in a review can inject markup.

## Staff scoping

`fetchStudioReviews` returns reviews for the courses the caller can act on, and
the inbox is a **read** surface: notification-style staff prompts for new reviews
come from the dashboard notification hooks in
`backend/features/dashboard/event_receiver.py`, not from this page polling.

Backend contract and business rules: `backend/features/reviews/` (app, services,
serializers, tests) — see `docs/07-backend-contract.md` and
`docs/09-access-control.md` for `reviews.write` / `reviews.reply_own` /
`reviews.moderate`.
