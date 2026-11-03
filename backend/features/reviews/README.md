# Reviews — التقييمات

The reviews feature owns learner course reviews, cached course rating aggregates, one public course-team reply, and soft moderation. It does not alter the `courses` model or public course serializers.

## Routes

- `GET /api/courses/<slug>/reviews` — public summary, distribution, and paged visible reviews (`sort=newest|highest|lowest`).
- `POST /api/courses/<slug>/reviews/write` — eligible learner creates the single review for the course.
- `PATCH /api/courses/<slug>/reviews/<review-id>` — the review owner edits their review.
- `POST /api/courses/<slug>/reviews/<review-id>/reply` — an owner/co-instructor with `reviews.reply_own` posts one public reply.
- `POST /api/reviews/<review-id>/moderate` — a moderator with `reviews.moderate` hides or restores a review; hidden reviews require a reason and are never deleted.
- `GET /api/studio/reviews` — course-team inbox for new visible reviews.

Eligibility uses the existing `dashboard.Enrollment.progress` value and `REVIEW_MIN_PROGRESS` when configured, defaulting to 20. Every write recomputes visible-review average/count while the course row is locked, so existing `Course.rating` and `Course.review_count` remain the catalog contract. Saving the course activates the existing course cache invalidation signal.

The app exposes its own `urls.py` and `AppsConfig`; mounting it in `config/settings.py` and `config/urls.py` is intentionally left to the integration owner because the Phase 11.3 task forbids changes to shared settings/root URL files. No migration is included per the task instructions.
