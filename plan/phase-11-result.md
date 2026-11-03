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

## Verification (full §0.4 gate rerun at closeout, 2026-11-03)

All gates green on `Feature/LearningLoop` after the final edit pass:

- `ruff check` — all checks passed (36 findings fixed: B023 loop capture in `certificate_services.py` via lambda default binding, B904 `raise ... from exc` in `live_sessions_api.py`, SIM105 `contextlib.suppress` in `discussions/services.py`, SIM108 ternary, RUF002 en-dash, RUF059/F841/F401 unused bindings/imports in reviews/announcements/studio; `import contextlib` added).
- `ruff format --check` — 268 files formatted.
- `python manage.py check` — no issues.
- `python manage.py makemigrations --check --dry-run` — no pending changes.
- `python manage.py spectacular --fail-on-warn` — zero warnings.
- Full backend suite (serial runner): **697 tests OK, 1 skipped**. Three `features.common` failures were fixed by adding the `liveSessionStatesRefreshed` family (Phase 11 live-session state refresh wired into `cleanup_expired`) to the three pinned expectations in `features/common/tests.py`. Note: `--parallel` crashes with `TypeError: cannot pickle 'traceback' object` whenever any test fails; run serially.
- `python manage.py migrate` (dev DB) — Phase 10/11 migrations (`discussions.0001`, `quizzes.0001/0002`, `reviews.0001`) applied OK.
- Frontend `npm run lint` — 0 problems (was 17 errors / 4 warnings). Loaders refactored to the react-hooks `set-state-in-effect`-safe promise-chain idiom (`.then()` chains + derived `loadedKey`/snapshot loading, no sync `setState` in effect bodies) across `DiscussionTab`, `LearnerAnnouncementList`, `StudioAnnouncementList`, `QuizListView`, `QuizEditorView`, `QuizResultsView`, `LiveSessionsManager`, `StudioStudentsPage`; form-reset effects replaced with keyed conditional remounts (`ReviewDialog` via parent key, `QuizQuestionForm`, `StudioAnnouncementComposer`); `playerPanels.tsx` moved from `data/` to `components/layout/PlayerPanels.tsx` (react-refresh fix); `LiveSessionCountdown` keeps one inline `react-hooks/purity` disable for the unavoidable wall-clock read (why-commented).
- `npx tsc -b` — clean (stale "cannot find module" errors for `@vimeo/player`/`dompurify`/`marked`/firebase were incremental-build artifacts; packages are present).
- `npm test` (vitest) — **194 passed (25 files)**; `CourseLandingPage.test.tsx` updated with a `useAuth` stub since the page now reads the signed-in identity.
- `npm run build` — production build green (2258 modules).

## Handoff notes

- The branch is intentionally left separate from `main` for manual continuation.
- Payment, email, hosted files, and community attachments remain Phase 16 scope and require provider/product-owner decisions before implementation.
- No production deployment or merge to protected `main` is claimed by this closeout.
- Frontend lint idiom (locked this session): loaders use `.then()` promise chains with derived loading (`loadedKey`/snapshot key state); never call `setState` synchronously inside an effect body. Dialog/composer resets use keyed conditional remounts, not reset effects. `LiveSessionCountdown` carries the only `react-hooks/purity` disable (wall clock).
- ESLint boundary config now includes the `discussions`/`reviews`/`studio` feature folders, with targeted allow-lists for courses→`DiscussionTab`+learner announcements and studio→`@/features/auth/types`; `@typescript-eslint/no-unused-vars` added with `^_` ignore patterns.
