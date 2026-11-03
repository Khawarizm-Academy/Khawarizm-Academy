# Phase 11 — Learning Loop (result)

Branch: `Feature/LearningLoop`. Closeout: 2026-11-03.

## Delivered

- Server-derived lesson progress with curriculum revision tracking, monotonic lesson completion, milestone notifications, recomputation management command, and certificate issuance/revocation display.
- Certificate verification and learner certificate presentation with serials, snapshots, issue/revocation metadata, and Arabic learner-facing copy.
- Reviews app with eligibility rules, one-review-per-course enforcement, moderation, instructor reply support, rating aggregates, and staff notifications for new reviews.
- Discussions app with lesson-scoped threads, sanitized Markdown, learner/staff permissions, moderation, accepted answers, quota protection, learner-player Discussion tab, timestamp jump-to-video behavior, and notifications for new questions and instructor replies.
- Centralized dashboard notification delivery with preference checks, deduplication, unread-count caching, enrollment/course/review/discussion/certificate event hooks, and reminder command support.
- Course detail capability flags and frontend DTO/context wiring for discussion permissions.
- Additive migrations for dashboard/courses model extensions plus new discussions and reviews tables.
- Phase 16 added to `plan/PLAN.md`: product expansion covering paid enrollment, email delivery, and community attachments after release hardening.

## Release-blocking fixes found during closeout

- Corrected a Django 6.1 `CheckConstraint(condition=...)` compatibility issue in reviews.
- Corrected a malformed Arabic weekday expression in course services that prevented Django startup.
- Corrected the Django ORM import location for `Greatest` in the Studio roster view.
- Corrected announcement quota admin metadata that referenced timestamps not present on that model.

## Verification

The migration generator and drift check pass with no pending changes. `python manage.py check` passes, strict `python manage.py spectacular --fail-on-warn` passes with zero warnings, and the focused backend run passes: 94 tests in 11.656 seconds. The frontend TypeScript/Vite production build passes; Vite reports only the existing large-chunk advisory for the HLS bundle. The full lint suite and complete repository test suite were not rerun during this handoff.

## Handoff notes

- The branch is intentionally left separate from `main` for manual continuation.
- Payment, email, hosted files, and community attachments remain Phase 16 scope and require provider/product-owner decisions before implementation.
- No production deployment or merge to protected `main` is claimed by this closeout.
