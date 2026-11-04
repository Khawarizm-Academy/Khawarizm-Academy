# PLAN.md — Khawarizm Academy: Roles, Video Platform, Instructor Studio & Production Completion

> **Audience:** an AI coding agent that will execute this plan end to end, one phase at a time.
> **Author context:** written 2026-11-02 after a full read of the repository at commit `f09cbe8` (`main`).
> **Scope:** (1) a Discord-style Role Manager with per-action permissions, (2) a provider-agnostic video system that works with Telegram, Google Drive and any other provider, with or without FFmpeg, (3) an instructor Studio inside the dashboard, (4) every missing feature required to make the platform a real, ready-to-use product.
> **Rule zero:** do not trust this file over the code. Every claim marked **[verified]** was read in the repo on the date above; anything marked **(?)** was not verified and you must check it before relying on it. When code and plan disagree, stop, record the discrepancy in `plan/phase-<n>-result.md`, and fix the plan before continuing.

<!-- Khawarizm Academy execution plan. Written 2026-11-02 against main @ f09cbe8. -->

## Table of contents

- §0 How to use this file · §1 Verified baseline · §2 Gap analysis · §3 Decision log · §4 Phase map
- PHASE 0 — Baseline, integration branch, frontend CI, safety net
- PHASE 1 — Access control core (backend) + the small frontend slice that consumes it
- PHASE 2 — Role Manager: API + admin UI (the Discord-style manager)
- PHASE 3 — Course ownership, lifecycle, and the lesson model
- PHASE 4 — Video platform backend (any provider, with or without FFmpeg, entitled playback)
- PHASE 5 — Video player system (frontend)
- PHASE 6 — Quiz & exam system (server-graded)
- PHASE 7 — Studio shell: navigation, design language, home, course list
- PHASE 8 — Studio: course editor, curriculum builder, publishing
- PHASE 9 — Studio: video library & resumable uploader
- PHASE 10 — Studio: quiz builder, live sessions, announcements, students, analytics
- PHASE 11 — The learning loop: progress, certificates, reviews, discussions, notifications
- PHASE 12 — Admin console upgrades & legacy retirement
- PHASE 13 — Hardening: security, performance, accessibility, observability, data lifecycle
- PHASE 14 — Seed data, documentation, end-to-end smoke, release
- BACKLOG — deliberately out of scope (each with the trigger that promotes it)
- APPENDICES

---

## 0. How to use this file

### 0.1 Reading order (do this first, in order, before writing any code)

1. `PROJECT_PROFILE.md` — stack, commands, pitfalls (the Origin-header pitfall alone will waste an hour if you skip it).
2. `plan/CONVENTIONS.md` and `backend/features/README.md` — the folder contract and the rules every feature follows.
3. `docs/00-overview.md` → `docs/08-backend-architecture.md`, especially `07-backend-contract.md` (API surface) and `04-loading-caching-and-motion.md` (skeletons, SWR cache, motion).
4. `backend/features/videohosting/README.md` and `docs/video-hosting/google-drive-integration.md`.
5. `.agents/skills/README.md` — load the skills named in each phase's **Skills** line (they exist in the repo: `be-architecture`, `be-auth-and-security`, `be-file-uploads-and-media-pipeline`, `fe-component-architecture`, `design-dashboards-and-data-viz`, `design-motion-implementation`, `fe-rtl-and-i18n`, `fe-accessibility`, and others).
6. `REPORT.md` — what was last verified and which gates were green.

### 0.2 Execution protocol (applies to every phase)

For each phase, in order:

1. **Branch** off the integration branch (`Feature/AccessStudio`, created in Phase 0) named as given in the phase header. Never commit to `main` directly.
2. **Create a task list** from the phase's task table. One task = one commit where practical.
3. **Implement** following the phase's tasks. Backend first, then the frontend consumer, in the same phase when the phase says "coordinated".
4. **Write tests as you go** (see each phase's **Tests** list). A task without its tests is not done.
5. **Run the gates** (§0.4). All must be green before the PR.
6. **Write `plan/phase-<n>-result.md`**: what changed, gates output, deviations from this plan and why, open items. This is the project's existing practice (`plan/phase-*-result.md`).
7. **PR into the integration branch.** After the final phase (14), the integration branch merges to `main` and is tagged `access-studio-v1`.

Commit message style (existing repo style): `feat(access): add role registry`, `fix(videohosting): ...`, `refactor(courses): ...`, `docs(plan): ...`, `test(quizzes): ...`.

Every commit that touches the model layer ends with the attribution trailer your harness requires.

### 0.3 Ground rules (inherited from the repo — these are not optional)

| # | Rule | Source |
| :--- | :--- | :--- |
| R1 | Backend feature folder contract: `apps.py, models.py, serializers.py, services.py, views.py, urls.py, admin.py, tests.py, migrations/, README.md`. | `backend/features/README.md` |
| R2 | **camelCase only in serializers/fetchers.** Python is snake_case end to end; the SPA reads camelCase. | CONVENTIONS rule 5 |
| R3 | **Views stay thin** (~≤25 lines): resolve caller → validate → call one service → serialize. Business rules live in `services.py`. | CONVENTIONS rule 3 |
| R4 | **Serializers never hit the DB.** | CONVENTIONS rule 2 |
| R5 | Only `config/settings.py` reads the environment. Features read settings attributes. | CONVENTIONS rule 4 |
| R6 | Every user-facing backend string is a named constant in `features/common/messages.py`. | CONVENTIONS rule 6 |
| R7 | Data over branches: dispatch tables (dicts), not growing `if/elif` chains (see `catalog/filters.py`, `adminconsole/services.py::_COERCERS`, `providers/SPECS`). | CONVENTIONS rule 7 |
| R8 | One-line *why* comments; no banner comments. | CONVENTIONS rule 8 |
| R9 | Errors use the shared envelope `{detail, code, fields?}` via `features/common/errors.py`. New error classes go there. | `plan/phase-8-result.md` |
| R10 | Every new/changed endpoint carries `@extend_schema` and `python manage.py spectacular --fail-on-warn` stays at **zero warnings**; `operationId`s are unique. | PROJECT_PROFILE §3 |
| R11 | Public GETs that are cached register invalidation in `features/common/cache_invalidation.py::MODEL_NAMESPACES`. A model that changes what a cached payload contains **must** be added there. | [verified] `cache_invalidation.py` |
| R12 | Query counts are pinned with `assertNumQueries`; if you legitimately change a pinned count, update the guard in the same commit and justify it in the result note. | `plan/phase-6-result.md` |
| R13 | Frontend: feature-first (`src/features/<f>/{components,data,types.ts}`), one-way imports `app → features → shared`; **features never import each other**, with two **designated service-feature exceptions** that the code already relies on [verified: `admin`, `dashboard`, `profile` import `features/auth`; `courses` imports `features/videohosting`]: `@/features/auth/context/*` (the signed-in identity and `useCan`) and `@/features/videohosting/*` (player engines/fetchers). Everything else a second feature needs moves to `shared/`. | `docs/02-architecture.md` |
| R14 | Frontend: Arabic-first RTL, logical properties only (`ms-/me-/ps-/pe-/start/end`), tokens only (never raw hex, never arbitrary Tailwind colors), lucide icons only, copy lives in JSON/dictionaries, not inline in components. | `docs/01-design-system.md` |
| R15 | Frontend data: per-feature `*Fetchers.ts` over `shared/lib/apiClient.ts`, cached with `useCachedData`; "only the data section updates" (shell stays mounted); two-tier skeletons. | `docs/04-…` |
| R16 | Every outbound HTTP call has an explicit `timeout=`. | [verified] existing convention |
| R17 | Secrets never reach the frontend, logs, or git. Provider credentials live in env or in DB rows that no serializer exposes. | `videohosting/README.md` |
| R18 | Migrations are additive and backward-compatible. **Two intentional exceptions are authorised by this plan** (see §0.5 A3): idempotent seed/backfill `RunPython` steps. No destructive migration anywhere. | CONVENTIONS rule 9 (amended) |

### 0.4 Gates (must be green before every PR)

Backend (`cd backend && source .venv/bin/activate`):

```bash
ruff check . && ruff format --check .
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py spectacular --fail-on-warn
python manage.py test --parallel          # CI runs: test -v2 --parallel
python manage.py check --deploy           # prod env; 1 known accepted warning (security.W021)
```

Frontend (`cd frontend`):

```bash
npm run lint
npm run build         # tsc -b + vite build — must be clean
npm test              # vitest run
```

Behavioral smoke (not just types): cold load shows the skeleton once, cached returns are instant, filter changes never flash the skeleton, back/forward restores scroll (`README.md` §Verification).

> **Pitfall (verified):** every `/api/` request needs an allowed `Origin: http://localhost:5173` header or it is 403 (`config/middleware.py`). Every `curl` in this plan assumes `-H "Origin: http://localhost:5173"`.

### 0.5 Convention amendments (this plan IS the "plan update" CONVENTIONS rule 1 requires)

| ID | Amendment | Why |
| :--- | :--- | :--- |
| A1 | New backend apps allowed: `access`, `studio`, `quizzes`. `access` may contain `registry.py` (code-defined permission catalog) and `permissions.py` (DRF classes). | Precedents: `catalog/filters.py`, `providers/__init__.py` registry, `auth/permissions.py`. |
| A2 | `videohosting` and `courses` may contain `services.py` (the folder contract already allows it). | Entitlement + lifecycle rules do not belong in views. |
| A3 | Data migrations are allowed **only** as idempotent `RunPython` steps that (a) create system rows (`access` roles) or (b) backfill a newly added column. Each must be reversible as a no-op and safe to run twice. | CONVENTIONS rule 9 governed the earlier alignment plan; roles cannot exist without seed rows. |
| A4 | Frontend: new feature folder `src/features/studio/`; new non-component folder `src/features/videohosting/engines/`; new shared module `src/shared/lib/permissions.ts`. | Engines are not components or hooks; permission helpers are used by `app/` and several features. |
| A5 | Background work stays "management command + HTTP cron endpoint" (as `cleanup_expired` does). No Celery/Redis requirement is introduced. | Out-of-scope ledger (`plan/session-knowledge.md` §8) still holds. |

---

## 1. Verified baseline — what exists today

| Area | Fact | Evidence |
| :--- | :--- | :--- |
| Stack | Django 6.1.2 + DRF 3.18.3 (function views), SQLite dev / Postgres prod via `DATABASE_URL`; React 19 + TS + Vite 8 + Tailwind v4 + hls.js + lucide, custom router (no router lib), no global state lib. | `requirements.txt`, `package.json` |
| Tests | 451 backend tests, 76 vitest tests at last report; CI = `.github/workflows/backend.yml` only. **No frontend CI exists.** | `REPORT.md`, `.github/workflows/` |
| Roles | `User.role ∈ {student, instructor, admin}` (a `TextChoices` enum), `is_admin = role==admin or is_staff`. One DRF permission class: `IsAdminRole`. | `auth/models.py`, `auth/permissions.py`, `common/choices.py::Role` |
| Role on the client | `AuthUser.role` + `isAdmin`. The only route flags are `requiresAuth` / `requiresAdmin`. `isAdmin` is read in exactly 6 frontend files. | `auth/types.ts`, `RouteGuard.tsx`, `routes.json` |
| Account services | Role changes sync `is_staff`, reject self-demotion/self-delete, call `ensure_profile`. Audit trail for auth = `AuthEvent`. | `adminconsole/services.py`, `auth/models.py` |
| Admin console | Schema-driven content editor for courses/scholarships/events/competitions, user CRUD, sessions, analytics, video admin. All gated by `IsAdminRole`. | `adminconsole/*`, `videohosting/console/*` |
| Courses | `Course → CourseModule → CourseLesson`; `CourseLiveSession`; `CourseProblem`/`CourseProblemOption` (global practice set, **not course-scoped**). Course detail is constant 4 queries. | `courses/models.py`, `courses/views.py` |
| Course authorship | `Course.instructor` is a **free-text `CharField`**. No owner FK. No status. | `courses/models.py:29` |
| Learner state | `dashboard.Enrollment` (course-level `progress`, `last_lesson`), `Certificate`, `FavoriteCourse`, notifications. **No per-lesson progress.** | `dashboard/models.py` |
| Video control plane | Provider registry (`SPECS = (GOOGLE_DRIVE, TELEGRAM)`), `VideoAsset/Rendition/Segment`, hashed IP-bound `StreamToken`, AES-128 HLS, `__TOKEN__` playlist rewriting, 302 segment redirects, raw route for un-packaged Drive assets, staged diagnostics, Drive OAuth persisted in `DriveGrant`. | `videohosting/*` |
| FFmpeg control | Global `VideoSystemConfig.use_ffmpeg` singleton (admin toggle); ingest has `PACKAGE_MODES = ("auto","force","never")`; FFmpeg is guarded off serverless. | `models.py`, `ingest.py:30` |
| Player (frontend) | `PlayerStage` + `useHlsPlayback` (hls/raw) + `WatermarkOverlay` + a `videoPlayerStore` that mirrors a bound `<video>` or **falls back to a simulated ticker**. `videoProviders.ts` lists `mock/youtube/baisalkah/videocipher` as a *capability contract only*; every course resolves to `mock`. | `PlayerStage.tsx`, `videoProviders.ts`, `videoPlayerStore.ts` |
| Dashboard | Learner-only. Views switch by `?view=` and `dashboardNav.json`; route is `immersive`. | `dashboardNav.json`, `routes.json`, `DashboardShell.tsx` |
| Router limits | `matchRoute` requires **equal segment counts** — there are no wildcard/nested sub-routes. Every deep route must be declared explicitly in `routes.json` + `PAGE_BY_PATH` + `pageLoads.ts`. | `app/routes.tsx` |
| Design system | "Observatory & Cyber-Intelligence": navy canvas, **cyan = courses, gold = scholarships/achievement**, IBM Plex Sans Arabic / Tajawal / IBM Plex Mono, locked Tailwind color families. | `docs/01-design-system.md` |

---

## 2. Gap analysis — what is missing or wrong (these drive the phases)

Severity: **S1** = security/data-exposure, **S2** = blocks a requested feature, **S3** = product completeness.

| ID | Sev | Finding | Evidence | Fixed in |
| :--- | :--- | :--- | :--- | :--- |
| G1 | **S1** | **Any signed-in user can mint a playback token for any `ready` video.** `video_token_view` is `IsAuthenticated` only; no enrollment, ownership, or free-preview check exists anywhere in `videohosting` (grep for `enroll` returns nothing). Paid and unpublished content is therefore watchable by any account. | `videohosting/views.py:144-162` | Phase 4 |
| G2 | **S1** | **Practice-problem answers are shipped to the browser.** `course_problem()` returns `correctOptionId`, `explanation` and `hint` for every problem, to anonymous callers. Acceptable for ungraded practice, impossible for exams. | `courses/serializers.py:95-104`, `courses/views.py` (`auth=None`) | Phase 6 |
| G3 | S2 | Authorization is binary (`IsAdminRole`). "Instructor" is a label with no capabilities; the instructor role cannot do anything the student cannot. No per-action permissions, no role hierarchy, no audit of role changes. | `auth/permissions.py` | Phases 1–2 |
| G4 | S2 | No course ownership. Course authorship is a string, so "my courses", "edit only mine", and "co-instructor" are impossible. | `courses/models.py:29` | Phase 3 |
| G5 | S2 | No course lifecycle. Everything is implicitly published; once instructors create content, drafts would leak into the cached catalog, home rails and public course-detail endpoint. | `catalog`, `home`, `courses/views.py::course_detail_view` | Phase 3 |
| G6 | S2 | Lesson↔video link is a naming convention computed **in the frontend** (`<courseId>--<lessonId>`). `CourseLesson` has no kind, no video FK, no free-preview flag, no content body. | `videoSlug.ts`, `courses/models.py:77` | Phase 3 |
| G7 | S2 | Telegram has no raw path (`raw_stream` exists only for Drive). With FFmpeg off, a Telegram upload stays `staged` and is unwatchable. | `providers/google_drive.py:343`; no `raw_stream` in `telegram.py` | Phase 4 (spike S-1) |
| G8 | S2 | Only two storage providers; no embed or external-URL path, so "any video provider" is not true yet. The frontend `videoProviders.ts` names YouTube/baisalkah/VideoCipher but nothing implements them. | `providers/__init__.py:14`, `videoProviders.ts` | Phases 4–5 |
| G9 | S2 | Playback mode is **inferred** from `master_playlist` being empty (`is_raw = not master_playlist.strip()`), not stored. Adding more modes on top of an inference will rot. | `videohosting/views.py:157` | Phase 4 |
| G10 | S2 | Uploads are admin-only, multipart through Django into a temp file (2 GB hard-coded cap in a view), then a daemon thread. No chunking/resume, no quota, no instructor path, unusable on serverless. `UploadSession` exists but no live code path writes it. | `console/views.py:92,266-314`, `videohosting/README.md` | Phase 4 |
| G11 | S2 | Raw mode **proxies video bytes through Django** (`StreamingHttpResponse`, `no-store`) — contradicting the README's "backend never proxies a video byte". Every seek re-streams from Drive through the API. | `videohosting/views.py:304-323` | Phase 4 (budget + guard) |
| G12 | S3 | No per-lesson watch progress, resume position, or completion signal. Course `progress` is a client-pushed integer. | `dashboard/models.py::Enrollment`, `courses/services.py` | Phases 4–5, 11 |
| G13 | S3 | No quiz/exam model. Exam parameters are four integers on `Course` with nothing behind them; no attempts, no grading, no per-course question bank. | `courses/models.py:49-52` | Phase 6 |
| G14 | S3 | Dates are display strings: `Certificate.issue_date`, `Enrollment.next_live_time`, `CourseLiveSession.date_label/time_label`, `DashboardNotification.time_ago`, `UpcomingEvent.date_text`. Scheduling, reminders and "x minutes ago" cannot be computed from strings. | `dashboard/models.py`, `courses/models.py:95-112` | Phase 10 (live sessions), Phase 11 (the rest) |
| G15 | S3 | Notifications are seeded rows; no code creates them from real events. | `dashboard/models.py`, no `notify` service | Phase 11 |
| G16 | S3 | Certificates exist as rows but nothing issues them on completion; no public verification URL. | `courses/services.py::certificate_payload` | Phase 11 |
| G17 | S3 | `Course.rating` / `review_count` are static columns; no review model. | `courses/models.py:26,42` | Phase 11 |
| G18 | S3 | No audit log for privileged actions beyond `AuthEvent`. | `auth/models.py` | Phase 1 |
| G19 | S3 | No frontend CI. Lint/typecheck/vitest/build are not enforced on PRs. | `.github/workflows/` | Phase 0 |
| G20 | S3 | Raw-mode token rides in the query string. Request logging records `path` (not the query) [verified], but proxy/gunicorn/Vercel access logs may record full URLs. | `config/middleware.py:124` | Phase 13 (verify) |

---

## 3. Decision log — choices made so you do not have to ask

Each decision is reversible unless stated. If you disagree with one, record the deviation in the phase result note and continue with the reversible alternative.

| ID | Decision | Rationale |
| :--- | :--- | :--- |
| D1 | **Permission model = code-defined catalog + DB-defined roles + many roles per user** (Discord model). A role stores a JSON list of permission keys, validated against the catalog. Effective permissions = union of the user's roles ∪ the default role. | A bit-field is unreadable in an admin API; a through-table per permission is heavy for tiny tables. A validated JSON list is auditable and diff-friendly. |
| D2 | **Two system roles never disappear: `student` (default, implicit for everyone, like Discord's `@everyone`) and `admin` (holds `administrator`, bypasses every check).** `instructor` is **not** a system role — it is a **template** from which an admin creates a role. Existing `role=instructor` users are migrated onto a normal role created from that template. | Exactly what the product owner specified. |
| D3 | `administrator` is a single super-permission (Discord's "Administrator"): holders pass every check. It is `elevated` and can only be granted by another administrator. | Avoids enumerating 60 permissions for the admin role and forgetting one later. |
| D4 | **Hierarchy (Discord rule):** every role has an integer `position`. An actor may edit/assign a role only if they hold the needed permission **and** their highest role position is strictly greater than the target role's (administrators exempt). An actor may only grant permissions they hold themselves. The last administrator can never be removed. | Prevents privilege escalation by a mid-level role. |
| D5 | **Keep `User.role` for one release as a derived "primary account type"** (admin if `administrator`, instructor if holds `studio.access`, else student). It stays in `/auth` payloads and keeps `ensure_profile()` working. `isAdmin` stays in the payload. New code uses `permissions`/`roles`. | Zero-break rollout; the legacy `PATCH /admin/users/:id/role` keeps working until Phase 12. |
| D6 | **No cross-request permission cache.** Compute per request (≤2 queries), memoise on the user object, pin with `assertNumQueries`. Revisit only if the pin shows a problem. | Locmem cache is per-instance on Vercel — a revoked permission must not survive on another instance. |
| D7 | Ownership is separate from permission: **`<resource>.<action>_own` vs `_any`** permission pairs. `_any` implies `_own`. "Own" = the user is staff on the course (`CourseStaff` kind `owner` or `co_instructor`). | Gives Discord-style toggling *and* the instructor-edits-only-their-courses behavior. |
| D8 | Course lifecycle: `draft → in_review → published → archived`. Existing rows backfill to `published`; instructor-created courses start `draft`. Publishing directly needs `courses.publish`; instructors with only `courses.submit_for_review` go through a moderation queue. | Review is a permission, not a global setting. |
| D9 | New `studio` backend app (views over other features, **no models** — mirrors how `adminconsole` is structured) and a matching `features/studio` frontend folder. Instructor APIs live under `/api/studio/*`. | Keeps student-facing course endpoints stable and cacheable. |
| D10 | **One dashboard, two workspaces.** The Studio is *not* a separate site: it is an extra, permission-gated navigation group in the existing dashboard chrome ("learn" ⇄ "studio" switch). Deep Studio pages are real routes (`/studio/...`) because the router has no nested routes and the course editor needs them. | Matches "the normal dashboard but also additional separated sections". |
| D11 | **Playback mode is stored** (`VideoAsset.playback_mode ∈ hls | raw | embed | external`) and exposed as `mode` on the grant; `protection ∈ encrypted | gated | none` is exposed so the UI can be honest. | Replaces the `master_playlist`-emptiness inference (G9). |
| D12 | Packaging resolution order: **per-upload choice → per-provider override → global `use_ffmpeg` → env default**, implemented as a pure function with table-driven tests. Reuses ingest's existing `PACKAGE_MODES`. | One place answers "with or without FFmpeg?" for every provider. |
| D13 | **External URLs are never fetched server-side** (no SSRF surface). The browser plays them directly; they are labeled `protection: none`. Only `https:` URLs with an allowed extension are accepted. | An instructor-supplied URL is untrusted input. |
| D14 | Uploads are **server-mediated chunk relays** (browser → API chunk → provider), not browser-direct. The provider's resumable-session URI stays server-side in `UploadSession.upload_uri`. | `docs/video-hosting/google-drive-integration.md` says "avoid exposing sensitive session/upload URLs"; relaying also works on serverless where each request is small. |
| D15 | Quizzes are graded **server-side only**; correct answers are never sent before submission. Practice feedback is per-question via a `check` call. | Fixes G2. |
| D16 | Instructor rich text is **Markdown rendered by a sanitizing renderer** (no raw HTML passthrough). | Instructor content is semi-trusted and is viewed by admins and students — stored-XSS risk. |
| D17 | No new heavy UI dependencies. Reordering is implemented with accessible up/down controls plus pointer drag using native events. Charts reuse the existing SVG approach (`LoginSeriesChart`). Allowed new deps, all pinned to an exact version: one sanitizer (DOMPurify) and one markdown parser (runtime); `@vimeo/player` (runtime, **lazy chunk only**); `@axe-core/playwright` (dev-only). Nothing else without a written justification in the phase result note. | Keeps the bundle budget (Phase 13) honest. |
| D18 | Payments, email delivery, DRM (Widevine/FairPlay), CDN providers and full-text search remain **out of scope**, with documented extension points (§Backlog). | Inherited out-of-scope ledger; each needs product decisions that are not in the request. |

---

## 4. Phase map and dependency graph

```
P0 Baseline ─► P1 Access core ─► P2 Role Manager (API+UI)
                    │                     │
                    ▼                     ▼
              P3 Ownership & lifecycle ──► P4 Video backend ─► P5 Player (frontend)
                    │                          │                       │
                    ▼                          ▼                       ▼
              P6 Quizzes ─────────────► P7 Studio shell ─► P8 Course editor ─► P9 Video library UI
                                                │                                   │
                                                └──────────► P10 Quiz/Live/Students/Analytics
                                                                      │
                          P11 Learning loop ◄─────────────────────────┘
                                │
                                ▼
                   P12 Admin upgrades ─► P13 Hardening ─► P14 Seed, docs, release
```

| Phase | Title | Size | Needs |
| :--- | :--- | :--- | :--- |
| 0 | Baseline, branch, frontend CI, safety net | S | — |
| 1 | Access control core (backend) | L | 0 |
| 2 | Role Manager: API + admin UI | L | 1 |
| 3 | Course ownership, lifecycle, lesson model | L | 1 |
| 4 | Video platform backend | XL | 1, 3 |
| 5 | Video player system (frontend) | XL | 4 |
| 6 | Quiz & exam system | L | 3 |
| 7 | Studio shell, navigation, home, course list | L | 2, 3 |
| 8 | Studio: course editor, curriculum, publish | XL | 3, 7 |
| 9 | Studio: video library & uploader | L | 4, 5, 7 |
| 10 | Studio: quizzes, live sessions, students, analytics | XL | 6, 7 |
| 11 | Learning loop: progress, certificates, reviews, notifications | L | 4, 6 |
| 12 | Admin console upgrades | M | 2, 3, 4 |
| 13 | Security, performance, a11y, observability hardening | L | all |
| 14 | Seed data, docs, e2e smoke, release | M | all |

Phases 5/6 can run in parallel after 4/3. Phases 7–10 are the frontend-heavy stretch; do not start 8 before 3 and 7 are merged, because the editor consumes their contracts.


---

# PHASE 0 — Baseline, integration branch, frontend CI, safety net

**Branch:** `Chore/AccessStudioBaseline` → PR into `Feature/AccessStudio` (the long-lived integration branch you create here).
**Skills:** `core-project-profile`, `ops-deployment-and-ci`, `core-verification-and-quality-gates`.
**Goal:** prove the repo is green before touching it, add the missing frontend CI, and capture the "before" payloads so later phases can prove they did not change public behavior by accident.

| # | Task | Details |
| :--- | :--- | :--- |
| P0.1 | Create the integration branch | `git checkout main && git checkout -b Feature/AccessStudio`. Copy this file to `plan/PLAN.md` and commit: `docs(plan): check in the access/studio execution plan`. |
| P0.2 | Record the baseline | Run every gate in §0.4 on a clean checkout (fresh venv from `requirements.txt`, `npm ci`). Write the exact output summary to `plan/phase-0-result.md`: test counts (expect 451 backend / 76 vitest — if they differ, say so), `check --deploy` warnings, `spectacular` path/operation counts (REPORT.md says 62 paths / 72 operations). |
| P0.3 | Add **frontend CI** | New `.github/workflows/frontend.yml`, triggered on push/PR touching `frontend/**` or the workflow itself, for `main` and `Feature/*`. Steps: checkout → `actions/setup-node` with **Node 22** (the lockfile requires `^22.22.2 \|\| ^24.15.0 \|\| >=26`) and npm cache → `npm ci` → `npm run lint` → `npx tsc -b` → `npm test` → `npm run build` with `VITE_API_BASE_URL` set to a dummy `https://example.invalid/api` (the app throws at boot without it). Add a `concurrency` group that cancels superseded runs. **Tell the human** to add the new check to branch protection for `main` — the agent cannot change repo settings. |
| P0.4 | Reuse the parity tooling | `backend/scripts/parity_capture.sh` and `parity_diff.py` already exist (verify what they capture). Extend the capture list with: `/api/auth/me`-style payload (login with a dev token), `/api/catalog?type=courses`, `/api/courses/<seed-slug>`, `/api/home`, `/api/events`, `/api/competitions`, `/api/videos/<slug>`, `/api/problems`. Save the **before** snapshots (outside the repo, e.g. the session scratch dir) — Phases 1, 3, 4 diff against them. Every snapshot request needs the `Origin` header. |
| P0.5 | Offline smoke | From a fresh clone: venv → `migrate` → `seed_demo` → `runserver`; second terminal `npm run dev` with `VITE_API_BASE_URL=http://localhost:8000/api`. Sign in with the dev-token flow (`FIREBASE_ALLOW_DEV_TOKENS`) as a seed student and as a staff user; confirm `/dashboard` and `/admin` load. Record in the result file. |
| P0.6 | Fix known doc drift | `PROJECT_PROFILE.md` §8 says `frontend/.env.production` is excluded from git, but `.gitignore` deliberately un-ignores it (`!frontend/.env.production`) and it is tracked — it holds only the public API base URL, so this is a wording bug, not a leak. Correct the profile line. |
| P0.7 | Enforce import boundaries | `frontend/eslint.config.js` has **no** `no-restricted-imports` rule today [verified]. Add flat-config blocks per feature folder forbidding `@/features/<other>/*`, with the two allowed exceptions from R13 (`auth/context`, `videohosting`). Run it; any pre-existing violation is either fixed or listed in an explicit allow-list inside the config with a comment — never silently ignored. |

**Acceptance:** all gates green on the branch; `plan/phase-0-result.md` exists; frontend workflow passes on its own PR; before-snapshots exist and the capture script runs with exit 0.

---

# PHASE 1 — Access control core (backend) + the small frontend slice that consumes it

**Branch:** `Feature/AccessCore`.
**Skills:** `be-architecture`, `be-auth-and-security`, `db-schema-design-and-migrations`, `be-testing`, `fe-routing-and-url-state`.
**Goal:** one authoritative answer to *"may this user do X?"* — a code-defined permission catalog, DB-defined roles (Discord-style), per-request effective permissions, role-assignment audit, and a client that can ask the same question. **No existing endpoint changes behavior in this phase** (`IsAdminRole` stays on every current admin route); Phase 2 retrofits them.

## 1.1 The permission catalog (single source of truth: `features/access/registry.py`)

Every action the platform can perform is a permission key `<resource>.<action>[_own|_any]`. `*_any` **implies** `*_own`. "Elevated" permissions can never be granted to the default (`student`) role and can only be granted by a holder of `administrator` or by someone who holds them. Arabic labels are the UI copy (Role Manager shows them); descriptions are one short sentence each.

| Group | Key | Arabic label | Elevated | Implies |
| :--- | :--- | :--- | :---: | :--- |
| general | `administrator` | مشرف كامل — يتجاوز كل الصلاحيات | ✔ | *(everything)* |
| general | `admin.access` | الدخول إلى لوحة الإدارة | | |
| general | `studio.access` | الدخول إلى استوديو المدرّب | | |
| learning | `courses.enroll` | التسجيل في الدورات | | |
| learning | `courses.favorite` | إضافة الدورات للمفضلة | | |
| learning | `lessons.watch` | مشاهدة دروس الدورات المسجّل بها | | |
| learning | `quizzes.attempt` | حلّ الاختبارات | | |
| learning | `certificates.view_own` | عرض شهاداتي | | |
| learning | `reviews.write` | كتابة تقييم للدورة | | |
| learning | `scholarships.save` | حفظ المنح | | |
| learning | `scholarships.apply` | التقديم على المنح | | |
| learning | `competitions.join` | دخول المسابقات | | |
| learning | `events.register` | التسجيل في الفعاليات | | |
| learning | `profile.edit_own` | تعديل ملفي الشخصي | | |
| learning | `discussions.post` | طرح الأسئلة والمشاركة في نقاش الدروس | | |
| courses | `discussions.reply_own` | الرد على أسئلة دوراتي | | |
| courses | `discussions.moderate` | إدارة النقاشات (إخفاء/تثبيت) في كل الدورات | ✔ | |
| courses | `reviews.reply_own` | الرد علنًا على تقييمات دوراتي | | |
| courses | `courses.create` | إنشاء دورات | | `studio.access` |
| courses | `courses.edit_own` | تعديل دوراتي | | |
| courses | `courses.edit_any` | تعديل أي دورة | ✔ | `courses.edit_own` |
| courses | `courses.delete_own` | حذف دوراتي | | |
| courses | `courses.delete_any` | حذف أي دورة | ✔ | `courses.delete_own` |
| courses | `courses.submit_for_review` | إرسال الدورة للمراجعة | | |
| courses | `courses.publish` | نشر الدورات مباشرةً | | `courses.submit_for_review` |
| courses | `courses.review` | مراجعة واعتماد دورات الآخرين | ✔ | |
| courses | `courses.manage_staff` | إدارة مدرّبي الدورة المشاركين | | |
| courses | `curriculum.edit_own` | تعديل منهج دوراتي (وحدات ودروس) | | |
| courses | `curriculum.edit_any` | تعديل منهج أي دورة | ✔ | `curriculum.edit_own` |
| courses | `live_sessions.manage_own` | جدولة الجلسات المباشرة لدوراتي | | |
| courses | `live_sessions.manage_any` | إدارة كل الجلسات المباشرة | ✔ | `live_sessions.manage_own` |
| courses | `announcements.post` | نشر إعلانات في دوراتي | | |
| courses | `certificates.manage` | إصدار الشهادات وإلغاؤها | ✔ | |
| courses | `reviews.moderate` | إدارة تقييمات الدورات | ✔ | |
| students | `students.view_own` | عرض طلاب دوراتي وتقدّمهم | | |
| students | `students.view_any` | عرض كل الطلاب | ✔ | `students.view_own` |
| students | `analytics.view_own` | تحليلات دوراتي | | |
| students | `analytics.view_any` | تحليلات كل الدورات | ✔ | `analytics.view_own` |
| videos | `videos.upload` | رفع الفيديوهات | | `studio.access` |
| videos | `videos.manage_own` | إدارة فيديوهاتي | | |
| videos | `videos.manage_any` | إدارة كل الفيديوهات | ✔ | `videos.manage_own` |
| videos | `videos.use_embed` | استخدام مصادر غير محمية (يوتيوب/فيميو/رابط) | | |
| videos | `videos.package` | تشغيل تغليف FFmpeg | | |
| videos | `videos.watch_any` | مشاهدة أي فيديو دون تسجيل | ✔ | |
| videos | `videos.configure` | إعداد مزوّدي الفيديو ووضع FFmpeg | ✔ | |
| quizzes | `quizzes.create` | إنشاء اختبارات | | `studio.access` |
| quizzes | `quizzes.edit_own` | تعديل اختباراتي | | |
| quizzes | `quizzes.edit_any` | تعديل أي اختبار | ✔ | `quizzes.edit_own` |
| quizzes | `quizzes.results_own` | نتائج اختباراتي | | |
| quizzes | `quizzes.results_any` | نتائج كل الاختبارات | ✔ | `quizzes.results_own` |
| quizzes | `quizzes.reset_attempts` | منح محاولة إضافية لطالب | | |
| content | `scholarships.manage` | إدارة المنح | | `admin.access` |
| content | `events.manage` | إدارة الفعاليات | | `admin.access` |
| content | `competitions.manage` | إدارة المسابقات | | `admin.access` |
| content | `catalog.manage` | إدارة التصنيفات والفلاتر | | `admin.access` |
| content | `home.curate` | تنسيق الصفحة الرئيسية | | `admin.access` |
| users | `users.view` | عرض المستخدمين | | `admin.access` |
| users | `users.create` | إنشاء حسابات | | `users.view` |
| users | `users.edit` | تعديل الحسابات | | `users.view` |
| users | `users.delete` | حذف الحسابات | ✔ | `users.view` |
| users | `users.assign_roles` | إسناد الأدوار للمستخدمين | ✔ | `users.view` |
| users | `users.revoke_sessions` | إنهاء جلسات المستخدمين | | `users.view` |
| users | `sessions.view_any` | عرض كل الجلسات | | `admin.access` |
| users | `analytics.view_platform` | تحليلات المنصة | | `admin.access` |
| users | `audit.view` | عرض سجل التدقيق | ✔ | `admin.access` |
| roles | `roles.view` | عرض الأدوار | | `admin.access` |
| roles | `roles.manage` | إنشاء الأدوار وتعديلها وحذفها | ✔ | `roles.view` |
| system | `system.maintenance` | تشغيل مهام الصيانة | ✔ | `admin.access` |

**Default holders (seed + templates), written as data in `registry.py`:**

| Role | How it exists | Permissions |
| :--- | :--- | :--- |
| `student` | **System**, default, implicit for everyone, position 0, undeletable | `courses.enroll, courses.favorite, lessons.watch, quizzes.attempt, certificates.view_own, reviews.write, scholarships.save, scholarships.apply, competitions.join, events.register, profile.edit_own, discussions.post` (admins may edit within non-elevated perms) |
| `admin` | **System**, undeletable, permissions locked, position 1000 | `administrator` |
| `instructor` | **Template** → materialised once by the backfill as an ordinary editable role (position 100) | `studio.access, courses.create, courses.edit_own, courses.delete_own, courses.submit_for_review, curriculum.edit_own, courses.manage_staff, live_sessions.manage_own, announcements.post, discussions.reply_own, reviews.reply_own, videos.upload, videos.manage_own, videos.use_embed, quizzes.create, quizzes.edit_own, quizzes.results_own, quizzes.reset_attempts, students.view_own, analytics.view_own` |
| template `senior_instructor` | Template | everything in `instructor` **plus** `courses.publish`, `videos.package` |
| template `teaching_assistant` | Template | `studio.access, students.view_own, quizzes.results_own, quizzes.reset_attempts, announcements.post, discussions.reply_own, analytics.view_own` |
| template `content_moderator` | Template | `admin.access, courses.review, reviews.moderate, discussions.moderate, users.view, audit.view` |
| template `support_agent` | Template | `admin.access, users.view, users.revoke_sessions, sessions.view_any, videos.watch_any` |
| template `content_manager` | Template | `admin.access, scholarships.manage, events.manage, competitions.manage, catalog.manage, home.curate` |

> Instructors get `courses.submit_for_review` but **not** `courses.publish` by default, so new instructors go through moderation; "trusted" instructors are created from the `senior_instructor` template or by adding `courses.publish` in the Role Manager.

**"Own" is not one thing.** Ownership kinds that satisfy an `_own` permission are data, not branches (rule R7):

```python
# registry.py — which CourseStaff kinds satisfy which *_own permission
OWN_KINDS = {
    "courses.edit_own": {"owner", "co_instructor"},
    "curriculum.edit_own": {"owner", "co_instructor"},
    "courses.delete_own": {"owner"},
    "courses.manage_staff": {"owner"},
    "live_sessions.manage_own": {"owner", "co_instructor"},
    "announcements.post": {"owner", "co_instructor", "assistant"},
    "students.view_own": {"owner", "co_instructor", "assistant"},
    "analytics.view_own": {"owner", "co_instructor", "assistant"},
    "quizzes.results_own": {"owner", "co_instructor", "assistant"},
    "quizzes.reset_attempts": {"owner", "co_instructor", "assistant"},
    "discussions.reply_own": {"owner", "co_instructor", "assistant"},
    "reviews.reply_own": {"owner", "co_instructor"},
}
```

## 1.2 Data model (`backend/features/access/models.py`, app label `access`)

```
AccessRole(UUIDModel, TimeStampedModel)
  slug          CharField(40, unique)   ^[a-z0-9][a-z0-9-]{1,38}$ ; immutable once created
  name          CharField(60)           display name (Arabic or English)
  description   CharField(240, blank)
  color         CharField(20)           a palette TOKEN KEY from a fixed allow-list (cyan, gold, success, warning, danger, slate, white) — never a hex (R14)
  position      PositiveIntegerField    higher = more powerful; ties cannot manage each other
  permissions   JSONField(list[str])    validated against the catalog on every write
  is_system     BooleanField            student/admin — cannot be deleted; admin perms locked
  is_default    BooleanField            exactly one row; implicit for every user
  template_key  CharField(40, blank)    which template it was created from (informational)
  Meta: ordering ["-position","name"]; constraint: only one is_default row; only one slug "admin"/"student" system row.

RoleAssignment(UUIDModel)
  user          FK User  related_name "role_assignments"  on_delete CASCADE
  role          FK AccessRole related_name "assignments"   on_delete CASCADE
  assigned_by   FK User null  SET_NULL
  created_at    DateTimeField(auto_now_add)
  Meta: unique(user, role); index(user); index(role)

AuditEvent(UUIDModel)
  actor         FK User null SET_NULL
  action        CharField(40, choices=AuditAction)   # new TextChoices in common/choices.py
  target_type   CharField(40)        e.g. "role", "user", "course", "video"
  target_id     CharField(64)
  detail        JSONField(dict)      before/after diff for role edits; never secrets
  ip_address    GenericIPAddressField null
  created_at    DateTimeField(auto_now_add)
  Meta: ordering ["-created_at"]; indexes (target_type,target_id,-created_at), (actor,-created_at), (action,created_at)
```

`AuditAction` (add to `features/common/choices.py`): `role_created, role_updated, role_deleted, role_reordered, role_assigned, role_revoked, permission_denied_burst, course_published, course_unpublished, course_deleted, video_deleted, user_deleted, user_status_changed, settings_changed`.

**Migrations**
1. `0001_initial` — schema only.
2. `0002_seed_system_roles` — idempotent `RunPython` (authorised by A3): upsert `student` (default), `admin`, and one `instructor` role from the template; then backfill `RoleAssignment` rows: every user with `role=admin` **or** `is_staff=True` → `admin`; every `role=instructor` → `instructor`. Students get **no** rows (the default role is implicit — avoids N rows and keeps "everyone" truthful). Reverse = no-op. Re-running creates nothing new.

## 1.3 Services (`access/services.py`) — all rules live here (R3)

| Function | Rule |
| :--- | :--- |
| `effective_permissions(user) -> frozenset[str]` | `∪ role.permissions` over the user's assignments, ∪ the default role, ∪ `{administrator}` if `user.is_admin` (legacy bridge for Django-admin-edited accounts, D5); then expand `implies` closure; if `administrator` ∈ set, return the **full catalog**. Memoised on the user object; ≤ 2 queries cold, 0 warm (D6). Anonymous → empty set. |
| `has_perm(user, key) -> bool` | `key in effective_permissions(user)`; unknown keys raise in DEBUG/tests (typos must fail loudly). |
| `has_object_perm(user, key, kinds)` | For `_own` checks: `*_any` form ⇒ True; else `*_own` **and** the caller-supplied `kinds` set (from `OWN_KINDS`) matches. The `courses` feature supplies the staff lookup — `access` never imports `courses`. |
| `highest_position(user) -> int` | Max role position held; default role = 0; administrators = ∞. |
| `can_manage_role(actor, role) -> bool` | Needs `roles.manage` **and** (`administrator` **or** `highest_position(actor) > role.position`). System-admin role is never editable except by administrators and never deletable. |
| `can_grant(actor, keys) -> bool` | Actor holds every key in `keys` (administrators exempt). Elevated keys additionally need the actor to hold them. |
| `create_role / update_role / delete_role / reorder_roles` | Validate keys against the catalog; enforce D4; reject `is_default` role receiving elevated keys; reject deleting a role that still has members unless `reassignTo` given; each writes an `AuditEvent` with a before/after diff. |
| `create_role_from_template(actor, template_key, overrides)` | Copies the template's permission list, applies `name/color/position` overrides, runs `can_grant`. |
| `assign_roles(actor, user, role_ids)` / `revoke_role` | Needs `users.assign_roles`; each added/removed role passes `can_manage_role`; **last-administrator guard** (cannot remove the final `admin` assignment); self-demotion from `admin` rejected (matches today's behavior); calls `sync_primary_role`; audited. |
| `sync_primary_role(user)` | Derives legacy `User.role` (admin if `administrator`, else instructor if `studio.access`, else student) and sets `is_staff = administrator`; calls `auth.services.ensure_profile`. Clears `is_staff` on demotion; **never touches `is_superuser`** (managed in Django admin/CLI). |
| `bootstrap_system_roles()` | Idempotent upsert used by migration, `seed_demo`, and tests. |
| `record_audit(...)` | Appends an `AuditEvent`; best-effort on a bare `request`. |

## 1.4 DRF integration (`access/permissions.py`)

```python
def perm(key: str) -> type[BasePermission]: ...        # perm("courses.create")
def perm_any(*keys: str) -> type[BasePermission]: ...  # any of several
```

A denied request raises a new `PermissionDenied` in `features/common/errors.py` rendering the **existing** envelope (`{detail, code: "permission_denied"}`) — do not invent a new shape. `IsAdminRole` is kept untouched.

## 1.5 Auth integration (backend)

- `auth/serializers.py::user_profile` gains (additive): `roles: [{id, slug, name, color}]` (assigned roles + the default role), `permissions: [str]`, `isAdministrator: bool`. `isAdmin` stays.
- `auth/services.py::ensure_profile`: **every** user gets a `StudentProfile` (instructors learn too); `InstructorProfile` is added when the user holds `studio.access`.
- `User.objects.create_superuser`, `upsert_firebase_user`, and `adminconsole.services.create_user_account` call `access.services.sync_primary_role` so new accounts are consistent from creation.
- `auth/admin.py`: make `User.role` **read-only** with help text "يُدار من مدير الأدوار", add a read-only `RoleAssignment` inline — otherwise the Django admin can drift the legacy field.

## 1.6 Frontend slice (coordinated, small)

| # | Task |
| :--- | :--- |
| P1.F1 | `features/auth/types.ts`: add `roles: AuthRoleSummary[]`, `permissions: string[]`, `isAdministrator: boolean` to `AuthUser` (+ `EMPTY_AUTH_USER`); keep `role` and `isAdmin`. |
| P1.F2 | New `src/shared/lib/permissions.ts`: `PERMISSION_KEYS` string-literal union **generated from** (or checked against) the backend catalog by a unit test that diffs a committed `permissionCatalog.json` against `GET /api/admin/roles/catalog` shape (see Phase 2) — a typo in a key must fail a test, not silently hide a button. Exports `can(user, key)`, `canAny(user, keys)`; `isAdministrator` short-circuits. |
| P1.F3 | New hook `features/auth/context/useCan.ts` wrapping the above. |
| P1.F4 | `routes.json` + `RouteMeta`/`RawRoute`: new optional `requiresPermission: string \| string[]`; `RouteGuard` enforces it (wait for `isReady`, redirect to `/login?next=` when signed-out, to `/` when signed-in but unauthorised). `requiresAdmin` keeps working. |
| P1.F5 | Replace the 3 UI usages of raw `isAdmin` (`DesktopNavbar`, `RootLayout`, `AdminPage`) with `can(user,'admin.access')`, **keeping** a `|| user.isAdmin` fallback until Phase 12 removes it. |

## 1.7 Tests (owning feature's `tests.py`, shared kit `features/common/testing.py`)

- **Registry integrity:** unique keys; every `implies` target exists; no implication cycles; every `OWN_KINDS` key exists; every template/seed permission exists; labels non-empty.
- **Effective permissions:** union of roles; default role always included; `implies` closure (`courses.edit_any` ⇒ `courses.edit_own`); `administrator` ⇒ full catalog; anonymous ⇒ ∅; legacy bridge (`is_staff=True`, no assignments) ⇒ `administrator`; **query pin** (`assertNumQueries(≤2)` cold, `0` warm).
- **Hierarchy matrix** (table-driven): role A (position 50, has `roles.manage`) cannot edit B (position 50 or 80); can edit C (position 10); cannot grant a permission it lacks; cannot grant an elevated one it lacks; administrator can do all; cannot delete system roles; cannot give the default role an elevated permission.
- **Guards:** last-administrator removal rejected; self-demotion rejected; assigning an unknown role id → 400.
- **Backfill/seed:** `bootstrap_system_roles()` twice ⇒ identical row counts; a `role=instructor` user is assigned the instructor role; an `is_staff` student-role user becomes an administrator assignment.
- **Serializer golden test:** `user_profile` keeps every existing key with identical values and adds exactly `roles/permissions/isAdministrator`; parity diff vs the Phase-0 snapshot shows **only additive keys**.
- **Frontend (vitest):** `can/canAny` incl. administrator short-circuit; `RouteGuard` matrix for `requiresPermission` (signed-out → login with `next`, unauthorised → `/`, authorised → renders, not-ready → skeleton); catalog-key drift test.

## 1.8 Acceptance criteria

1. `GET /api/auth/...` payloads contain `roles`, `permissions`, `isAdministrator`; every legacy key unchanged.
2. A seeded instructor holds the instructor permission set; a seeded student holds exactly the default role's set; a staff user is an administrator.
3. No current admin endpoint changed status codes (parity diff clean except additive auth keys).
4. All gates green; `spectacular --fail-on-warn` zero warnings; `README.md` for `access` written (routes: none yet; data; rules; how to add a permission in 3 steps).

## 1.9 Risks and rollback

| Risk | Mitigation |
| :--- | :--- |
| Legacy `role`/`is_staff` drift via Django admin | `role` read-only in `auth/admin.py`; the `is_admin` bridge keeps staff admin even if assignments are missing. |
| Seed migration runs on Vercel build (`vercel.json` runs `migrate`) | It is idempotent and tiny; verified by running twice in a test. |
| Rollback | All schema additive; reverting the branch leaves unused tables. `User.role` was never removed. |


---

# PHASE 2 — Role Manager: API + admin UI (the Discord-style manager)

**Branch:** `Feature/RoleManager`. **Needs:** Phase 1.
**Skills:** `be-api-design`, `be-auth-and-security`, `design-ui-components`, `design-ux-patterns-and-microcopy`, `fe-forms-and-validation`, `fe-accessibility`, `fe-rtl-and-i18n`, `design-motion-implementation`.
**Goal:** an admin can create a role, choose exactly what it can do, order roles by power, assign them to people, and see who changed what. The two system roles (`student`, `admin`) are always present; `instructor` and others are created from templates.

## 2.1 Backend API (new routes in `adminconsole/urls.py`; logic in `access/services.py` — views stay thin)

All under `/api/admin/…`. Static routes are declared before parameterised ones. All carry `@extend_schema` with unique `operationId`s. Throttle scope `admin_burst` (existing).

| Method | Path | Permission | Body / query | Response |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/roles/catalog` | `roles.view` | — | `{groups:[{key,label,permissions:[{key,label,description,elevated,implies:[key]}]}], templates:[{key,label,description,permissions:[key]}], colors:[token]}` — **generated from `registry.py`**, so the UI never hard-codes a permission. Cacheable (`ETag`). |
| GET | `/roles` | `roles.view` | — | `{items:[Role]}` ordered by position desc; includes `memberCount`, `canManage` (computed for the caller), the default role last. |
| POST | `/roles` | `roles.manage` | `{name, slug?, color, description?, permissions[], templateKey?}` | `201 Role`. New roles land **just below the actor's highest role** (never above). |
| GET | `/roles/<uuid>` | `roles.view` | — | `Role` |
| PATCH | `/roles/<uuid>` | `roles.manage` | `{name?, color?, description?, permissions?, expectedUpdatedAt}` | `Role`; `409 conflict` when `expectedUpdatedAt` is stale (two admins editing). Slug immutable. System `admin` is read-only; `student` accepts only non-elevated permission edits. |
| DELETE | `/roles/<uuid>` | `roles.manage` | `?reassignTo=<uuid>` | `{deleted:true}`; refuses system roles; if members exist, requires `reassignTo` or returns `409 role_has_members` with the count. |
| POST | `/roles/reorder` | `roles.manage` | `{orderedIds:[uuid]}` top→bottom | `{items:[Role]}`; system roles are pinned; the actor can only move roles they can manage; positions are rewritten in one transaction. |
| GET | `/roles/<uuid>/members` | `roles.view` | `?q=&page=` | `{total,page,pageSize,results:[UserRow]}` (the `student` role lists **all users**, paged). |
| POST | `/roles/<uuid>/members` | `users.assign_roles` | `{userIds:[uuid]}` | `{results:[{userId, ok, code?}]}` — one transaction, per-id outcome (batch; no partial 500s). |
| DELETE | `/roles/<uuid>/members/<uuid>` | `users.assign_roles` | — | `{removed:true}` (last-administrator guard applies). |
| PUT | `/users/<uuid>/roles` | `users.assign_roles` | `{roleIds:[uuid]}` | The updated `UserRow` with `roles`. Replaces the explicit set; default role is implicit. |
| GET | `/audit` | `audit.view` | `?action=&actor=&targetType=&targetId=&page=` | `{total,page,pageSize,results:[AuditRow]}` |

`Role` payload (camelCase, serializer-only): `{id, slug, name, description, color, position, permissions, isSystem, isDefault, templateKey, memberCount, canManage, createdAt, updatedAt}`.

**Existing admin endpoints are retrofitted from `IsAdminRole` to granular permissions in this phase** (users/sessions/content/analytics). Video console endpoints are retrofitted in Phase 4. Table-driven, one edit per route:

| Route | Old | New |
| :--- | :--- | :--- |
| `GET admin/overview` | admin | `admin.access` |
| `GET admin/users` · `POST admin/users` | admin | `users.view` · `users.create` |
| `GET/PATCH/DELETE admin/users/<id>` | admin | `users.view` · `users.edit` · `users.delete` |
| `PATCH admin/users/<id>/role` *(legacy)* | admin | `users.assign_roles` — maps `student/instructor/admin` onto the role of that slug; `400 role_missing` if an admin deleted the `instructor` role. Removed in Phase 12. |
| `GET admin/sessions` · `POST …/revoke` | admin | `sessions.view_any` · `users.revoke_sessions` |
| `GET admin/analytics/logins\|devices` | admin | `analytics.view_platform` |
| `GET admin/events` (the **login audit feed**, `AuthEvent`) | admin | `audit.view` |
| `POST admin/maintenance/cleanup` | admin or cron secret | `system.maintenance` or cron secret (cron path unchanged) |
| `GET admin/content/schema`, `…/content/<type>` | admin | **per-type permissions declared inside `CONTENT_TYPES`** (`{read, write, delete}` keys): courses → `courses.edit_any`/`courses.create`/`courses.delete_any`; scholarships → `scholarships.manage`; events → `events.manage`; competitions → `competitions.manage`. The schema endpoint returns **only the types the caller may read**. |

Content-editor addition (needed by Phase 3): a new field kind `user_ref` (async user search) with its coercer added to `_COERCERS`.

## 2.2 Audit semantics

Every role/assignment mutation writes an `AuditEvent` with `detail = {before:{…}, after:{…}}` for permission diffs (list of added/removed keys, not whole blobs). Reads of `/audit` are paged (page size 20) and filterable. Retention: extend `common/maintenance.py::run_cleanup` to prune audit rows older than a new setting `AUDIT_RETENTION_DAYS` (default 365, read in `settings.py` only).

## 2.3 Frontend: admin console additions (inside the existing `features/admin`)

**Convert the hard-coded section nav to data.** `ADMIN_NAV_GROUPS` / `SECTION_LABELS` / `SECTION_ICONS` (in `admin/types.ts`, `adminFormatters.ts`) become one JSON file `admin/data/adminSections.json` with `{key, label, icon, group, permission}`. `AdminSectionNav` filters by `can(user, section.permission)`. The route flag becomes `requiresPermission: "admin.access"` (Phase 1 slice) and the console renders only the sections the caller may use; a section's content must also handle a direct URL to a forbidden section (render an `AdminEmptyState` "لا تملك صلاحية").

New sections: **الأدوار والصلاحيات** (`roles`, needs `roles.view`) and **سجل التدقيق** (`audit`, needs `audit.view`).

### Role Manager screen — layout (desktop; RTL: list on the right, editor on the left)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ الأدوار والصلاحيات                                     [＋ إنشاء دور]       │
├───────────────────────────────┬────────────────────────────────────────────┤
│ ⌕ بحث في الأدوار               │  ● مدرّب                    [نسخ] [حذف]    │
│                               │  ┌ العرض ┬ الصلاحيات ┬ الأعضاء ┬ متقدم ┐   │
│ ⠿ ● مشرف          🔒  ٢       │  │                                       │   │
│ ⠿ ● مدرّب رئيسي        ٣      │  │  [ ⌕ ابحث في الصلاحيات ]   ٤١ / ٦٢     │   │
│ ⠿ ● مدرّب              ١٢     │  │  ▼ الدورات والمنهج          ٩ / ١٤    │   │
│ ⠿ ● مراجع محتوى        ١      │  │     ◉ إنشاء دورات                      │   │
│ ─────────────────────────     │  │     ◉ تعديل دوراتي                     │   │
│   ● الجميع (الافتراضي) 🔒 ٤٨٠  │  │     ○ تعديل أي دورة       ⚠ حسّاسة    │   │
│                               │  │     ◉ نشر الدورات مباشرةً              │   │
│ ↑ الأعلى = الأقوى             │  └───────────────────────────────────────┘   │
│                               │  ┌ لديك تغييرات غير محفوظة  [إعادة] [حفظ] ┐  │
└───────────────────────────────┴────────────────────────────────────────────┘
```

Mobile: the list is the first screen; selecting a role drills into the editor with a back chevron; the unsaved-changes bar docks above the bottom bar.

**Components** (one responsibility each; folders per the existing taxonomy `components/{layout,cards,controls,overlays,states,views}`):

| Component | Responsibility |
| :--- | :--- |
| `views/RolesView` | Owns selection state (URL `?role=<slug>` so deep links and back/forward work), fetches via `useCachedData`. |
| `layout/RoleList` + `cards/RoleListItem` | Colored dot, name, member count, lock icon for system roles, drag handle. Reorder by pointer drag **and** keyboard (focus the handle, `Alt+↑/↓`), announced with an `aria-live` region ("نُقل الدور إلى المرتبة 2"). Roles above the actor's own rank render disabled with a tooltip. The default role is pinned last. |
| `layout/RoleEditor` | Tabs: **العرض** (name, color swatches from the token palette, description) · **الصلاحيات** · **الأعضاء** · **متقدم**. |
| `controls/PermissionToggle` | A `role="switch"` with label + one-line description; shows an "حسّاسة" chip for elevated permissions; disabled with tooltip "لا تملك هذه الصلاحية" when the actor cannot grant it; **implied** permissions render as locked-on with "مضمّنة عبر «…»". |
| `layout/PermissionGroup` | Collapsible group with `n / m` counter and "تفعيل الكل / تعطيل الكل" (applies only to permissions the actor can grant). |
| `controls/AdministratorToggle` | Always at the top. Turning it on opens a danger confirm: "يمنح هذا الدور كل الصلاحيات ويتجاوز كل القيود." Only visible to administrators. |
| `overlays/CreateRoleModal` | Two choices: **دور فارغ** or **من قالب** (cards: مدرّب، مدرّب رئيسي، مساعد تدريس، مراجع محتوى، دعم فني، مدير محتوى) showing the permission count; name/color prefilled. |
| `cards/UnsavedChangesBar` | Floating save/reset bar (slides in with `transform`+`opacity`); blocks navigation with a confirm if dirty; sends `expectedUpdatedAt`; on `409` shows "عدّل مشرف آخر هذا الدور — أعد التحميل" with a reload action that preserves the user's diff view. |
| `layout/RolePreviewPanel` | "ماذا يستطيع هذا الدور؟" — a plain-language summary derived **client-side from the catalog**: which dashboard sections and Studio screens it unlocks (this is the "view as role" idea without impersonation). |
| `views/AuditLogView` | Filterable table with human diffs ("أضاف صلاحية: نشر الدورات مباشرةً"). |
| `controls/RoleChips` | Multi-select chips used in `UserDetailPage`/`UsersTable` in place of the single `RoleSelect` (keeps `RoleSelect` for the legacy endpoint until Phase 12). |

**Data:** new `admin/data/roleFetchers.ts` (`fetchRoleCatalog`, `fetchRoles`, `createRole`, `updateRole`, `deleteRole`, `reorderRoles`, `fetchRoleMembers`, `addRoleMembers`, `removeRoleMember`, `setUserRoles`, `fetchAudit`), types in `admin/types.ts`, all copy in `admin/data/roleCopy.json`. Writes invalidate the roles cache and the `/auth` user (so the signed-in admin's own `permissions` refresh when they edit a role they hold).

**Motion (Celestial Motion System — see `docs/04-loading-caching-and-motion.md`):** list items stagger in (≤40 ms steps, ≤240 ms total); toggles animate their thumb with `transform`; group expand uses a `grid-template-rows` transition; the drag item lifts (`scale(1.02)` + elevated shadow token); save bar slides up. **Only `transform`/`opacity`; all of it disabled under `prefers-reduced-motion`.**

**Empty/loading/error states:** two-tier skeleton (page chrome stays, data section skeletons); empty member list; `403` section state; offline retry.

## 2.4 Tests

Backend: permission matrix per endpoint (anonymous 401 · student 403 · `users.view`-only 403 on role writes · role-manager 200); hierarchy (cannot edit equal/higher role, cannot escalate, cannot give default role an elevated key); reorder (system pinned, rank-limited, single transaction); `409` stale write; delete with/without `reassignTo`; batch member add per-id outcomes; last-admin guard through every path (`DELETE member`, `PUT user roles`, role delete); audit rows + diffs; legacy `PATCH …/role` still works; **query pins**: roles list ≤ 3 queries independent of role count, members page constant; every retrofitted route keeps its previous happy-path response (parity diff). Frontend (vitest + Testing Library): `RolePermissionsTab` (search, group toggle respects "cannot grant", implied locks, elevated chip, administrator confirm), dirty bar + navigation guard + `409` flow, `RoleList` keyboard reorder + live-region text, create-from-template, `adminSections` gating (a `users.view`-only user sees Users but not Roles), `roleFetchers` contract tests.

## 2.5 Acceptance criteria

1. An administrator creates "مدرّب" from the template, toggles `courses.publish` on, assigns it to a user; that user's next `/auth` payload shows the new permission and the dashboard (Phase 7) reflects it.
2. A role manager at position 50 can neither edit a position-80 role nor grant an elevated permission they lack (UI disabled **and** server `403`).
3. Deleting the last administrator assignment is impossible through every path (UI + API).
4. Every action above is visible in the audit log with a readable diff.
5. All gates green; `spectacular` zero warnings; RTL + keyboard-only walkthrough recorded in the result file (screenshots at 375 / 768 / 1280 px).

---

# PHASE 3 — Course ownership, lifecycle, and the lesson model

**Branch:** `Feature/CourseLifecycle`. **Needs:** Phase 1. **Coordinated frontend slice:** types + preview banner only.
**Skills:** `be-architecture`, `db-schema-design-and-migrations`, `db-indexing-and-query-optimization`, `cache-strategy-layers`, `be-testing`.
**Goal:** courses have owners, a safe publish workflow, and a real lesson model (kind, video link, free preview) — so Studio can create content without leaking drafts and so video authorization (Phase 4) has something to authorize against. Fixes G4, G5, G6.

## 3.1 Data model (all additive; owner of the change = `features/courses`)

```
CourseStatus (common/choices.py): draft | in_review | published | archived

Course  (+)
  status        CharField(12, choices=CourseStatus, default="published", db_index)   # existing rows stay published (backfill = default); Studio creates drafts explicitly (D8)
  owner         FK User null SET_NULL related_name "owned_courses"
  submitted_at  DateTimeField null
  published_at  DateTimeField null
  review_note   TextField blank            # moderator feedback shown to the instructor
  total_seconds PositiveIntegerField default 0   # derived from lessons
  # Course.instructor (CharField) stays — it is the display string the catalog contract uses; services keep it in sync with the owner's full name when blank.

CourseStaff(UUIDModel, TimeStampedModel)
  course FK related "staff" · user FK related "course_staff" · kind: owner | co_instructor | assistant
  unique(course, user); UniqueConstraint(fields=[course], condition=Q(kind="owner"))   # exactly one owner

CourseLesson (+)
  kind              CharField(12): video | article | quiz | resource   default video
  video_asset       FK "videohosting.VideoAsset" null SET_NULL related "lessons"      # string reference → no import cycle
  is_free_preview   BooleanField default False
  is_published      BooleanField default True
  content           TextField blank            # Markdown (article lessons, lesson notes) — sanitised on render (D16)
  duration_seconds  PositiveIntegerField default 0   # derived from the linked asset when present; `duration` (display) stays and is regenerated from it

LessonResource(UUIDModel)
  lesson FK related "resources" · title CharField(160) · url URLField(400) · kind: link | document_link · order PositiveInteger
  # v1 = links only; hosted file attachments are a backlog item (no object storage exists today).

Course, CourseModule, CourseLesson (+)  updated_at DateTimeField(auto_now)   # additive, default now; powers optimistic concurrency (`expectedUpdatedAt`) in every Studio PATCH (Phase 8)
```

Indexes: `Course(status, slug)`, `CourseStaff(user, kind)`, `CourseLesson(video_asset)`. Use `QuerySet` helpers: `Course.objects.published()` and `.visible_to(user)`.

**Backfill (idempotent, A3):** none needed for `status` (column default). `owner`/`CourseStaff` stay empty — **do not guess owners from the free-text `instructor` string** (unsafe heuristic). Admins assign owners through the content editor's new `owner` (`user_ref`) field or the Studio staff panel; until then those courses are admin-managed only.

## 3.2 Services (`courses/services.py`) — the lifecycle state machine

| Function | Rule |
| :--- | :--- |
| `can_edit(user, course, *, curriculum=False)` | `*_any` perm **or** `*_own` perm **and** staff kind ∈ `OWN_KINDS[...]` (data table from `access.registry`). Used by every studio view. One query for the staff lookup, memoised per request. |
| `create_course(owner, data)` | Slug rule: instructor-supplied Latin slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3–60 chars, reserved words rejected (`new`, `learn`, `certificate`); otherwise `course-<8 hex>`. Creates the `owner` staff row; `status=draft`; fills `instructor` string. Needs `courses.create`. |
| `update_course(course, data, actor)` | Whitelisted fields only (reuse the content-editor coercers). **Slug is locked after first publish** (`400 slug_locked`; admins may override via the console) — it is a public URL and the legacy video-slug convention. |
| `submit_for_review(course, actor)` | `draft → in_review`; runs `validate_publishable`; blocking issues ⇒ `422 not_publishable` with the issue list; sets `submitted_at`; notifies reviewers (Phase 11 hook). Needs `courses.submit_for_review`. |
| `publish(course, actor)` | Allowed from `draft` (needs `courses.publish`) or `in_review` (needs `courses.review`). Same blocking validation; sets `published_at`; bumps caches on commit (registry already covers `courses.Course`). Audited. |
| `request_changes(course, note, actor)` | `in_review → draft`, writes `review_note`. Needs `courses.review`. |
| `unpublish_or_archive(course, actor)` | **Policy:** a published course with enrollments can only go to `archived` (enrolled learners keep access, no new enrollments, hidden from catalog). With zero enrollments it may return to `draft`. |
| `delete_course(course, actor)` | Hard delete only when there are zero enrollments (`409 has_enrollments` otherwise → archive). `courses.delete_own` (owner) / `courses.delete_any`. Audited. |
| `add_staff / remove_staff` | Needs `courses.manage_staff` (owner only). Cannot remove the owner; transfer-ownership is an administrator action. |
| `add_module / reorder_modules / add_lesson / update_lesson / reorder_lessons / move_lesson / delete_*` | Needs `curriculum.edit_*`. Generated ids: `m-<8hex>`, `l-<8hex>` (`module_id`/`lesson_id` stay the stable string keys the player and progress use). Reorders take the **complete ordered id list** and rewrite `order` in one `bulk_update` (R: no per-row saves). |
| `link_video(lesson, asset, actor)` | Actor must be able to use that asset (`videos.manage_own` + created it, or `videos.manage_any`). Sets `kind=video`, copies `duration_seconds`/`duration` from the asset. Asset readiness is **not** required to link (so a lesson can be authored while the upload processes) but **is** required to publish. |
| `recompute_course_stats(course)` | `lessons_count` = published lessons; `total_seconds` = sum; regenerate the `duration` display string **in the same format the existing seed/data uses** (inspect the seed and catalog UI before choosing; do not change what the catalog renders). Called inside the mutation's `transaction.atomic()`. |
| `validate_publishable(course) -> list[Issue]` | `Issue(code, severity: blocking\|warning, target)`. **Blocking:** `title_missing`, `description_short` (<80 chars), `thumbnail_missing`, `category_missing`, `no_published_lessons`, `lesson_video_missing`, `lesson_video_not_ready`, `lesson_article_empty`, `price_inconsistent` (paid without a price label). **Warning:** `outcomes_few` (<3), `lesson_duration_unknown`, `no_quiz`, `no_free_preview`. Messages are constants in `common/messages.py`. This list drives the Studio publish checklist (Phase 8). |

All status changes write `AuditEvent` (`course_published`, `course_unpublished`, `course_deleted`).

## 3.3 Public API changes (cached surfaces — handle with care)

1. **Catalog, home rails, related courses, search/filters** query `Course.objects.published()`. `HomeFeaturedCourse` rows pointing at a non-published course are skipped (do not delete them). Because `courses.Course` is already in `MODEL_NAMESPACES`, status changes bump the `catalog` + `home` versions on commit — **add a test proving a publish and an unpublish each change the next catalog response**.
2. `GET /api/courses/<slug>`: published or archived ⇒ public (archived adds `enrollable:false`); `draft`/`in_review` ⇒ `404` for everyone except staff-of-the-course and `courses.edit_any`, who get the payload plus `status` and `isPreview:true`. Constant **4 queries** must hold (`select_related("video_asset")` on the lesson prefetch; update the pinned guard only if provably necessary).
3. Lesson payload (additive): `kind`, `isFreePreview`, `hasVideo`, `videoSlug` (nullable), `durationSeconds`, `isPublished` (staff only). Unpublished lessons are omitted for non-staff. Existing keys unchanged.
4. Course payload (additive): `status`, `instructors: [{id, name, headline, avatarUrl}]` from staff rows (public fields only — never email), `enrollable`.
5. `enroll`: course must be `published`, caller needs `courses.enroll` (anonymous keeps today's acknowledgement behavior).
6. Dashboard "enrolled" list keeps archived courses the learner is enrolled in.

## 3.4 Studio API v1 — new backend app `studio` (no models; views over `courses`/`access` services, like `adminconsole`)

Mounted at `/api/studio/…`, all `IsAuthenticated` + the listed permission; thin views; throttle scope `studio_write` (add to `common/throttling.py`: `"120/min"`).

| Method | Path | Permission | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/studio/overview` | `studio.access` | KPI counters for the Studio home (own courses by status, enrollments, in-review count). Constant queries. |
| GET | `/studio/courses` | `studio.access` | `?status=&q=&page=&scope=own\|all` (`all` needs `courses.edit_any`). |
| POST | `/studio/courses` | `courses.create` | `201` full editor payload (draft). |
| GET | `/studio/courses/<slug>` | edit own/any | Editor payload **including drafts/unpublished lessons, review note, staff, checklist summary**. |
| PATCH | `/studio/courses/<slug>` | edit own/any | |
| DELETE | `/studio/courses/<slug>` | delete own/any | |
| POST | `/studio/courses/<slug>/submit` · `/publish` · `/unpublish` | `courses.submit_for_review` · `courses.publish` · `courses.publish` | State machine in §3.2. |
| GET | `/studio/courses/<slug>/checklist` | edit own/any | `{issues:[…], ready:bool, completeness:0-100}` (drives the Studio readiness ring). |
| GET/POST/DELETE | `/studio/courses/<slug>/staff[/<uuid>]` | `courses.manage_staff` | |
| POST | `/studio/courses/<slug>/modules` · `/modules/reorder` | `curriculum.edit_*` | |
| PATCH/DELETE | `/studio/modules/<uuid>` | `curriculum.edit_*` | |
| POST | `/studio/modules/<uuid>/lessons` · `/lessons/reorder` | `curriculum.edit_*` | `reorder` accepts cross-module `moves:[{lessonId,moduleId,order}]`. |
| PATCH/DELETE | `/studio/lessons/<uuid>` | `curriculum.edit_*` | |
| PUT/DELETE | `/studio/lessons/<uuid>/video` | `curriculum.edit_*` + asset access | Link / unlink. |
| GET/POST/PATCH/DELETE | `/studio/lessons/<uuid>/resources[/<uuid>]` | `curriculum.edit_*` | Links only; URL scheme must be `https:`. |
| GET | `/admin/review-queue` | `courses.review` | In-review courses, oldest first. |
| POST | `/admin/review-queue/<slug>/approve` · `/request-changes` | `courses.review` | `request-changes` takes `{note}`. |

Studio responses are **never cached**; `Cache-Control: private, no-store`.

## 3.5 Frontend slice (minimal, student-facing)

`courses/types.ts` gets the new lesson/course fields; `CourseLandingPage` shows an "معاينة — غير منشورة" banner when `isPreview`, an "مؤرشفة" note and hides the enroll CTA when `enrollable` is false; draft slugs render `CourseNotFound`. The landing `InstructorCard` renders `instructors[]`. **No Studio UI yet.**

## 3.6 Tests

Ownership matrix (owner/co-instructor/assistant × each perm); lifecycle transitions table-driven (every allowed + forbidden edge, with and without `courses.publish`/`courses.review`); `validate_publishable` matrix (one test per issue code); catalog/home/related/dashboard exclude drafts + include archived-for-enrolled; draft detail `404` for anon/student/other instructor and `200` for owner/admin; slug rules + lock; enrollment blocks hard delete; reorder correctness (`assertNumQueries` constant regardless of list size); `recompute_course_stats`; cache-bump on publish/unpublish; audit rows; backfill leaves existing courses `published`; **parity** — public snapshots (catalog, course detail, home) identical except the additive keys listed above; query pin on course detail still 4.

## 3.7 Acceptance criteria

1. An instructor can create a draft, build modules/lessons through the Studio API, hit `checklist`, submit; a reviewer approves; the course appears in the catalog **only then**.
2. A draft is invisible on every public surface; an unrelated instructor cannot read or edit it.
3. Unpublishing a course that has learners archives it instead, and those learners still open it.
4. Public payloads are additive-only vs the Phase-0 snapshots.
5. All gates green.


---

# PHASE 4 — Video platform backend (any provider, with or without FFmpeg, entitled playback)

**Branch:** `Feature/VideoPlatform`. **Needs:** Phases 1 and 3.
**Skills:** `be-file-uploads-and-media-pipeline`, `be-auth-and-security`, `be-api-design`, `perf-backend-speed`, `be-testing`, `be-config-and-secrets`.
**Goal:** one control plane that serves a lesson video from **Telegram, Google Drive, YouTube, Vimeo, or a plain HTTPS URL**, packaged with FFmpeg or not, to **only the people entitled to watch it**, with resumable uploads for instructors and a real watch-progress ledger. Fixes G1, G7–G12.

## 4.0 Read first (do not skip)

`videohosting/{README.md,models.py,views.py,tokens.py,ingest.py,serializers.py,diagnostics.py}`, `providers/{base.py,__init__.py,google_drive.py,telegram.py}`, `console/{urls.py,views.py}`, `tests/helpers.py`, and `docs/video-hosting/google-drive-integration.md`. Note the existing grant payload keys (`token, assetId, masterUrl, playUrl, mode, expiresAt, durationSeconds`) — **every one must keep its name and meaning**; this phase only adds keys.

## 4.1 The provider × FFmpeg matrix (what the system must do — and be honest about)

Verified from the code today: HLS packaging exists **only** for Telegram (`_TelegramIngest.store_package`); Drive stores the source only (`store_package` absent) and can be watched only as a **raw** file proxied by the API; Telegram has **no** raw path. This phase makes the matrix explicit and enforced instead of implicit.

| Provider | Kind | FFmpeg host available | No FFmpeg (toggle off **or** host lacks it) | Protection shown to UI |
| :--- | :--- | :--- | :--- | :--- |
| **Telegram** | storage | Upload source → FFmpeg AES-128 HLS ladder → segments as Telegram documents → `302` to Telegram CDN. Needs a **persistent host** (MTProto session, large temp disk). | **Refused at upload-init** with a clear reason (`provider_requires_packaging`), *unless* spike S-1 proves a raw path. No silent "staged forever" assets. | `encrypted` |
| **Google Drive** | storage | Same as the right column in v1 (Drive HLS is spike S-2). With FFmpeg on, Drive assets stay `staged` for an optional later package run **only if** a packaging target exists; otherwise treated as raw. | Upload source via resumable session → asset `ready` in `raw` mode → platform-gated proxy with Range. Works on serverless. | `gated` |
| **YouTube** | link | No upload, no FFmpeg. Instructor pastes a URL; the platform stores only the video id. | Same. | `none` |
| **Vimeo** | link | Same as YouTube. | Same. | `none` |
| **External URL** | link | Instructor pastes an `https:` URL to an `.mp4`/`.webm`/`.m3u8`; played directly by the browser. | Same. | `none` |

> **Decision D12 (restated) — one function answers "with or without FFmpeg?"**: `resolve_playback_plan(spec, requested, host, config, provider_row) -> Plan(mode, package: bool, reason)`, resolution order **per-upload request → per-provider policy (`VideoProvider.packaging_policy`: auto/always/never) → global `VideoSystemConfig.use_ffmpeg` → host capability**. It is a pure function covered by a table-driven test of every combination (≥ 40 rows). `ingest.py` and the upload service both call it; `_should_package`/`raw_mode_is_playable` are replaced by it (their behavior is the table's first rows — keep them as regression cases).

### Host capabilities (`videohosting/services.py::host_capabilities()`)

`{serverless: IS_SERVERLESS_RUNTIME, ffmpeg: packaging.ffmpeg_available() and not IS_VERCEL, persistentHost: not serverless}`. Specs declare `needs: frozenset[str]` (`{"ffmpeg","persistent_host"}` for Telegram; `∅` for Drive and link providers). `diagnostics.provider_available(code)` already gates uploads — extend it to include unmet `needs` with an Arabic reason, so the Studio uploader can disable a provider **and say why**.

## 4.2 Data model changes (all additive; owner: `features/videohosting`)

```
PlaybackMode (common/choices.py): hls | raw | embed | external
Protection   (common/choices.py): encrypted | gated | none
PackagingPolicy (common/choices.py): auto | always | never

VideoProvider (+)  packaging_policy CharField(8, default "auto")      # not part of spec.row_defaults(), so ensure_defaults() will not overwrite it
VideoAsset (+)
  playback_mode   CharField(10, choices=PlaybackMode, blank)           # STORED, replaces the master_playlist-emptiness inference (G9)
  protection      CharField(10, choices=Protection, blank)
  external_ref    CharField(255, blank)          # youtube/vimeo id, or the https URL for `external`
  poster_url      URLField(400, blank)
  mime_type       CharField(60, blank)
  source_sha256   CharField(64, blank)           # computed during upload; dedupe + integrity
  owner           (reuse created_by — do NOT add a second owner column)
VideoCaption(UUIDModel, TimeStampedModel)
  asset FK related "captions" · language CharField(12) · label CharField(60) · is_default Bool · vtt TextField   # ≤ 512 KB, must start with "WEBVTT"
  unique(asset, language)
LessonProgress(UUIDModel, TimeStampedModel)          # lives in `courses` (owner of lessons) — listed here because playback writes it
  user FK · lesson FK related "progress_rows" · position_seconds PositiveInt · duration_seconds PositiveInt
  watched_seconds PositiveInt (monotonic, capped at duration) · completed Bool · completed_at DateTime null
  unique(user, lesson); index(lesson, completed)
UploadSession (existing, now LIVE) — add: user FK null, file_name, mime_type, source_sha256_partial
```

**Backfill (idempotent `RunPython`, A3):**
1. For every existing `VideoAsset`: set `playback_mode` = `hls` if it has a non-empty `master_playlist`, else `raw` if `source_file_id` and provider is Drive, else leave blank; set `protection` accordingly (`encrypted`/`gated`). Blank-mode assets stay un-watchable exactly as today.
2. Legacy link: for each asset whose slug matches `^(?P<course>[^-]+(?:-[^-]+)*)--(?P<lesson>.+)$`, find the **unique** `CourseLesson` with `module__course__slug=course` and `lesson_id=lesson`; if exactly one match, set `lesson.video_asset` and `kind="video"`. If zero or several matches, skip and record the slug in the result note (never guess).

## 4.3 Entitlement — the fix for G1 (`videohosting/services.py::playback_access`)

```
playback_access(user, asset) -> Access(allowed: bool, reason: str, via: "admin"|"owner"|"staff"|"preview"|"enrolled")
```

Evaluated in this order (first match wins; table-driven in `ACCESS_RULES`, one rule per tuple, rule R7):

| # | Rule | Allowed when |
| :--- | :--- | :--- |
| 1 | admin | `videos.watch_any` or `administrator` |
| 2 | owner | `asset.created_by == user` (instructors can always preview their uploads) |
| 3 | course staff | the user is `CourseStaff` of any course that has a lesson linked to this asset, **or** holds `courses.edit_any` / `curriculum.edit_any` (authoring preview works on drafts) |
| 4 | free preview | a linked lesson has `is_free_preview=True` **and** its course is `published` |
| 5 | enrolled | the user holds `lessons.watch` **and** an `Enrollment` in a course that has a published linked lesson and whose status is `published` or `archived` |
| — | deny | everything else, including **unlinked assets** for non-owners (an asset not attached to anything is private to its uploader) |

Enforced at: `POST /videos/<slug>/token` (`403 not_entitled`, code in the envelope, message constants in `messages.py`), `GET /videos/<slug>` meta (**404 for non-entitled**, so existence is not revealed), the new lesson-playback endpoint (§4.5). Stream/segment/key/raw endpoints stay **token-authenticated** (hls.js cannot send headers) — the entitlement is baked into the token at mint time (the existing design). TTL stays `STREAM_TOKEN_TTL_HOURS`; add `VIDEO_GRANT_TTL_PREVIEW_MINUTES` (default 30) for rule 4 (anonymous-style previews are short).

> **Cost of this check:** ≤ 3 queries (asset→lessons→course/enrollment in one `select_related` + one `exists()`), pinned with `assertNumQueries`. Mint stays a single-row insert plus the existing `F()` counter.

> **Known limit to document, not fix:** paid courses have `price_type="paid"` but **there is no payment system**, so enrollment is free and entitlement = enrollment. Payments are backlog item B1; the entitlement function has one rule (5) to extend when they exist.

## 4.4 Provider registry extensions (data over branches — R7)

`providers/base.py::ProviderSpec` gains optional fields (all defaulted, so existing specs stay valid):

```python
kind: str = "storage"                         # "storage" | "link"
needs: frozenset[str] = frozenset()           # {"ffmpeg", "persistent_host"}
parse_reference: Callable[[str], Reference | None] | None = None   # link providers: url -> (provider, external_id, canonical)
embed_url: Callable[[str], str] | None = None                      # link providers: external_id -> iframe src
delete_remote: Callable[[VideoAsset], None] | None = None          # best-effort cleanup of provider-side files
```

New modules, each registered in `SPECS` (README's four-step recipe, nothing else touched):

| Module | Behavior |
| :--- | :--- |
| `providers/youtube.py` | Accepts `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`; id must match `^[\w-]{11}$`; `embed_url` → `https://www.youtube-nocookie.com/embed/<id>?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`. `protection="none"`. |
| `providers/vimeo.py` | Accepts `vimeo.com/<digits>` (+ optional hash for unlisted), `player.vimeo.com/video/<digits>`; `embed_url` → `https://player.vimeo.com/video/<id>?dnt=1`. |
| `providers/external.py` | `https:` only; extension ∈ `{.mp4,.webm,.m3u8}` after parsing the URL path (query ignored); host must not be an IP literal, `localhost`, or a private/loopback/link-local range (**no SSRF surface — and the server never fetches the URL anyway, D13**); max length 500. |

Reference parsing is pure string/URL parsing — **no network calls**. Unit-test each parser with ≥ 12 valid and ≥ 12 hostile inputs (`javascript:`, `data:`, userinfo URLs, unicode lookalike hosts, overlong ids, `//evil`, trailing-garbage).

Also add `delete_remote` for Drive (`DELETE /files/{id}`, `timeout=`, failures swallowed + logged as `AuditEvent(action="remote_orphan")`) and Telegram (delete messages, best-effort).

## 4.5 API

### Public / learner (`videohosting/urls.py`, `courses/urls.py`)

| Method | Path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/videos/<slug>/token` | authenticated + entitled | **Existing route, now entitlement-checked.** Body (optional, additive): `{lessonRef:{course,lesson}}` to attribute the view. |
| POST | `/courses/<slug>/lessons/<lesson_id>/playback` | authenticated + entitled | **New, preferred.** Resolves the lesson's linked asset server-side (the frontend no longer computes `<courseId>--<lessonId>`), runs `playback_access`, mints, and returns the grant **plus** `resumeAt` (from `LessonProgress`), `lesson: {id, title, nextLessonId}`. `409 no_video` when the lesson has none. |
| GET | `/stream/<token>/captions/<lang>.vtt` | token | `text/vtt; charset=utf-8`, `no-store`. |
| PUT | `/courses/<slug>/lessons/<lesson_id>/progress` | authenticated + enrolled | Heartbeat `{positionSeconds, durationSeconds, watchedDeltaSeconds}`; throttle scope `video_progress` (`30/min`); server clamps `position ≤ duration`, `watchedDelta ≤ 45` per call (anti-cheat: a client cannot claim 2 h of watching in one request), marks `completed` at ≥ 90 % of duration, never un-completes. One `update_or_create` on SQLite WAL is fine; **no per-heartbeat course recompute** (done lazily in Phase 11). |

**Extended grant payload** (additive over `minted_token`): `mode` now ∈ `hls|raw|embed|external` (read from the **stored** field, G9), plus `protection`, `provider`, `embedUrl` (embed), `sourceUrl` (external), `poster`, `captions:[{language,label,url,isDefault}]`, `resumeAt`, `qualities` (hls: the ladder), `durationSeconds`. Embed/external grants carry **no token** (`token:""`) and a short `expiresAt` the client treats as "re-fetch after".

### Instructor upload pipeline (`/api/studio/videos/…`, throttle `studio_write`; permissions from the Phase-1 catalog)

| Method | Path | Permission | Behavior |
| :--- | :--- | :--- | :--- |
| GET | `/studio/videos` | `videos.manage_own` | Own assets, paged, `?status=&q=&scope=own\|all` (`all` needs `videos.manage_any`). Row = `_asset_row` + `lessonsUsing`, `sizeBytes`, `playbackMode`, `protection`. |
| GET | `/studio/video-providers` | `studio.access` | For the uploader: per provider `{code,name,kind,available,reason,needs,packagingPolicy,effectivePlan}` where `effectivePlan` is what `resolve_playback_plan` would do **right now** ("سيُشغَّل مباشرةً بدون تغليف" / "سيُغلَّف بـ FFmpeg"). The UI shows this, so nobody is surprised. |
| POST | `/studio/videos` | `videos.upload` | Create asset `{title, provider, packaging?: auto\|never}` → `201`. Link providers instead take `POST /studio/videos/link` `{url, title}` (needs `videos.use_embed`) and return a `ready` asset immediately. |
| POST | `/studio/videos/<id>/uploads` | `videos.upload` + owner/`manage_any` | **Init resumable upload** `{fileName, sizeBytes, mimeType}`: validates extension allow-list (`mp4,mov,m4v,webm,mkv`), size ≤ `VIDEO_UPLOAD_MAX_BYTES` (moved to `settings.py`, default 2 GiB — the hard-coded `2**31` in `console/views.py` goes away, R5), per-user quota `VIDEO_USER_QUOTA_BYTES` (default 20 GiB; `manage_any` exempt), provider availability + `needs`; for Drive creates the **resumable session server-side** and stores `upload_uri` **only in `UploadSession`** (D14). Returns `{sessionId, chunkSize, offset:0}`. |
| PUT | `/studio/uploads/<sessionId>/chunk` | owner | Body = raw bytes; header `Content-Range: bytes a-b/total`. `chunkSize` = `VIDEO_UPLOAD_CHUNK_BYTES` (default **4 MiB** — a multiple of Google's required 256 KiB **and** under Vercel's 4.5 MB request cap that the README already documents). Server relays the chunk, advances `bytes_uploaded` **idempotently** (a repeated chunk returns the current offset, never double-counts), returns `{offset, complete}`. First chunk is **magic-byte sniffed** (`ftyp` for MP4/MOV/M4V, EBML for WebM/MKV) — reject otherwise. |
| GET | `/studio/uploads/<sessionId>` | owner | `{offset, total, status}` — how a reloaded tab resumes. |
| POST | `/studio/uploads/<sessionId>/complete` | owner | Verifies size, asks Drive for the final file id, sets `source_file_id`, `source_size_bytes`, runs `resolve_playback_plan` → status `ready` (raw) or `staged`/`processing` (package job). Idempotent. |
| DELETE | `/studio/uploads/<sessionId>` | owner | Abort; Drive session cancel best-effort; marks asset `error: cancelled`. |
| POST/DELETE | `/studio/videos/<id>/captions[/<language>]` | `videos.manage_own` | Upload VTT (≤ 512 KB, `WEBVTT` header, valid language tag). |
| PATCH | `/studio/videos/<id>` | `videos.manage_own` | `title`, `posterUrl`. |
| DELETE | `/studio/videos/<id>` | `videos.manage_own` | `409 asset_in_use` (with the lessons listed) when linked to a lesson of a **published** course; otherwise deletes the row and calls `spec.delete_remote` after commit. |

`console/*` (admin) retrofits: providers/diagnostics/system-config/drive-oauth → `videos.configure`; asset list/detail/delete → `videos.manage_any` (list is now **paged**, no more silent "first 100"). Add `POST /admin/video-providers/<code>/policy` `{packagingPolicy}` and surface it in the existing `VideoHostingView`.

**Packaging job (Telegram, FFmpeg host only).** Studio's "Telegram" uploads on a persistent host go through a **spool**: chunks append to `$VIDEO_SPOOL_DIR/<sessionId>.part` (new setting; must exist and be on persistent disk; refuse to enable the provider otherwise — surfaced by diagnostics), `complete` enqueues by flipping the asset to `processing` and starting the existing ingest worker thread (`ingest.ingest_file(..., track_progress=True)`); a **`manage.py package_pending`** command re-drives stuck `processing`/`staged` assets older than N minutes (idempotent, overlap-guarded like `cleanup_expired`) — this is the "retry" story the README promised without introducing Celery (A5). On serverless the Telegram option is simply **unavailable with a reason**.

## 4.6 Raw proxy hardening (G11 — the backend currently streams bytes through Django)

The README's claim "the backend never proxies a video byte" is false for raw mode; **make the code honest and bounded**, don't pretend:

1. **Cap the range window:** rewrite open-ended `Range: bytes=N-` into `bytes=N-(N+RAW_RANGE_CAP-1)` (`VIDEO_RAW_RANGE_CAP_BYTES`, default 8 MiB) and answer `206`; players simply request the next window. Bounds per-request time/memory on serverless.
2. **Concurrency guard:** process-wide `threading.BoundedSemaphore(VIDEO_RAW_MAX_CONCURRENT, default 4)`; when full → `503` + `Retry-After: 2` (`raw_busy`); the player backs off.
3. Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store`, `Accept-Ranges: bytes`; **never** forward Google's `Set-Cookie`/auth headers.
4. Fix the README paragraph to state the truth (raw = proxied, bounded; HLS = redirect).
5. Token-in-query (G20): documented trade-off; response carries `Referrer-Policy: no-referrer` so it is not leaked via `Referer`.

## 4.7 Settings & env (single reader — `config/settings.py`; add to `.env.development` placeholders and `backend/README.md`)

`VIDEO_UPLOAD_MAX_BYTES`, `VIDEO_UPLOAD_CHUNK_BYTES`, `VIDEO_USER_QUOTA_BYTES`, `VIDEO_SPOOL_DIR`, `VIDEO_RAW_RANGE_CAP_BYTES`, `VIDEO_RAW_MAX_CONCURRENT`, `VIDEO_GRANT_TTL_PREVIEW_MINUTES`, `VIDEO_EMBED_ALLOWED_HOSTS` (default `youtube-nocookie.com,vimeo.com`). Add `video_progress` and `studio_write` to `SCOPED_RATES`.

## 4.8 Spikes (time-boxed; each ends with `plan/spike-<n>-result.md` and a go/no-go — do **not** code the feature before the spike)

| ID | Question | Timebox | Why it is uncertain |
| :--- | :--- | :--- | :--- |
| S-1 | Can Telegram serve a **raw** (un-packaged) source for playback when FFmpeg is unavailable? | 2 days | The Bot API file download is size-limited (≈ 20 MB, **(?) verify current limit**) so large sources need MTProto streaming from a persistent process; that does not exist on serverless. If no-go, the matrix row stays "refused with reason" (the default). |
| S-2 | Can **Drive HLS** (packaged segments stored on Drive) be served acceptably? | 2 days | Drive objects need the backend's bearer, so every segment would be proxied, defeating the 302-to-CDN economy. Likely no-go for v1. |
| S-3 | Does the **4 MiB chunk relay** to Drive's resumable endpoint behave within serverless time/size limits and Drive's `308` semantics? | 1 day | Requires a real Google account; cannot be proven offline. Offline tests use a fake transport; the spike records the real-world result. |

## 4.9 Tests

- **Plan resolver table** (≥ 40 rows): provider × host (serverless/FFmpeg/persistent) × per-upload × per-provider policy × global toggle → expected `(mode, package, reason)`; includes the old `_should_package` / `raw_mode_is_playable` behaviors as regression rows.
- **Entitlement matrix** (table-driven): each of the 5 rules, anonymous, un-enrolled student, enrolled-in-draft-course student, archived-course student, other instructor, unlinked asset (owner yes / others no), free preview on a published vs unpublished course. Mint → `403 not_entitled`; meta → `404`.
- **Reference parsers**: valid/hostile corpora (§4.4). **Captions**: header/size/language validation; token-gated serving.
- **Upload service** with a fake Drive transport: init validation (extension, size, quota, unavailable provider); chunk idempotency (duplicate chunk, out-of-order chunk → `409 offset_mismatch` carrying the true offset); magic-byte rejection; resume after "tab reload" (`GET session`); complete idempotent; abort; `upload_uri` never appears in any response (assert on serialized JSON).
- **Raw proxy**: range rewrite, `206`, semaphore `503`, headers, no upstream auth leakage; HLS flow tests (token → master → media → key → segment 302) **unchanged and green**.
- **Progress**: clamping, monotonic `watched`, completion at 90 %, no un-complete, throttle, enrolled-only.
- **Backfill**: idempotent; ambiguous slug skipped; modes set correctly.
- **Query pins**: mint ≤ N, playback endpoint ≤ N, studio video list constant in page size.
- **Contract**: every pre-existing grant/meta key still present with the same type; `spectacular` zero warnings.

## 4.10 Acceptance criteria

1. A signed-in student who is **not** enrolled cannot mint a grant for a paid/unpublished/unlinked asset (`403`); an enrolled student and a free-preview visitor can.
2. An instructor uploads a 300 MB MP4 to Drive in 4 MiB chunks, reloads the tab mid-upload, and resumes without re-sending completed chunks; the asset ends `ready` in `raw` mode; the lesson plays.
3. Pasting a YouTube, Vimeo or HTTPS-MP4 link creates a `ready` asset in seconds; hostile URLs are rejected.
4. With FFmpeg off, selecting Telegram is **disabled with a reason**, never a dead `staged` asset. With an FFmpeg persistent host, a Telegram upload ends `ready` in `hls` mode.
5. Every previously working playback request still works (flow tests unchanged).
6. `README.md` for `videohosting` rewritten: the matrix, the plan resolver, entitlement rules, upload protocol, raw-proxy honesty, the "add a provider" recipe incl. `kind="link"`.

---

# PHASE 5 — Video player system (frontend)

**Branch:** `Feature/PlayerSystem`. **Needs:** Phase 4 contracts (use the OpenAPI schema; mock only at the fetcher seam in tests).
**Skills:** `fe-component-architecture`, `fe-data-fetching-and-client-cache`, `fe-accessibility`, `fe-rtl-and-i18n`, `design-motion-implementation`, `design-mobile-first-and-touch`, `perf-frontend-web-vitals`, `fe-testing-and-visual-qa`.
**Goal:** a single player that plays **any** grant mode through interchangeable engines behind one control surface, replaces the simulated mock, resumes where you left off, records progress, and degrades gracefully. Fixes G8 on the client and G12.

## 5.1 Architecture — engines are data, the stage is dumb

```
features/videohosting/
├── engines/
│   ├── types.ts            PlaybackEngine interface + EngineEvent union + capability flags
│   ├── registry.ts         ENGINE_FOR: Record<`${mode}`|`${mode}:${provider}`, () => Promise<EngineModule>>   // lazy chunks, no if/else
│   ├── hlsEngine.ts        hls.js (dynamic import) — ABR levels, error recovery, key/segment retry policy
│   ├── nativeHlsEngine.ts  Safari/iOS <video src=master.m3u8>
│   ├── fileEngine.ts       raw + external mp4/webm (progressive, Range)
│   ├── youtubeEngine.ts    IFrame API loaded lazily from youtube.com/iframe_api; maps events to EngineEvent
│   └── vimeoEngine.ts      dynamic import of @vimeo/player (pinned; lazy chunk)   // allowed new dep (D17 amendment)
├── hooks/usePlayback.ts    resolves the grant → picks the engine → exposes a normalised state/controls
├── data/videoHostingFetchers.ts   + fetchLessonPlayback, putLessonProgress
├── components/overlays/{WatermarkOverlay, ResumePrompt, UpNextCard, PlayerErrorPanel, PlayerBadges}
└── types.ts                StreamGrant extended (mode, protection, provider, embedUrl, sourceUrl, captions, resumeAt, qualities)
```

```ts
interface PlaybackEngine {
  readonly id: 'hls' | 'native' | 'file' | 'youtube' | 'vimeo';
  readonly capabilities: { speed: boolean; quality: boolean; captions: boolean; pip: boolean; fullscreen: boolean; seek: boolean; airplay: boolean };
  attach(host: HTMLElement, grant: StreamGrant, opts: { startAt: number; autoplay: boolean }): Promise<void>;
  play(): Promise<void>; pause(): void; seek(seconds: number): void;
  setRate(rate: number): void; setVolume(v: number): void; setMuted(m: boolean): void;
  setQuality(id: string | 'auto'): void;        // ids come from `qualities` event
  setCaptions(lang: string | null): void;
  on<E extends EngineEvent['type']>(type: E, cb: (e: Extract<EngineEvent, { type: E }>) => void): () => void;
  destroy(): void;                               // MUST release listeners, timers, hls instance, iframe, object URLs
}
// EngineEvent: time{current,duration,buffered} | state{playing|paused|buffering|ended|idle} | qualities{levels,current} | captions{tracks,current} | error{kind,fatal,retryable,detail} | ready
```

**The existing `videoPlayerStore` is kept as the UI-facing store** (the components already subscribe through `useSyncExternalStore`), but it stops simulating: it mirrors whichever engine is attached. The `mock` provider and the simulated ticker are **removed from the production path**; a lesson with `hasVideo=false` shows an honest "لا يوجد فيديو لهذا الدرس بعد" state (and, for an article lesson, the Markdown body — Phase 8). `videoProviders.ts` is deleted; its `supports` flags become each engine's `capabilities` (the `PlayerSettingsMenu` reads capabilities, not a provider table).

## 5.2 Behavior spec

| Area | Behavior |
| :--- | :--- |
| **Grant lifecycle** | Call `POST /courses/:slug/lessons/:lesson/playback` on lesson change (not the slug-derived `POST /videos/:slug/token`). Abort in-flight requests on change (`AbortController`). Never cache a grant (IP-bound, expiring). On an `hls`/`raw` fatal network error that looks like token expiry (`403 token_invalid`): **re-mint once, reattach at the current position, no UI flash**; second failure → error panel. |
| **Errors by cause** (`PlayerErrorPanel`, Arabic copy in `videohosting/data/playerCopy.json`) | `403 not_entitled` → "هذا الدرس للمسجّلين" + enroll CTA · `409 not_ready/staged/processing` → "الفيديو قيد المعالجة" + auto re-poll with backoff (max 10 min) · `409 no_video` · `503 raw_busy` → silent backoff then retry · `404` · network/offline → retry button · unsupported browser · autoplay blocked → large play button. Every state has a retry that works. |
| **Resume** | `resumeAt` from the grant. < 10 s or > 95 % → start from 0. Otherwise auto-seek and show a dismissible chip "تابع من 12:40 — البدء من جديد" for 6 s. |
| **Progress** | Heartbeat `PUT …/progress` every 15 s while playing **and** on pause/seek-end/ended/`visibilitychange→hidden`/`pagehide` (use `fetch(..., {keepalive:true})` — `sendBeacon` cannot carry the Authorization header). Sends `watchedDeltaSeconds` (≤ 45), skips when unchanged, never blocks UI, failures are silent and retried on the next tick. |
| **Up next** | On `ended`: card "الدرس التالي: …" with a 5 s ring countdown (cancelable, respects reduced-motion by showing a static progress bar); falls through to the problems/quiz tab when it was the last lesson (existing `lessonDoneToast` behavior is preserved). |
| **Preferences** | Speed, volume/mute, captions language, preferred quality persisted in `localStorage` (guarded by try/catch — it can throw in private windows); per-user key prefix. |
| **Captions** | Native `<track>` elements for hls/file engines (`/stream/<token>/captions/<lang>.vtt`); YouTube/Vimeo use their own caption APIs; a custom `::cue` style using design tokens, large enough for Arabic. |
| **Quality** | hls levels → menu "تلقائي / 720p / 480p / 360p"; `file`/embed → hidden (capability false). Switching quality keeps position and does not rebuffer from 0. |
| **Speed** | 0.5 / 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2; long-press right half = 2× (mobile, release restores). |
| **Mobile gestures** | Double-tap left/right = −10/+10 s with a ripple label; single tap toggles controls; controls auto-hide after 3 s of playing and always show when paused/focused. |
| **PiP / AirPlay / Fullscreen** | Real PiP on the bound `<video>` (not for iframes); fullscreen on the stage container (already present); orientation lock to landscape on mobile fullscreen where supported (feature-detected). |
| **Media Session API** | Title, artwork (course thumbnail), play/pause/seek handlers → lock-screen and headset controls. |
| **Theater mode** | Desktop toggle that widens the stage and collapses the syllabus rail (persisted). |
| **Watermark** | Keep `WatermarkOverlay`; for `protection:"none"` modes render a small honest badge "مصدر خارجي" instead of implying protection; `PlayerBadges` shows `مشفّر / محمي / خارجي` from `protection`. |
| **Keyboard** | Keep the existing map (`space/k`, `←/→`, `m`, `c`, `f`, `p`); add `j/l` ±10 s, `0-9` jump to 0-90 %, `<`/`>` speed, `Shift+/` shortcut help overlay. Never hijack typing targets (existing rule). |
| **Performance** | Engines and hls.js are **dynamic imports**; first paint of the course player must not grow the main bundle (budget enforced in Phase 13). Preconnect to the grant origin on lesson hover/focus (≤ 1 request). |
| **Cleanup** | `destroy()` on lesson change/unmount releases everything; a test asserts no listener/timer leak by counting `addEventListener`/`removeEventListener` and `setInterval`/`clearInterval` pairs on a fake host. |

## 5.3 Accessibility (WCAG 2.2 AA — `fe-accessibility`)

Seek bar is `role="slider"` with `aria-valuemin/max/now` and `aria-valuetext="٠٣:١٢ من ١٢:٤٠"`, arrow-key steps and `PageUp/Down` ±60 s; play/pause toggles expose `aria-pressed`/label changes; settings menu is a proper menu with roving focus and `Esc` to close and return focus; a visually-hidden `aria-live="polite"` region announces "تم الإيقاف المؤقت", "جارٍ التحميل", "انتهى الدرس"; focus ring uses the existing token; 44 px touch targets; captions on by default if the learner enabled them; reduced-motion disables the up-next ring animation, ripple and control fades; contrast ≥ 4.5:1 on controls over any frame (use a scrim gradient token).

## 5.4 Tests

Vitest + Testing Library, a `FakeEngine` implementing the interface and a `FakeMedia` (`HTMLMediaElement` stub with settable `currentTime/duration/paused` and dispatchable events — jsdom has no media pipeline):
- **Engine registry**: table test — every `(mode, provider)` resolves to the expected engine; unknown → error panel (never a thrown render).
- **Engine contract suite** run against each engine's adapter with its SDK mocked: `attach → play → time events → seek → rate → destroy`; `destroy` is idempotent and leak-free.
- **usePlayback state machine**: loading → ready → playing → ended; entitlement error; not-ready polling with fake timers (backoff, cap, cancel on unmount); token-expiry re-mint-once then give up; lesson change aborts the in-flight grant (no stale engine attached — the classic race).
- **Progress**: heartbeat cadence (fake timers), delta clamp, unchanged-skip, flush on pause/hidden, silent failure retry.
- **Resume**: boundaries (<10 s, >95 %), chip dismissal. **Up next**: countdown, cancel, last-lesson fallthrough.
- **Components**: seek slider keyboard + aria-valuetext in Arabic numerals; settings menu focus management; error panel per cause + working retry; shortcut help overlay; reduced-motion variant.
- **Store**: no simulated ticker remains (assert no `setInterval` when idle).
- **Visual QA** (Playwright, pre-installed in the environment): screenshots of stage in loading/playing/paused/error/up-next at 375/768/1280 px, RTL, recorded in the result note.

## 5.5 Acceptance criteria

1. The same course player plays an HLS-encrypted lesson, a raw Drive lesson, a YouTube lesson, a Vimeo lesson and an HTTPS-MP4 lesson with identical controls (unsupported ones hidden, not broken).
2. Closing the tab mid-lesson and reopening resumes within 15 s of where it stopped, and the dashboard shows the lesson as in progress.
3. An un-enrolled learner sees the entitlement panel, not a spinner or a crash.
4. No simulated playback remains reachable in production; no memory/timer leaks in the engine contract suite.
5. Lighthouse-style check (manual or scripted) records: main bundle unchanged ± 2 KB gzip, player chunk lazy. All gates green.


---

# PHASE 6 — Quiz & exam system (server-graded)

**Branch:** `Feature/Quizzes`. **Needs:** Phase 3 (courses/lessons/ownership). **New backend app:** `quizzes`. **Coordinated frontend slice:** the learner's problems/exam panels.
**Skills:** `be-architecture`, `be-api-design`, `be-auth-and-security`, `db-schema-design-and-migrations`, `be-testing`, `fe-forms-and-validation`.
**Goal:** instructors can author practice sets, lesson quizzes and a final exam; learners take them with a **server-authoritative timer and grading**; correct answers are never sent before they are allowed. Fixes G2 and G13.

## 6.1 Data model (`features/quizzes/models.py`, app label `quizzes`)

```
QuizKind (choices): practice | lesson_quiz | exam
RevealPolicy (choices): never | after_submit | after_pass | after_close
QuestionKind (choices): single | multiple | true_false

Quiz(UUIDModel, TimeStampedModel)
  course FK (courses.Course) related "quizzes" · lesson FK (courses.CourseLesson) null  # set for lesson_quiz
  kind, title CharField(160), instructions TextField(Markdown, blank)
  is_published Bool default False · order PositiveInt
  time_limit_minutes PositiveInt null            # null = untimed
  pass_threshold PositiveInt default 70          # percent
  max_attempts PositiveInt null                  # null = unlimited (practice default)
  draw_count PositiveInt null                    # exam: draw N random questions from the bank
  shuffle_questions Bool · shuffle_options Bool
  reveal_policy CharField default "after_submit" (practice: "after_submit"; exam default "after_close")
  unlock_progress_percent PositiveInt default 0  # exam default 80: learner progress needed before starting
  created_by FK User null SET_NULL
  constraint: at most one `exam` per course (UniqueConstraint on course where kind="exam")

Question(UUIDModel)
  quiz FK related "questions" · kind · prompt TextField(Markdown) · code TextField(blank, shown LTR monospace)
  explanation TextField(blank) · hint TextField(blank) · points PositiveInt default 1 · order PositiveInt
  partial_credit Bool default False             # multiple-choice only

Option(UUIDModel)
  question FK related "options" · label CharField(300) · is_correct Bool · order PositiveInt
  rule: single/true_false → exactly one correct; multiple → ≥ 1 correct and ≥ 2 options; true_false → exactly 2 fixed options

Attempt(UUIDModel, TimeStampedModel)
  quiz FK · user FK · status: in_progress | submitted | expired
  started_at, deadline_at (null if untimed), submitted_at null
  question_order JSONField (the drawn + shuffled question ids)  option_order JSONField ({qid:[optionIds]})
  score DecimalField · max_score DecimalField · percent PositiveSmallInt · passed Bool null
  index (user, quiz, -started_at); UniqueConstraint(user, quiz) where status="in_progress"   # one live attempt

Answer(UUIDModel)
  attempt FK related "answers" · question FK · selected JSONField(list[option_id]) · is_correct Bool null · points_awarded Decimal
  unique(attempt, question)

AttemptGrant(UUIDModel, TimeStampedModel)         # extra attempts an instructor gives a learner
  quiz FK · user FK · extra PositiveInt · granted_by FK User null · note CharField(200, blank)
  unique(quiz, user)
```

**Legacy practice set (no destructive migration):** `CourseProblem/CourseProblemOption` stay. `GET /courses/<slug>/problems` and `GET /problems` keep their paths and envelope (`{items}`), but **answers are stripped**: `correctOptionId`, `explanation` and `hint` are removed from the payload (G2). If the course has a published `practice` quiz, its questions are returned instead of the legacy shared set. New `POST /problems/<problem_id>/check` serves legacy ids. Both legacy endpoints are deprecated in Phase 12.

## 6.2 Services (`quizzes/services.py`)

| Function | Rule |
| :--- | :--- |
| `can_author(user, quiz_or_course)` | `quizzes.edit_any` or (`quizzes.edit_own` ∧ `CourseStaff` kind ∈ `OWN_KINDS`); creation needs `quizzes.create` + staff on the course. |
| `validate_quiz(quiz) -> list[Issue]` | Publishable only if: ≥ 1 question; every question has valid correct-option shape; `draw_count ≤ bank size`; exam has `pass_threshold` 1–100; time limit 1–600. Also feeds the course checklist (`no_quiz` warning in Phase 3 becomes accurate). |
| `start_attempt(user, quiz)` | Requires `quizzes.attempt` + **enrolled** in a published/archived course + quiz published + `unlock_progress_percent` met (`Enrollment.progress`) + attempts remaining (`max_attempts + AttemptGrant.extra - used`, counting `submitted`/`expired`). **Idempotent:** an existing `in_progress` attempt is returned (and expired-and-graded first if past its deadline). Draws `draw_count` questions, shuffles per policy with a per-attempt seed stored in `question_order/option_order` (so reload keeps the same order). |
| `save_answers(attempt, items)` | Only while `in_progress` and `now ≤ deadline_at + GRACE (10 s)`; validates every option id belongs to that question; replaces selections idempotently. Never reveals correctness. |
| `submit_attempt(attempt)` | Transactional and **idempotent** (second call returns the stored result). Grades: single/true_false exact; multiple all-or-nothing, or with `partial_credit` `points × max(0, (right − wrong)/total_correct)`. Computes `percent`, `passed`, stores per-answer rows, hooks `on_exam_passed` (Phase 11 certificate issuance) and `on_quiz_submitted` (notification/analytics). |
| `expire_overdue()` | Grades every overdue `in_progress` attempt with whatever was saved (`status=expired`); called lazily on access **and** by `run_cleanup` so abandoned attempts do not linger. |
| `result_view(attempt, viewer)` | Applies `reveal_policy`: `never` → score only; `after_submit` → full feedback; `after_pass` → feedback only if passed; `after_close` → feedback when the learner has no attempts left. This is the **only** place correctness is ever serialized. |
| `check_practice_answer(user, question, option_ids)` | Practice quizzes only: returns `{correct, correctOptionIds, explanation}` for instant feedback; rate-limited (`quiz_check`, `120/min`); refuses non-practice kinds (`403 not_practice`). |
| `grant_extra_attempt(actor, quiz, user, count, note)` | Needs `quizzes.reset_attempts` + staff-of-course; audited. |
| `quiz_stats(quiz)` | Attempts, completion, mean/median score, pass rate, score histogram (10 buckets), per-question % correct and most-chosen wrong option, mean duration — a handful of aggregate queries, constant in learners. |

## 6.3 API

Learner (`/api/…`, `IsAuthenticated`):

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/courses/<slug>/quizzes` | Published quizzes + the caller's summary `{attemptsUsed, attemptsLeft, bestPercent, passed, locked:{reason, needed}}`. |
| POST | `/quizzes/<id>/attempts` | Start/resume. Returns `{attemptId, serverNow, deadlineAt, questions:[{id,kind,prompt,code,points,options:[{id,label}]}]}` — **no** `isCorrect`, `explanation`, `hint`. |
| GET | `/attempts/<id>` | In progress → same payload + saved selections; finished → result via `result_view`. |
| PUT | `/attempts/<id>/answers` | `{answers:[{questionId, optionIds}]}` autosave (throttle `quiz_save`, `60/min`). |
| POST | `/attempts/<id>/submit` | Grade → result. |
| POST | `/questions/<id>/check` · `/problems/<problem_id>/check` | Practice only. |

Authoring (`/api/studio/quizzes…`, throttle `studio_write`):

| Method | Path | Permission |
| :--- | :--- | :--- |
| GET/POST | `/studio/courses/<slug>/quizzes` | edit-own/any · `quizzes.create` |
| GET/PATCH/DELETE | `/studio/quizzes/<id>` | `quizzes.edit_*` (delete → `409 has_attempts` when attempts exist → unpublish instead) |
| POST | `/studio/quizzes/<id>/publish` · `/unpublish` | `quizzes.edit_*` (+ `validate_quiz`) |
| POST | `/studio/quizzes/<id>/questions` · `/questions/reorder` | `quizzes.edit_*` |
| PUT/DELETE | `/studio/questions/<id>` | `quizzes.edit_*` — **editing a question that already has answers snapshots nothing** (answers store option ids; a changed key only affects future grading); the editor shows a warning chip "لهذا السؤال ٣٢ إجابة سابقة". |
| POST | `/studio/quizzes/<id>/import` | `quizzes.edit_*` — bulk import (CSV or JSON), **dry-run first** returning per-row errors; commit in one transaction. |
| GET | `/studio/quizzes/<id>/stats` | `quizzes.results_own/any` |
| GET | `/studio/quizzes/<id>/attempts` | `quizzes.results_*` — paged roster of attempts |
| GET | `/studio/quizzes/<id>/results.csv` | `quizzes.results_*` — **CSV-injection-safe** (cells starting with `= + - @` are prefixed with `'`), streamed |
| POST | `/studio/quizzes/<id>/extra-attempts` | `quizzes.reset_attempts` |

## 6.4 Frontend slice (learner side only; the authoring UI is Phase 10)

`courses/components/layout/ProblemsPanel.tsx` stops reading `correctOptionId` from the payload and calls `check` per question (optimistic selection, server verdict, explanation reveal animation). `ExamPanel.tsx` becomes a real flow: **intro** (rules, time limit, attempts left, unlock reason) → **taking** (one question per view, progress rail, flag-for-review, autosave on every selection with a tiny "حُفظ" tick, server-synced countdown that turns warning-colored at 5 min and danger at 1 min, `aria-live` announcements at 10/5/1 min, `beforeunload` guard) → **result** (score ring, pass/fail state with the gold achievement treatment on pass, per-question review per `reveal_policy`, "إعادة المحاولة" when allowed). The exam parameters on `Course` (`examQuestionCount`, …) remain as the display fallback when no exam quiz exists, so nothing regresses for old seed data. Timer correctness: the client shows `deadlineAt − (Date.now() + serverOffset)` where `serverOffset` is measured from `serverNow` on every fetch; the **server decides** expiry.

## 6.5 Tests

Grading matrix (single, multiple all-or-nothing, multiple partial incl. negatives floor at 0, true/false, zero-point edge); `result_view` × all four reveal policies × (passed/failed/attempts-left) — **an assertion that the serialized start payload never contains `isCorrect`/`explanation`/`hint`** (serialize and scan the JSON); attempt idempotency (double start, double submit, concurrent submit); deadline + grace; expiry grading; attempts-left arithmetic with grants; unlock rule; one-exam-per-course constraint; entitlement (not enrolled, draft course, archived-enrolled); authoring permissions matrix + ownership; `validate_quiz`; import dry-run vs commit; CSV injection corpus; `check` refused for non-practice; legacy problems payload no longer contains answers (**regression for G2**) and `/problems/<id>/check` works; query pins (start attempt, submit, stats constant in learners); frontend: timer offset math with fake timers, autosave debounce, `beforeunload`, reveal-policy rendering, a11y (radio/checkbox groups labelled, keyboard-only completion).

## 6.6 Acceptance criteria

1. Opening DevTools during an exam reveals no correct answers anywhere in network responses.
2. A timed exam keeps counting after a reload and is auto-graded at the deadline even if the tab is closed.
3. Passing the final exam emits the `on_exam_passed` signal that Phase 11 turns into a certificate.
4. Instructors can import 100 questions from CSV with a readable error report for bad rows.
5. All gates green.

---

# PHASE 7 — Studio shell: navigation, design language, home, course list

**Branch:** `Feature/StudioShell`. **Needs:** Phases 2, 3. **Frontend-heavy.**
**Skills:** `design-frontend-execution-playbook`, `design-dashboards-and-data-viz`, `design-system-and-tokens`, `design-ui-components`, `design-motion-implementation`, `design-motion-principles`, `design-mobile-first-and-touch`, `fe-component-architecture`, `fe-routing-and-url-state`, `fe-loading-states-and-skeletons`, `fe-rtl-and-i18n`, `design-review-and-polish-checklist`.
**Goal:** a beautiful, fast, Arabic-first Studio inside the existing dashboard experience, shown **only** to people who hold `studio.access` (instructors by default), with its own section group, home, and course list.

## 7.1 Where the Studio lives (decision D10, made concrete)

The learner dashboard stays at `/dashboard` untouched. A person with `studio.access` sees **two things appear**:
1. In the dashboard sidebar and in the main navbar: a **workspace switch** — «التعلّم» ⇄ «الاستوديو» (a segmented control using the existing `SlidingSegmentedControl`, shared). Plain links, no cross-feature import.
2. The Studio itself at `/studio/*`, a sibling feature with its own shell, because the router has no nested routes and the editor needs real deep links.

Students never see either; hitting `/studio` signed-in without the permission redirects to `/` (the Phase-1 `RouteGuard`), signed-out goes to `/login?next=`. **Role-awareness is purely permission-based**: a custom role that has `studio.access` + `videos.upload` and nothing else gets a Studio with only the Video Library; the nav is generated from permissions, not from a role name.

### Routes (`routes.json` → every entry declares `requiresPermission`, `immersive: true`, `skeletonVariant: "dashboard"`; remember `matchRoute` needs equal segment counts and the first match wins, so static paths precede parameterized ones)

| Path | Page | Permission |
| :--- | :--- | :--- |
| `/studio` | `StudioHomePage` | `studio.access` |
| `/studio/courses` | `StudioCoursesPage` | `studio.access` |
| `/studio/courses/new` | `StudioNewCoursePage` | `courses.create` |
| `/studio/courses/:slug` | `StudioCourseEditorPage` (`?tab=info\|curriculum\|quizzes\|live\|team\|publish\|settings`, `?lesson=<id>`) | `studio.access` + server edit check |
| `/studio/videos` | `StudioVideosPage` | `videos.manage_own` |
| `/studio/quizzes` | `StudioQuizzesPage` | `quizzes.edit_own` |
| `/studio/quizzes/:id` | `StudioQuizEditorPage` | `quizzes.edit_own` |
| `/studio/students` | `StudioStudentsPage` | `students.view_own` |
| `/studio/analytics` | `StudioAnalyticsPage` | `analytics.view_own` |
| `/studio/profile` | `StudioProfilePage` (public instructor profile) | `studio.access` |

Register each in `pageLoads.ts` (lazy chunk **per page** — the whole Studio must not load for learners) and in `PAGE_BY_PATH`. Update `RouteMeta` with `requiresPermission` (done in Phase 1). Add a Studio entry to `shellNav.json` and a **bottom bar** for mobile (الرئيسية · دوراتي · رفع · الطلاب · المزيد).

## 7.2 Shared chrome first (avoid R13 violations)

`features/dashboard` owns a rail, top bar and stat tiles; `features/studio` must not import them. **P7.1:** extract the presentational primitives into `src/shared/components/Workspace/` — `WorkspaceRail`, `WorkspaceRailItem`, `WorkspaceTopBar`, `WorkspaceUserChip`, `StatTile`, `SectionHeading`, `WorkspaceSwitch` — and re-point `DesktopDashboardSidebar`/`DashboardTopBar` at them. This is a **refactor with a parity gate**: before/after screenshots of `/dashboard` at 375/768/1280 px must match (pixel-diff threshold recorded) and the existing dashboard tests stay green. Only then build the Studio on the same primitives.

## 7.3 Studio design language ("Observatory — the Workshop")

Same system, same tokens (R14 — no new hex, no third accent). The grammar for the Studio:

- **Cyan = authoring** (the courses pillar): primary buttons, active rail item, focus rings, progress strokes.
- **Gold = achievement**, reserved for milestones: a course reaching 100 % readiness, the publish success moment, first-learner badge, certificates. Using gold for ordinary buttons is a bug.
- **Status chips (tokens only):** draft = `slate`, in review = `warning-500`, published = `success-500`, archived = `navy-600` outline, changes requested = `danger-500` outline.
- **Surfaces:** `navy-900` glass panels on the `navy-950` canvas, elevation moves *lighter* as it rises (`--shadow-elev-1/2`); the editor's working canvas is one level lighter than the page so the writing area reads as "paper under starlight".
- **Signature motif — the Readiness Astrolabe:** a ring (SVG, stroke-dashoffset) whose arcs are the checklist groups (معلومات · منهج · فيديو · اختبار · مراجعة); arcs fill cyan as groups complete and the ring blooms gold at 100 %. It appears on the course card, the editor header and the publish tab — the instructor's "north star".
- **Existing artwork reused:** `OrbitalEmblem` for empty states, `AstrolabeLoader` for blocking loads, `CelestialCanvas` as a very low-contrast backdrop on the Studio home hero.
- **Typography:** unchanged (Display = IBM Plex Sans Arabic, Body = Tajawal, numbers/time = Plex Mono `tabular-nums`). Markdown preview inherits the body font; code blocks force `dir="ltr"`.
- **Density:** Studio is a workspace — 8 px grid, 12 px gutters on mobile, 24 px on desktop; tables use 44 px rows (touch-safe).

### Motion spec (Celestial Motion System; **`transform`/`opacity` only; everything disabled under `prefers-reduced-motion`; durations ≤ 240 ms except hero)**

| Moment | Motion |
| :--- | :--- |
| Page enter | existing page transition (220 ms, `--transition-page-ease`) |
| KPI tiles | stagger in 40 ms apart; numbers **count up** over 600 ms (rAF, `tabular-nums` so width never jitters); skipped when reduced |
| Cards/rows | hover lift (`translateY(-2px)` + `--shadow-elev-2`); press scale .98 |
| Readiness ring | arcs animate `stroke-dashoffset` 500 ms when a group completes; **gold bloom** (single 900 ms glow pulse) at 100 % |
| Drag & drop | picked item lifts (`scale(1.02)`, shadow token), a 2 px cyan insertion line shows the drop target, siblings slide with FLIP; on drop a 120 ms settle |
| Autosave chip | cross-fade between «جارٍ الحفظ…» ⇄ «تم الحفظ ✓» (checkmark draws via stroke animation) |
| Publish success | confetti-free: constellation of 12 gold points radiates once from the ring and fades (CSS only, 900 ms) |
| Drawers/modals | slide from the inline-end edge (RTL-correct, logical) with scrim fade; focus trapped, focus returns on close |
| Skeletons | existing shimmer tokens; layout-stable (zero CLS) |

## 7.4 Studio Home (`/studio`)

```
┌ مرحبًا، {الاسم} ─────────────────────────────  [＋ دورة جديدة] [⬆ رفع فيديو] ┐
│  ◌ حلقة الاستعداد   ٤ دورات   ٢٬١٤٠ متعلّم   ٦٨٪ إتمام   ٤.٦ ★   ١ بانتظار المراجعة │
├─ تابع التحرير ────────────────┬─ بانتظارك ────────────────────────────────┤
│ [◌ 72%] أساسيات بايثون        │ ⚠ طلب المراجع تعديلات على «تحليل البيانات» │
│ آخر تعديل منذ ١٠ دقائق  [متابعة]│ ✉ ٣ أسئلة جديدة في «أساسيات بايثون»        │
├─ نشاط حديث ───────────────────┼─ أداء آخر ٣٠ يومًا ─────────────────────────┤
│ • سارة سجّلت في …             │  (line: التسجيلات)   (bar: إتمام الدروس)     │
└───────────────────────────────┴────────────────────────────────────────────┘
```

First-run (no courses): a **guided onboarding card** replaces the dashboard: ① أكمل ملفك كمدرّب ② أنشئ أول دورة ③ ارفع فيديو أو أضف رابطًا ④ أرسلها للمراجعة — each step ticks as it becomes true (derived from data, not stored flags). Sections are **permission-gated** (no `analytics.view_own` ⇒ no performance panel; no `students.view_own` ⇒ no activity feed).

**Instructor profile backend (needed by `/studio/profile`):** the existing `/api/profile` view edits only `fullName/phone/language/timezone/interests`-style learner fields — **it does not read or write `InstructorProfile`** [verified]. Add `GET/PATCH /api/studio/profile` (permission `studio.access`) for `headline` (≤ 160), `bio` (≤ 2 000, Markdown-sanitized on render), `credential` (≤ 200), `expertise` (≤ 10 labels), `avatarUrl` (https only); `ensure_profile` guarantees the row. The public instructor card on course pages (Phase 3 `instructors[]`) reads from here.

Backend: `GET /studio/overview` (Phase 3) is extended with `inbox` (change requests, unanswered questions once Phase 11 exists, announcements drafts), `recentActivity` (≤ 10, one UNION-free query per kind), and `series` (30-day enrollments by day from `Enrollment.created_at`, constant queries). Responses are private/no-store.

## 7.5 Course list (`/studio/courses`)

Cards ⇄ table toggle (persisted); URL state `?status=&q=&sort=&page=` so refresh/back works; card = thumbnail, title, status chip, Readiness ring, learners, last updated, kebab menu (تحرير · معاينة · نسخ · أرشفة · حذف); bulk select for archive; sort (الأحدث تعديلًا · الأكثر تسجيلًا · الأبجدي); empty state with CTA; permission-aware actions (hide «نشر» without `courses.publish`; show «إرسال للمراجعة» instead); `scope=all` toggle only for `courses.edit_any`. «إنشاء دورة» opens a 3-field modal (العنوان · التصنيف · المستوى) → `POST /studio/courses` → navigates to the editor on success.

Backend additions: `POST /studio/courses/<slug>/duplicate` (copies course/modules/lessons/resources/quizzes **without** videos by default; `?keepVideos=true` re-links the same assets — never copies provider files), `POST /studio/courses/bulk-archive`.

## 7.6 Frontend structure

```
src/features/studio/
├── README.md
├── studio.css                          imported once from globals.css (R14 rule: one stylesheet entry)
├── types.ts
├── context/{StudioProvider.tsx, studioContext.ts}     owns: workspace nav state, toast bus, unsaved-guard registry
├── data/{studioFetchers.ts, studioCopy.json, studioSections.json, statusMeta.json}
├── hooks/{useStudioNav.ts, useAutosave.ts, useUnsavedGuard.ts, useCountUp.ts}
├── components/
│   ├── layout/{StudioShell, StudioMain, StudioPageHead, StudioBottomBar}
│   ├── chrome/{StudioRail, StudioTopBar}               thin wrappers over shared/Workspace primitives
│   ├── cards/{StudioCourseCard, ReadinessRing, KpiTile, InboxItem, ActivityRow}
│   ├── controls/{StatusChip, SaveStateChip, SegmentedViewToggle}
│   ├── overlays/{CreateCourseModal, ConfirmDialog, Drawer}
│   ├── states/{StudioSkeleton, StudioEmpty, StudioForbidden, StudioError}
│   └── views/{HomeView, CoursesView, OnboardingChecklist}
└── pages/*.tsx                                         one per route
```

`studioSections.json` = `{key,label,icon,permission,route,mobile:boolean}`; `StudioRail` renders only sections where `can(user, permission)`; the order and grouping come from data (R7), not JSX. Data goes through `useCachedData`, **but Studio reads use short TTL + explicit invalidation on every write** (an instructor must never see stale drafts); the cache key includes the user id.

## 7.7 Tests

Vitest/Testing Library: `studioSections` gating matrix (custom role with only `videos.*` sees only Videos); route guard for every `/studio/*` path; workspace switch only appears with `studio.access`; course list URL-state round-trip; status-chip mapping; `ReadinessRing` arc math + gold at 100 %; `useCountUp` (fake rAF, reduced-motion short-circuit); create-course modal validation + navigation; onboarding steps derived from data; permission-aware actions; **dashboard parity** (shared-chrome extraction left the learner dashboard's DOM landmarks and tests intact). Backend: overview constant-query pin, duplicate (structure copied, videos not, slug unique), bulk archive permissions. Visual QA at 375/768/1280, light motion + reduced motion, RTL, keyboard-only.

## 7.8 Acceptance criteria

1. A student account cannot see or open anything under `/studio`; an instructor sees the switch and lands on a populated, animated Home.
2. The Studio nav changes live when an admin edits the instructor role in the Role Manager (after the next `/auth` refresh).
3. `/dashboard` is visually and behaviorally unchanged (parity artifacts attached).
4. Lighthouse perf on `/studio` ≥ the dashboard's recorded baseline − 3 points; Studio chunks absent from learner bundles (checked with the build's chunk report).

---

# PHASE 8 — Studio: course editor, curriculum builder, publishing

**Branch:** `Feature/StudioEditor`. **Needs:** Phases 3, 7 (and the minimal video picker below).
**Skills:** `fe-component-architecture`, `fe-forms-and-validation`, `design-ux-patterns-and-microcopy`, `design-ui-components`, `fe-accessibility`, `design-motion-implementation`, `fe-testing-and-visual-qa`.
**Goal:** create a complete course end-to-end without ever touching the admin console: write the pages, build the curriculum by drag-and-drop, attach videos or articles to lessons, preview as a student, pass the readiness checklist, and submit/publish.

## 8.1 Backend delta (small — the heavy lifting was Phase 3)

- Add `updated_at` (TimeStampedModel) to `Course`, `CourseModule`, `CourseLesson` (**additive**, default now) and honor `expectedUpdatedAt` on every Studio `PATCH` (`409 stale_write` with the current server copy so the UI can offer "use mine / use theirs" per field).
- `GET /studio/courses/<slug>` returns the whole editor graph in **constant queries** (course + staff + modules + lessons + resources + linked asset summaries + quizzes summary + checklist) — pin it.
- `POST /studio/lessons/<id>/duplicate`, `POST /studio/courses/<slug>/outcomes` (bulk replace JSON list, ≤ 12 items, ≤ 140 chars each), related-courses setter (≤ 6, published only, not self).
- Markdown fields (`about`, lesson `content`, quiz prompts): store raw; **never** store rendered HTML (D16). Server-side length caps (`about` 20 k chars, lesson 60 k).
- `GET /studio/courses/<slug>/preview-token` is **not** needed: staff entitlement (Phase 4 rule 3) lets the author open `/courses/<slug>` and `/courses/<slug>/learn` directly.

## 8.2 Editor layout

```
┌ ← دوراتي │ أساسيات بايثون  [مسودة]   ◌ 72%   ✓ تم الحفظ     [معاينة ↗] [إرسال للمراجعة] ┐
├ المعلومات · المنهج · الاختبارات · الجلسات · الفريق · النشر · الإعدادات ───────────────────┤
│ (tab content)                                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

The header (breadcrumb, title inline-editable, `StatusChip`, `ReadinessRing`, `SaveStateChip`, preview, primary action that changes with state and permission) stays mounted while tabs swap (**only the data section updates**, the repo's rule). Tabs are URL state (`?tab=`); the active lesson is `?lesson=<id>`.

### Tab: المعلومات (basics)
Title, tagline (≤ 240), about (Markdown editor), category (select from the **catalog taxonomy API**, not a hard-coded list), level, language, price type + price label, thumbnail (HTTPS URL field with **live preview + dimension/aspect warnings**; hosted uploads are backlog B3), outcomes (reorderable chip list, add on `Enter`), related courses (search-and-pick). Each field group autosaves independently.

### Tab: المنهج (curriculum builder) — the heart of the Studio
- **Tree** of modules → lessons. Add module/lesson inline (`Enter` to create the next sibling), rename in place (double-click / `F2`), delete with undo toast (soft-delete window of 8 s implemented client-side as a delayed request), collapse/expand, expand-all.
- **Reorder** modules and lessons by pointer drag, **and** by keyboard (`Alt+↑/↓`, `Alt+←/→` to move a lesson across modules), **and** by explicit «نقل إلى…» menu on touch devices; every move is announced via `aria-live`. Optimistic reorder → one `reorder` call with the **complete ordered list** (Phase 3 contract) → rollback + toast on failure.
- **Lesson drawer** (opens at the inline-end, deep-linkable): title; kind switch `فيديو | مقال | اختبار | ملف`; **Video panel** → picker modal (v1 list of own ready assets + «إضافة رابط» quick-link; full uploader arrives in Phase 9) showing status chip/mode/protection badges and a preview button; for `processing`/`staged` assets the lesson saves but the checklist flags it; **Article panel** → Markdown editor with preview; summary; free-preview switch (with a tooltip explaining visitors can watch it); published/hidden switch; resources list (title + HTTPS link); duration shown read-only (derived from the asset) with a manual fallback field when unknown.
- **Per-lesson health dots** in the tree: ● no content, ● video processing, ● ready — instructors see problems without opening anything.
- **Bulk actions:** select several lessons → publish/hide/delete/move.
- Dense but calm: module cards use `navy-900` glass, lessons are 44 px rows with a drag handle, kind icon (lucide `PlayCircle`, `FileText`, `ListChecks`, `Paperclip`), duration in Plex Mono.

### Tab: الاختبارات
Lists the course's quizzes (practice / per-lesson / exam) with status, question count, attempts, pass rate; «إنشاء اختبار» → Phase 10's builder. Until Phase 10 lands, this tab renders a polished "coming with the quiz builder" placeholder **behind a feature flag that Phase 10 removes**.

### Tab: الفريق
Add co-instructors/assistants by searching users who hold `studio.access` (server-filtered), set kind, remove; the owner is fixed; shows who can do what in plain Arabic derived from `OWN_KINDS`. Needs `courses.manage_staff`; hidden otherwise.

### Tab: النشر (the checklist)
The Readiness Astrolabe large, plus the issue list from `GET …/checklist`: **blocking** issues with a "اذهب إلى" link that deep-links to the offending field/lesson; **warnings** collapsible; a reviewer's `reviewNote` banner when changes were requested; the single primary action adapts: «نشر الآن» (has `courses.publish`) / «إرسال للمراجعة» (has `courses.submit_for_review`) / disabled with the reason. On success: the gold constellation moment and a share-ready link. «إلغاء النشر» explains the **archive-if-enrolled** policy before confirming.

### Tab: الإعدادات
Slug (editable until first publish, then locked with explanation), transfer ownership (administrators only), archive, delete (typed-title confirmation; blocked with an explanation when enrollments exist).

## 8.3 Autosave & conflict model (`useAutosave`)

Per field-group debounce 700 ms; one in-flight save per group, later edits coalesce; `SaveStateChip` shows idle/saving/saved/error; offline → queue + banner "لا يوجد اتصال — سنحفظ عند عودته"; navigation guard when unsaved; `409 stale_write` → inline diff dialog (per field: mine / theirs); **two tabs of the same user** are covered by the same mechanism (`updatedAt`). No silent overwrites, ever.

## 8.4 Markdown editor (shared component, lives in `shared/components/Editor/`)

Textarea-based (no heavy editor dependency, D17): toolbar (عنوان، غامق، مائل، رابط، قائمة، اقتباس، كود)، `Ctrl/⌘+B/I/K` shortcuts, split/preview toggle on mobile, `dir="auto"` per block, paste-as-plain-text for external HTML, character counter against the server cap. **Renderer:** a pinned markdown parser + DOMPurify with an explicit allow-list (no raw HTML, no `style`, links forced to `rel="noopener noreferrer nofollow"` and `target=_blank`, images only `https:`), used by **both** the editor preview and the learner-facing lesson/about views so what the instructor previews is exactly what the student gets. XSS corpus test (≥ 30 payloads: `<script>`, `onerror`, `javascript:` links, `data:` images, SVG vectors, nested/obfuscated tags, markdown-link tricks).

## 8.5 Learner-facing changes that ship with this phase

- Lesson panel renders `kind=article` lessons (sanitized Markdown), resources list, and for video lessons the Phase-5 player; `locked` and `free preview` states are accurate (preview lessons playable by visitors for published courses).
- Course landing curriculum shows lesson kind icons, preview badges, and durations from real data.
- **Preview-as-student** works on drafts for staff (the "معاينة — غير منشورة" banner from Phase 3), with a **"view as learner"** toggle that hides authoring affordances.

## 8.6 Tests

Vitest/RTL: curriculum tree (add/rename/delete-undo/reorder by keyboard, cross-module move, optimistic rollback on failure, announcements text), lesson drawer kind switching and validation, autosave (debounce, coalescing, offline queue, `409` dialog), checklist deep links (every issue code navigates to a real target), publish button state matrix (`courses.publish` ∈/∉ × status), slug lock, Markdown toolbar + shortcuts, **sanitizer XSS corpus**, picker states (ready/processing/staged/error). Backend: stale-write 409, editor payload query pin, outcomes/related validation, length caps, duplicate lesson, ownership matrix again through the HTTP layer. Playwright smoke (pre-installed): create → add module/lesson → link external video → checklist → submit → admin approves → course appears in catalog → student plays lesson; screenshots at 375/768/1280.

## 8.7 Acceptance criteria

1. A new instructor, using only the Studio, publishes (or submits) a complete course with an article lesson and a YouTube lesson in under ten minutes.
2. Reordering 30 lessons by keyboard alone is possible and announced.
3. Two browser tabs editing the same lesson never lose data silently.
4. Pasting `<img src=x onerror=alert(1)>` into any Markdown field cannot execute in the editor preview, the learner view, or the admin console.
5. All gates green; Studio editor chunk lazy-loaded.


---

# PHASE 9 — Studio: video library & resumable uploader

**Branch:** `Feature/StudioVideos`. **Needs:** Phases 4, 5, 7 (the Phase-8 picker is upgraded here).
**Skills:** `be-file-uploads-and-media-pipeline`, `design-ui-components`, `design-motion-implementation`, `design-mobile-first-and-touch`, `fe-accessibility`, `fe-testing-and-visual-qa`.
**Goal:** instructors manage every video they own in one place, upload large files reliably from a flaky connection, or attach a link from YouTube/Vimeo/any HTTPS URL, and always know *why* a video is or is not playable.

## 9.1 Library screen (`/studio/videos`)

Grid ⇄ list toggle; URL state `?status=&provider=&q=&sort=&page=`; each card: poster/placeholder, title, duration (Plex Mono), **status chip** (رفع · معالجة · جاهز · قيد التجهيز (staged) · خطأ), **provider badge**, **protection badge** (مشفّر / محمي / خارجي — the honest label from Phase 4), size, views, "مستخدم في N دروس". Filters by status/provider; `scope=all` only for `videos.manage_any`. Live progress for in-flight uploads (polled every 2 s while any asset is `uploading/processing`, paused when the tab is hidden, stops when none remain). Empty state with two big CTAs: «رفع ملف» / «إضافة رابط».

## 9.2 Add-video flow (drawer, 3 steps, keyboard accessible)

1. **المصدر** — tabs: `رفع ملف` | `رابط (يوتيوب / فيميو / مباشر)`.
2. **المزوّد والمعالجة** (file only) — provider radios from `GET /studio/video-providers`: each shows availability + the **reason when unavailable** ("تيليجرام يحتاج خادمًا دائمًا مع FFmpeg") and the **`effectivePlan` sentence** ("سيُشغَّل مباشرةً بدون تغليف" / "سيُغلَّف وتُشفَّر مقاطعه"). A "تغليف FFmpeg" switch is shown only when the caller holds `videos.package` **and** the plan allows both outcomes; otherwise it is hidden, not disabled-mysteriously.
3. **التفاصيل** — title, optional poster URL, captions (optional, add later too).

**Link tab:** one URL field, instant client-side parse using the **same rules as the server** (shared test vectors, §9.6) showing the detected provider + thumbnail guess (YouTube `i.ytimg.com` only), then `POST /studio/videos/link`; the server re-validates (client checks are UX, never trust).

## 9.3 Uploader engine (`features/studio/data/uploader/`, framework-free TS, fully unit-testable)

```
UploadQueue (max 2 concurrent files, 1 in-flight chunk per file)
 └ UploadJob { id, file, assetId, sessionId, offset, state, speed, etaSeconds, retries }
    states: queued → initializing → uploading → paused → completing → done | failed | cancelled
```

- **Init** `POST …/uploads` → `{sessionId, chunkSize, offset}`; slice with `File.slice(offset, offset+chunkSize)`; `PUT …/chunk` with `Content-Range`.
- **Resumability:** after a reload the queue is empty (browsers cannot keep `File` handles), but the library shows the asset as `uploading` with a **«متابعة الرفع»** button → the user re-selects the file → the job verifies `file.name`, `file.size` and the first-chunk hash against the session → continues from the server's `GET …/uploads/<id>` offset. Wrong file ⇒ clear error, nothing corrupted.
- **Reliability:** exponential backoff with jitter (500 ms → 30 s, max 8 tries) for network errors/`5xx`/`429` (honor `Retry-After`); `409 offset_mismatch` → adopt the server offset and continue (idempotent chunks, Phase 4); `4xx` other → fail fast with a mapped Arabic message; `navigator.onLine` events pause/resume automatically; `beforeunload` warns while jobs run.
- **UX data:** rolling-window speed (last 5 s), ETA, percent; pause/resume/cancel (cancel calls `DELETE …/uploads/<id>`).
- **Client duration:** read via a detached `<video preload="metadata">` + object URL (revoked afterwards), sent on `complete` as `durationSeconds` (server caps it at 12 h and treats it as display-only; the player reports its own duration for progress).
- **Pre-flight validation:** extension allow-list, size vs the server-provided `maxBytes`, remaining quota; friendly Arabic errors before a single byte moves.
- **Never** logs file names or tokens to the console in production builds.

## 9.4 Video detail drawer

Preview (reuses the Phase-5 player with the staff-entitlement path), metadata edit (title, poster URL), **captions manager** (upload `.vtt`, language picker from a small BCP-47 list, default-track radio, per-track delete, validation errors surfaced inline), **usage** (lessons/courses that use it, each a deep link), **replace source** (re-upload into the same asset: lesson links and slug survive), **delete** (blocked with the usage list when in use by a published course; otherwise typed confirm), diagnostics line for the admin-ish ("آخر خطأ: …") truncated for instructors.

## 9.5 Picker upgrade (used by the lesson drawer)

The Phase-8 list-only picker becomes the full `VideoPickerModal`: search, status filter (default: ready only), inline «رفع جديد» that opens the same drawer and **returns the new asset to the lesson** when ready, preview-before-select, and a "will this play?" hint per asset (`ready` ✓ / `processing` ⏳ / `staged` ⚠ explains why).

## 9.6 Tests

Unit: uploader state machine with a fake fetch (happy path, pause/resume, cancel, backoff schedule with fake timers, offset adoption on `409`, offline pause/resume, wrong-file resume rejection, `Retry-After` honoring, concurrency cap = 2, one chunk in flight per file); **shared URL-parse vectors** (`shared/lib/videoUrlVectors.json` consumed by both the Vitest suite and a backend test, so client and server can never drift); speed/ETA math; pre-flight validation. Component: drawer step gating, provider reason rendering, `effectivePlan` text, captions validation, delete-in-use guard, picker inline-upload return. A11y: drawer focus trap/return, progress `role="progressbar"` with values, live announcements ("اكتمل رفع الفيديو"). Playwright: upload a small generated MP4 to a fake provider (backend test settings with the fake Drive transport) and see it become `ready`; resume after a forced reload.

## 9.7 Acceptance criteria

1. A 500 MB upload survives killing the network for 60 s and a full page reload (with re-selecting the file) without re-sending confirmed chunks.
2. Every disabled provider explains itself; no path leads to a dead `staged` Telegram asset.
3. A YouTube link becomes a playable lesson in two clicks; a hostile URL is rejected client- and server-side with the same message.
4. All gates green.

---

# PHASE 10 — Studio: quiz builder, live sessions, announcements, students, analytics

**Branch:** `Feature/StudioTeaching`. **Needs:** Phases 6, 7 (and 8 for tab slots).
**Skills:** `design-dashboards-and-data-viz`, `fe-forms-and-validation`, `design-ux-patterns-and-microcopy`, `be-api-design`, `db-indexing-and-query-optimization`, `fe-accessibility`.
**Goal:** the instructor's day-to-day teaching tools: build assessments, run live sessions, talk to learners, see who is struggling, and read how each course performs.

## 10.1 Quiz builder (`/studio/quizzes`, `/studio/quizzes/:id`; also the course editor's *الاختبارات* tab — remove the Phase-8 feature flag)

- **List:** filter by course/kind/status; cards show question count, attempts, pass rate, average score, status; create from a course context or globally (course picker).
- **Editor:** left rail = question list (drag/keyboard reorder, duplicate, delete-undo, validity dot), right = question form: kind switch (اختيار واحد · متعدد · صح/خطأ), prompt (Markdown, shared editor), optional code block (LTR monospace), options list with **correct toggles** (radio-like for single, checkbox for multiple; true/false is fixed two options), points, explanation, hint, partial-credit switch for multiple. Live **student preview** pane renders exactly the learner component (shared presentational question card lives in `shared/components/Quiz/` so both features reuse it without importing each other).
- **Settings drawer:** time limit, pass threshold slider, attempts (unlimited/N), draw-count (bank size indicator), shuffle toggles, reveal policy select with a one-line explanation for each, unlock-progress %, lesson attachment (for lesson quizzes).
- **Import/export:** CSV template download → upload → **dry-run table with per-row errors** → commit; JSON export of a quiz for backup.
- **Question bank hints:** "٣٢ إجابة سابقة" warning chip when editing an answered question; publish validation panel mirrors `validate_quiz`.
- **Results tab:** score histogram, pass rate, per-question % correct with the most-chosen wrong option (reuses `quiz_stats`), attempts table (learner, score, time, date) with **CSV export** (injection-safe), per-learner "منح محاولة إضافية" dialog.

## 10.2 Live sessions manager (course editor tab *الجلسات* + a global calendar view)

**Backend (this phase):** `CourseLiveSession` gains `starts_at DateTime`, `duration_minutes`, `timezone`, `recording_url`, `recording_asset FK null`, `status` (`scheduled|live|ended|cancelled`); `date_label/time_label` become **derived** by a formatter in `courses/services.py` (Arabic date/time in the course/instructor timezone) so every existing consumer keeps working; `state` (`upcoming|live|past`) is computed from `starts_at`/`duration` at serialization time (the stored column remains for backward compatibility and is synced by a tiny `refresh_states()` called by `run_cleanup`). **Backfill (A3):** parse existing label strings only when they match the seeded patterns; otherwise leave `starts_at` null and mark the row "تاريخ غير محدد" for the instructor to fix — never guess.
- `meet_url` validation: `https:` only and host ∈ `LIVE_ALLOWED_HOSTS` (setting; default `meet.google.com, zoom.us, teams.microsoft.com, teams.live.com, whereby.com`); admins can widen the list. (Defends against phishing links in a learner-facing "join" button; the server never fetches the URL.)
- API: `/studio/courses/<slug>/live-sessions` CRUD (`live_sessions.manage_*`), `POST …/<id>/cancel`, `POST …/<id>/recording` (link a hosted asset or a URL). Cancel/reschedule emits notifications (Phase 11 hook).
- **UI:** list + month/week calendar toggle (own React, no calendar dependency), create/edit drawer (date/time pickers localized, timezone display, duration, link, notes), «انسخ الجلسة أسبوعيًا ×N» recurrence helper (creates N rows; no recurrence engine), upcoming sessions strip on Studio Home, status chips, post-session «أضف التسجيل» that turns the session into a replay lesson candidate.
- Learner side: the existing `LiveSessionPanel`/dashboard countdown read `startsAt` (ISO) and compute the countdown client-side with the server offset; "join" opens the validated link.

## 10.3 Announcements

`CourseAnnouncement(course, author, title, body Markdown, pinned, created_at, updated_at)`; Studio composer (course picker, preview, pin), learners see a pinned banner on the course landing/player and an *الإعلانات* list; creating one fans out notifications (Phase 11 hook, rate-limited to **3 per course per day** server-side so an instructor cannot spam enrolled learners). Permission `announcements.post` + staff-of-course. Sanitized Markdown (D16).

## 10.4 Students (`/studio/students`)

Course selector (default: all own) → roster with **progress %**, completed lessons, last active, quiz average, status chips (نشط · متعثّر = no activity ≥ 14 days · أنهى). **Privacy rule (decision):** instructors see name, avatar, progress — **email is masked** (`s***@gmail.com`) unless the viewer holds `students.view_any`; the server masks, the client never receives the full address otherwise. Student drill-down drawer: lesson-by-lesson progress, each quiz's attempts, notes; actions: **تنبيه/تشجيع** (a notification, ≤ 1 per student per course per 24 h, server-enforced), **منح محاولة إضافية**. Filters, search, sort, paging (server-side), **CSV export** (`students.view_*`, injection-safe, masked emails). Query pin: roster = constant queries via aggregate annotations over `Enrollment` + `LessonProgress` + `Attempt`.

## 10.5 Analytics (`/studio/analytics`, per-course tab too)

Backend `GET /studio/analytics/courses/<slug>?range=7|30|90` and `/studio/analytics/overview` (permission `analytics.view_own/any`): enrollments by day, active learners by day (distinct `LessonProgress.updated_at` users), **completion funnel** (% of enrolled who reached each lesson), **average watch %** per lesson, quiz score histogram + top missed questions, certificate count, rating distribution (Phase 11). Aggregates in SQL; if a query exceeds the budget on real data the trigger to pre-aggregate is recorded in §Backlog (B6) rather than built speculatively.

Frontend (`design-dashboards-and-data-viz`): own lightweight SVG charts matching `LoginSeriesChart`'s approach — line (enrollments), bars (funnel, histogram), a **lesson heat-strip** (cells coloured by watch %, tooltip + text alternative), KPI tiles with delta vs previous period; every chart has an accessible data table fallback (`<details>` "عرض البيانات"), colour is never the only signal, colour-blind-safe cyan/gold/slate ramp, empty/low-data states ("لا بيانات كافية بعد"), range selector as URL state, skeletons that match chart size (zero CLS).

## 10.6 Tests

Backend: quiz authoring/ownership via HTTP (matrix reuse); live-session formatter (Arabic strings for fixed datetimes/timezones), state derivation boundaries, host allow-list corpus, backfill idempotence/ambiguity, cancel notification hook called; announcement rate limit; roster masking (**assert no unmasked email in the JSON** for instructors), nudge rate limit, funnel/watch-% math on a fixture with known answers, query pins for roster/analytics. Frontend: question-form validation per kind, correct-toggle semantics, reorder by keyboard, CSV import dry-run table, reveal-policy copy, calendar navigation + RTL week start (Saturday), recurrence helper count, masked-email rendering, chart a11y fallbacks, empty states. Playwright: build a quiz, publish, take it as a student, see the stats update.

## 10.7 Acceptance criteria

1. An instructor builds, imports into, publishes and reviews a quiz without the admin console.
2. Live sessions have real timestamps; learner countdowns and reminders derive from them.
3. Instructors cannot obtain a learner's full email through any Studio endpoint or export.
4. Analytics render for a course with 0, 1 and 1 000 learners without layout shift or slow queries (pinned counts).
5. All gates green.

---

# PHASE 11 — The learning loop: progress, certificates, reviews, discussions, notifications

**Branch:** `Feature/LearningLoop`. **Needs:** Phases 4, 6 (and 10 for live-session hooks).
**Skills:** `be-architecture`, `be-background-jobs-and-queues`, `db-schema-design-and-migrations`, `be-testing`, `fe-component-architecture`.
**Goal:** what happens *after* a learner presses play — progress that is real, certificates that are issued and verifiable, honest ratings, a place to ask questions, and notifications generated by events instead of seeds. Fixes G12, G14, G15, G16, G17.

## 11.1 Server-derived course progress (G12)

`Enrollment.progress`, `last_lesson`, `is_completed` become **derived** from `LessonProgress` (+ completed required quizzes): `progress = round(100 × completed_published_lessons / published_lessons)`; `is_completed` when progress = 100 **and** the exam (if one is required) is passed. Computed by `courses/services.recompute_enrollment(user, course)` called (a) on lesson completion (not per heartbeat), (b) on quiz pass, (c) when the curriculum changes (a lightweight "stale" flag + recompute on next read, so adding a lesson never fans out N writes), (d) by `manage.py recompute_progress` (idempotent repair). The existing `POST /courses/<slug>/progress` stays for backward compatibility but **no longer trusts** the client's `progress` (it only records `lastLesson`); a parity test documents the new behavior.

## 11.2 Certificates (G16)

- Issuance on completion: `Certificate` gains `issued_at DateTime`, `serial` (unique, short, human-readable `KH-2026-XXXXXX` from a CSPRNG, **not** guessable/sequential), `revoked_at`, `revoked_reason`, `learner_name_snapshot`, `course_title_snapshot`, `hours` (from course duration). `issue_date` (string) stays for old rows and is generated from `issued_at`. Idempotent (`unique(user, course)` already exists).
- **Public verification:** `GET /api/certificates/verify/<serial>` (no auth, throttled `cert_verify 30/min`) returns only `{valid, learnerName, courseTitle, issuedAt, revoked}` — **no email, no ids**. SPA route `/verify/:serial` (public, `skeletonVariant: "detail"`) with a clear valid/revoked/not-found state.
- Certificate view: print-friendly CSS (`@media print`, A4 landscape), "طباعة / حفظ PDF" via the browser (no server PDF engine — backlog B4), QR code to the verify URL (small pure-TS QR generator vendored as a utility — no dependency, unit-tested against known vectors), copy-link and LinkedIn "add to profile" deep link.
- Admin/instructor: revoke with a reason (`certificates.manage`, audited); the dashboard shows revoked certificates greyed with the reason.

## 11.3 Reviews & ratings (G17)

`CourseReview(user, course, rating 1–5, title, body, created_at, updated_at, is_hidden, hidden_reason)`, `unique(user, course)`; eligibility = enrolled **and** progress ≥ 20 % (configurable `REVIEW_MIN_PROGRESS`); one edit-able review per learner; `Course.rating`/`review_count` become **cached aggregates** recomputed in the write transaction (`F()`/aggregate), keeping the catalog payload shape; `cache_invalidation` already bumps `catalog` on `Course` writes. Instructors may post **one public reply** per review, gated by `reviews.reply_own` (owner/co-instructor staff kinds, see `OWN_KINDS`). Moderation: `reviews.moderate` hides with a reason (never deletes). UI: rating summary + distribution on the landing page, review list (paged, newest/highest/lowest), «قيّم الدورة» dialog, Studio inbox for new reviews.

## 11.4 Discussions (lesson Q&A)

`Thread(course, lesson null, author, title, body Markdown, status open|answered|hidden, pinned)`, `Post(thread, author, body, is_instructor_answer, created_at)`; learners (`discussions.post`) ask under a lesson; staff with `discussions.reply_own` (via `OWN_KINDS`) answer and **mark the accepted answer**; `discussions.moderate` hides/pins across courses. Rate limit 10 posts/hour/user, Markdown sanitized (D16), no attachments (backlog), no email exposure, soft-hide only. UI: *النقاش* tab in the course player (lesson-scoped, "اسأل سؤالًا" composer, answered badge, instructor badge, jump-to-timestamp links — `?t=` support in the player), Studio inbox shows unanswered threads sorted by age with a one-tap reply drawer.

## 11.5 Notifications (G15)

One service, `dashboard/notifications.py::notify(user_ids, kind, payload, dedupe_key)`, the only writer of `DashboardNotification`/`NotificationItemData` (the two existing tables are kept; both rows are written transactionally — **investigate in this phase whether they can be unified behind one model**, record the decision, but do not force a destructive migration). `time_ago` strings stop being stored: serializers compute relative Arabic time from `created_at` (`Intl.RelativeTimeFormat` on the client; a formatter on the server for payload compatibility). Event sources wired: enrollment confirmation, lesson/quiz milestones, exam pass/fail, certificate issued/revoked, announcement posted, live session scheduled/rescheduled/cancelled and **15-minute reminder**, course published/changes requested (to the instructor), new review/new question (to staff), role changed (to the user). Respect `StudentProfile.notifications` preferences (`liveSessionReminders`, `weeklyProgressSummary`, `recommendedOpportunities`) — **the preference keys already exist; they must finally mean something**. Deduplicated by `dedupe_key`; bulk-created with `bulk_create`; a `unread-count` endpoint is cached per user for 15 s at most (never longer: Vercel locmem is per-instance). 

**Reminders without a queue (A5):** `manage.py send_reminders` (idempotent; selects sessions starting in the next 15–20 min lacking a reminder marker) wired to the existing cron surface: extend `POST /api/admin/maintenance/cleanup`'s job runner (or add a sibling `reminders` job with the same overlap guard and cron-secret auth) and `vercel.json` cron. **Hobby plan allows one daily cron (documented in PROJECT_PROFILE §7)** — so on Hobby, 15-minute reminders are *not deliverable*; the plan therefore also ships a **client-side "starting soon" banner** driven by `startsAt` (works everywhere) and documents the cron cadence requirement for real reminders. Email delivery is out of scope (B2) — the notification service has a single `channels` seam where an email sender plugs in later.

## 11.6 Dates cleanup (rest of G14)

`UpcomingEvent`, `Enrollment.next_live_time`, `Certificate.issue_date`, `DashboardNotification.time_ago`: add real datetime columns where missing, derive the display strings in serializers, backfill only from unambiguous seeded strings (else null + display "—"), keep every payload key and shape.

## 11.7 Tests

Progress derivation (lesson add/remove/hide, partial credit of required exam, idempotent recompute, repair command, stale-flag path); client-supplied `progress` ignored; certificate issuance idempotency + serial entropy/format + verify endpoint privacy (assert JSON keys) + revoke flow + print CSS smoke + QR vectors; review eligibility, one-per-user, aggregate math (add/edit/hide), catalog cache bump; discussions permissions matrix (student/staff/moderator/other instructor), accepted-answer rules, rate limit, XSS corpus, hidden threads invisible to learners; notifications: every event source emits exactly one deduped notification, preference gating, bulk creation query pin (N recipients ⇒ constant queries), reminders selection window + idempotence; relative-time formatter in Arabic; parity of existing dashboard payload keys.

## 11.8 Acceptance criteria

1. Watching and finishing lessons moves the dashboard progress with no client-asserted numbers; completing the final exam issues a certificate with a serial that verifies publicly.
2. A learner can ask a question under a lesson; the instructor sees it in the Studio inbox and answers; the learner gets a notification.
3. Ratings on the catalog cards are computed from real reviews.
4. Notifications appear from real events and honor preferences; the "starting soon" banner works on a Hobby deployment.
5. All gates green; every pre-existing dashboard/catalog payload key unchanged.


---

# PHASE 12 — Admin console upgrades & legacy retirement

**Branch:** `Feature/AdminUpgrade`. **Needs:** Phases 2, 3, 4.
**Skills:** `design-dashboards-and-data-viz`, `be-api-design`, `fe-component-architecture`, `design-ux-patterns-and-microcopy`.
**Goal:** make the admin console the platform's control room (moderation, effective-permission insight, editors for content the console cannot touch today) and retire the compatibility bridges created in Phases 1–6.

## 12.1 New / upgraded admin sections

| Section | Permission | Contents |
| :--- | :--- | :--- |
| **مراجعة الدورات** | `courses.review` | Review queue (Phase 3 API): oldest-first list, side-by-side preview link, checklist summary, **Approve** / **Request changes** (note required, ≥ 10 chars) / **Reject-to-draft**; shows who submitted and when; SLA chip when waiting > 48 h. |
| **المستخدمون** (upgraded) | `users.view` | `RoleChips` multi-role editing; **Effective permissions inspector** in the user drawer: a searchable list of every permission the user holds with *"granted by: مدرّب رئيسي"* (or "implied by `courses.edit_any`", or "administrator") — the debugging tool for "why can/can't she do X?"; role-assignment history (from `AuditEvent`); bulk assign/remove role on selected users (batch endpoint, per-id outcomes). |
| **الأدوار** | `roles.view` | Phase 2. Add an *"Audit this role"* shortcut and a **Compare roles** view (two roles side-by-side, differences highlighted). |
| **المحتوى** (extended) | per type | Extend `CONTENT_TYPES` with: home rails (`HomeFeaturedCourse/Scholarship`, `HomeCompetitionSpot`, `HomeEventSpot`, `HomeQuickLink` → `home.curate`) and catalog taxonomy (`Category`, `FilterGroup`, `FilterOption` → `catalog.manage`). **Verify each model's real fields before writing the registry rows (?)** — the registry is the single source for these forms (rule: serializers/registry own shapes). `user_ref` field kind from Phase 2 used for `Course.owner`. |
| **الفيديو** (upgraded) | `videos.configure` / `videos.manage_any` | Paged all-assets table with owner, size, lessons-using, orphan detector (assets with no lesson older than 30 days → "مرشّح للحذف"), provider **packaging policy** select (Phase 4), host-capabilities card (serverless? FFmpeg? persistent host?), quota usage per instructor (top 10), failed-ingest list with **retry** (re-drives `package_pending` for one asset). |
| **الشهادات والتقييمات** | `certificates.manage`, `reviews.moderate` | Search by serial/learner, revoke with reason, hidden-reviews log. |
| **المنح (طلبات التقديم)** | `scholarships.manage` | Read-only inbox of `ScholarshipApplication` rows with filters and CSV export (**verify the model's fields first (?)**; do not invent a status workflow the model does not have — if one is wanted, record it as a follow-up). |
| **سجل التدقيق** | `audit.view` | Phase 2 view + export (CSV, injection-safe). |
| **النظام** | `system.maintenance` | Last `MaintenanceRun`s, run-now buttons (cleanup, expire attempts, package pending, send reminders, recompute progress), build/version info, `/readyz` snapshot. |

## 12.2 Retire the bridges (each with its own commit and a deprecation note in the result file)

| Bridge | Removal |
| :--- | :--- |
| `PATCH /admin/users/<id>/role` and the single-select `RoleSelect` | Remove endpoint + component + tests after confirming nothing calls it (grep both sides). Frontend `adminFetchers` contract test updated. |
| `User.role` as an input | Stays as the derived "primary account type" in payloads for one more release; the **Django admin field remains read-only**. Record the future removal as backlog B9. |
| `|| user.isAdmin` UI fallback from Phase 1 | Removed; the UI reads `permissions` only. `isAdmin` remains in the payload (additive-only rule) but is unused. |
| `IsAdminRole` | Kept only on the two routes that intentionally mean "administrator" (none expected — grep and justify each remaining use in the result note); otherwise deleted. |
| Legacy practice endpoints (`/problems`, `/courses/<slug>/problems` shared set) | Keep serving only while any course lacks a practice quiz **and** the answer-stripping behavior is on; add the deprecation header (`Deprecation: true`) and a log metric; delete in a later release (record in backlog). |
| `courses.exam_*` display fields | Retained as fallback display only; documented. |

## 12.3 Tests & acceptance

Permission-inspector correctness (matrix incl. implied and administrator cases), bulk role assignment outcomes, review-queue state transitions via the UI, registry-driven forms for the new content types (create/edit/delete + validation), orphan detector math, retry button re-drives only the chosen asset, removal of legacy routes proven by `404`/route-manifest test, **grep gate** in CI: `rg "isAdmin"` in `frontend/src` must return only types/tests (script in `frontend.yml`).
**Acceptance:** an admin can explain any user's access in two clicks; every admin screen is gated by exactly one named permission; no code path still depends on the legacy single-role editor.

---

# PHASE 13 — Hardening: security, performance, accessibility, observability, data lifecycle

**Branch:** `Chore/Hardening`. **Needs:** all feature phases.
**Skills:** `be-auth-and-security`, `perf-backend-speed`, `perf-frontend-web-vitals`, `fe-accessibility`, `be-observability-and-logging`, `core-verification-and-quality-gates`, `ops-deployment-and-ci`.
**Goal:** prove — with tests and measurements, not assertions — that the new surface is safe, fast, accessible and operable.

## 13.1 Security

| # | Task |
| :--- | :--- |
| 13.1.1 | **Route-permission manifest test (new).** Today the repo has only per-feature `test_routes_resolve` checks and the OpenAPI generation gate (unique `operationId`s) — **nothing classifies routes by who may call them** [verified]. Add `config/route_access.py` (one table: URL name → `public` \| `authenticated` \| `<permission key>`) and a test that walks `get_resolver()` and fails when any `/api/` route is missing from the table, or when the table names a permission that is not in the catalog. A new route without a classification **fails CI**. This is the structural fix for "someone forgot the permission". |
| 13.1.2 | **Denial matrix.** Generated test: for every permissioned endpoint, call it as anonymous / student / a role lacking only that permission / a role having it ⇒ `401/403/403/2xx-or-validation`. (Table-driven from the manifest, not hand-written per route.) |
| 13.1.3 | **IDOR sweep.** For every endpoint taking an id (`attempts`, `uploads`, `lessons`, `quizzes`, `threads`, `videos`, `reviews`, `certificates`) assert instructor A cannot touch instructor B's object and learner A cannot touch learner B's attempt/progress/notification. |
| 13.1.4 | **Frontend security headers** in `frontend/vercel.json` (currently only COOP): `Content-Security-Policy` (script-src `'self'` + `https://www.youtube.com` + `https://s.ytimg.com`; frame-src `https://www.youtube-nocookie.com https://player.vimeo.com`; media-src `'self' https: blob:`; connect-src the API origin + Firebase/Google identity hosts **(?) enumerate the exact Firebase hosts by reading `firebaseClient.ts` and testing the login flow; ship as `Content-Security-Policy-Report-Only` first, enforce in a later release**), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off; `fullscreen` and `picture-in-picture` self), `Cross-Origin-Opener-Policy` kept. |
| 13.1.5 | **Token-in-URL hygiene (G20).** Confirm the request logger records `request.path` only (verified for the app logger) and add a test with a sentinel token asserting it never appears in captured log output; document gunicorn/Vercel access-log exposure and the mitigation (short TTL for raw grants: add `VIDEO_RAW_GRANT_TTL_MINUTES`, default 120, shorter than HLS). |
| 13.1.6 | **Upload abuse:** chunk endpoint rate/size limits, content-length vs `Content-Range` consistency, parallel-session cap per user (`VIDEO_MAX_OPEN_UPLOADS`, default 3), spool-dir quota and stale-part cleanup. |
| 13.1.7 | **Sanitization corpus** shared by server (length/shape validation) and client (DOMPurify) — one JSON file of payloads consumed by both test suites. |
| 13.1.8 | **Dependency & secret hygiene:** `pip-audit` (already in CI), add `npm audit --omit=dev --audit-level=high` to `frontend.yml` (allow-list with expiry for unavoidable advisories), gitleaks already covers history; verify no provider credential is reachable from any serializer by a test that serializes every video/provider payload and greps for known secret field names (`refresh_token`, `access_token`, `upload_uri`, `aes_key_hex`, `bot_token`). |
| 13.1.9 | **Self-service privacy:** `GET /api/profile/export` (JSON of the caller's own data) and `DELETE /api/profile` (account deletion with confirmation, revokes sessions, anonymizes authored public content — reviews/threads keep text but drop identity; blocked for the last administrator and for course owners until ownership is transferred). Audited. |

## 13.2 Performance budgets (measure, record in `plan/phase-13-result.md`, fail CI where cheap)

- **Backend:** all `assertNumQueries` pins listed in one place (`plan/query-pins.md` generated by a script that greps the tests); p95 latency script (reuse the repo's parity/curl tooling or a 30-line Python `urllib` loop) for: catalog, course detail, playback grant, quiz start, studio course list, roster — **targets:** public GETs warm < 50 ms server time, authenticated reads < 150 ms, writes < 250 ms on SQLite dev with the seed (record real numbers; the target is a regression tripwire, not a promise).
- **Frontend:** build chunk report committed per phase; **budgets:** main (shell) bundle unchanged ± 3 KB gzip vs Phase 0; Studio route chunks each < 90 KB gzip; player engines lazy (`hls.js`, YouTube script, `@vimeo/player` never in the initial path); LCP/INP/CLS on `/`, `/courses/:slug`, `/studio` recorded with a headless Chromium (Playwright is installed) in throttled mode. A `size-limit`-style check can be a 20-line script reading `dist/assets` — no new dependency required.
- Image/thumbnail `loading="lazy"` + width/height to avoid CLS in the Studio grids; list virtualization **not** added unless a screen exceeds 200 rows in practice (record the trigger).

## 13.3 Accessibility & i18n audit

`@axe-core/playwright` (dev-only) over: login, catalog, course landing, player, dashboard, Studio home/editor/videos/quizzes/students/analytics, Role Manager, admin review queue — zero serious/critical violations; manual keyboard-only pass for the five riskiest components (curriculum tree, role list reorder, seek slider, quiz taker, uploader drawer) with the transcript in the result note; RTL screenshots at 375/768/1280; every new string lives in a copy JSON/dictionary (grep gate for Arabic literals in `.tsx` under the new features); `lang="ar"` + `dir="rtl"` verified; numerals consistent (Arabic-Indic vs Latin) per `localization.ts` policy **(?) read it and follow it; do not mix)**.

## 13.4 Observability & operability

Structured log lines for: role changes, permission denials (counted, not per-line spam), video grant mint (asset id, mode, **never** the token), upload session transitions, raw-proxy 503s, attempt grading durations, cleanup/reminder/progress jobs; request ids propagated into API error bodies so the SPA can show "رمز الخطأ: …" for support; frontend `RouteErrorBoundary` shown per Studio route with a retry and the request id; `/readyz` additionally checks the spool dir (when Telegram enabled) and the default role row existence (**a missing `student`/`admin` role is a boot-blocking misconfiguration**); `docs/` runbook: "a video won't play" decision tree (entitlement → status → mode → provider health → token expiry), "an upload is stuck", "a user lost access".

## 13.5 Data lifecycle (extend `run_cleanup`, same overlap guard)

Expired `StreamToken`s (exists), stale `UploadSession`s (> 24 h) + spool parts, abandoned attempts (grade-and-close), audit retention (`AUDIT_RETENTION_DAYS`), orphaned `DriveAuthState`, hidden-content retention. Each family reports a count in the `MaintenanceRun` result like the existing ones.

## 13.6 Acceptance criteria

1. Adding an unclassified API route makes CI fail; the denial matrix and IDOR sweep are green.
2. Budgets recorded; no budget exceeded without a written justification.
3. axe: zero serious/critical; keyboard transcript attached.
4. CSP ships in report-only with a recorded list of observed violations (or none); no console CSP noise on the golden path.
5. All gates green.

---

# PHASE 14 — Seed data, documentation, end-to-end smoke, release

**Branch:** `Chore/Release` → merge `Feature/AccessStudio` into `main`, tag `access-studio-v1`.
**Skills:** `core-verification-and-quality-gates`, `core-project-profile`, `ops-deployment-and-ci`.

| # | Task |
| :--- | :--- |
| P14.1 | **`seed_demo` extension** (stays idempotent, single transaction): system roles + the 6 templates materialised as roles in a **demo** run only; demo accounts (`admin@…`, `instructor@…`, `assistant@…`, `student@…` — dev-token auth, **never** created outside `DEBUG`/`--demo`); one published demo course with modules, an **article** lesson, an **external-URL video** lesson (use a freely licensed sample; **verify the URL resolves and the licence before committing it (?)** — otherwise seed the lesson without a video and document how to attach one), a practice quiz and an exam, a review, a certificate; a draft and an in-review course to populate the Studio and the review queue. |
| P14.2 | **Docs.** Update `README.md` (feature table + routes: `/studio/*`, `/verify/:serial`), `docs/00-overview.md`, `docs/03-routing-and-navigation.md`, `docs/05-feature-directory.md`, `docs/07-backend-contract.md` (every new endpoint), `docs/08-backend-architecture.md`; **new** `docs/09-access-control.md` (catalog, hierarchy, how to add a permission in 3 steps, how the UI consumes it), `docs/10-studio.md` (design language, motion spec, editor architecture, autosave model), `docs/11-video-platform.md` (the provider × FFmpeg matrix, plan resolver, entitlement, upload protocol, player engines, runbook). Every new feature folder has its README per the folder contract. Fix the `videohosting` README's "never proxies a byte" claim (Phase 4). `PROJECT_PROFILE.md`: new commands, env vars, pitfalls (Origin header still applies), counts. `REPORT.md`: add "Part 0 — Access & Studio" with the gate table, parity results and open items in the same style as the existing report. |
| P14.3 | **Skill update.** Add a short "permissions" section to the repo's `be-auth-and-security` skill (and the frontend routing skill) stating the new rule: *new endpoints must be classified in the route manifest; UI reads `can()`, never role names.* (The skills library is generic and project-agnostic — keep the project-specific facts in `PROJECT_PROFILE.md`, per `.agents/skills/README.md`.) |
| P14.4 | **End-to-end smoke (Playwright script `e2e/smoke.mjs`, run locally and in CI against dev-token auth + fake provider):** admin creates role from template → assigns to a user → that user sees Studio → creates course → adds article + external-video lesson → quiz → submits for review → admin approves → student finds it in catalog → enrolls → watches (progress heartbeat) → takes the quiz → passes the exam → certificate issued → public verify page shows valid → instructor sees the student in the roster and the analytics tick → admin revokes the certificate → verify shows revoked. Screenshots saved as artifacts. |
| P14.5 | **Release checklist** (`plan/release-checklist.md`): migration order and idempotency notes (access seed migration; backfills), **environment variables added** (Appendix B) with safe defaults, Vercel notes (4 MiB chunks, cron cadence on Hobby, `DATABASE_URL` required for any write persistence — the REPORT's standing warning — plus *the same applies to uploads and roles: without Postgres on Vercel nothing persists*), rollback plan per phase (all schema additive → redeploy previous tag; roles tables remain unused), first-boot steps for production (create first administrator with `createsuperuser` → bootstrap roles → connect Drive → enable providers → create the first instructor role from the template), and the **human-only actions** list (Appendix D). |
| P14.6 | **Final verification:** every gate in §0.4 on a **fresh clone**; Phase-0 parity snapshots diffed (only documented additive changes remain); all `plan/phase-*-result.md` present; merge, tag, write the release note. |

**Acceptance:** fresh clone → following only `PROJECT_PROFILE.md` + `docs/11-…` brings up a platform where the smoke journey passes; every document in this plan's "Docs" list exists and matches the code (spot-check ≥ 20 facts against code and record them, as the alignment plan's Phase 11 did).
---
# BACKLOG — deliberately out of scope (each with the trigger that promotes it)

| ID | Item | Why not now | Trigger |
| :--- | :--- | :--- | :--- |
| B1 | **Payments & paid enrollment** | Needs provider choice, currency/tax, refunds, legal. Entitlement rule 5 is the single extension point. | First paid course goes live. |
| B2 | **Email delivery** (reminders, digests, receipts) | Needs a provider and deliverability work; notifications already have a `channels` seam. | Product needs off-platform reminders. |
| B3 | **Hosted images/files** (thumbnails, avatars, lesson attachments) | No object storage exists; URL fields are used. | Instructors need uploads, not links. |
| B4 | **Server-side PDF certificates** | Browser print is sufficient for v1. | Employers need signed PDFs. |
| B5 | **DRM (Widevine/FairPlay) / forensic watermarking** | AES-128 + IP-bound tokens + visible watermark is the current posture; Drive/embeds carry no DRM — the UI says so (`protection`). | Contractual DRM requirement. |
| B6 | **Analytics pre-aggregation** | Premature at current volumes. | Any analytics query > 250 ms on real data. |
| B7 | **Full-text/Arabic search upgrade** (`pg_trgm`) | Catalog scale. | Catalog > ~2k rows (existing trigger). |
| B8 | **PWA / offline lessons** | Needs DRM and storage decisions. | Mobile-first growth. |
| B9 | **Remove legacy `User.role`; English UI** | Compatibility window; i18n is a product decision. | One release after Phase 12. |
| B10 | **MFA / SSO for staff** | Accounts are Firebase-issued; policy decision (existing ledger). | Security policy change. |
| B11 | **Redis (throttles/cache shared across instances)** | Existing ledger. | Multi-instance production. |
| B12 | **Built-in live streaming / recording** | Live sessions are launchpads to Meet/Zoom by design. | Product decision. |
| B13 | **Drive HLS / Telegram raw** | Spikes S-1/S-2 (Phase 4). | Spike results positive. |
| B14 | **Attachments in discussions, mentions, reactions** | Needs B3 + moderation tooling. | Community engagement data. |
| B15 | **Drip content / cohorts / prerequisites / learning paths** | Product design needed. | Instructor demand. |

---

# APPENDICES

## Appendix A — Operating rules for the executing agent

1. **One phase at a time, in order.** Phases 5/6 may run in parallel after 4/3 respectively; nothing else.
2. **Read before you write.** Each phase names files to read; the **(?)** markers are mandatory verification points — resolve them by reading code, and write the answer into the phase result note.
3. **Never expand scope silently.** If you discover a missing piece, add it to the result note under "Discovered", and either (a) do it if it is < 1 hour and inside the phase's goal, or (b) append it to the backlog with a trigger.
4. **Contract changes are additive.** If a payload must change shape, stop and write the decision into the result file first; the repo's history (Phase 8 of the alignment plan) shows the cost of un-coordinated shape changes.
5. **Tests are part of the task**, written alongside, pinned query counts included.
6. **Prefer the existing pattern** over a clever new one: dispatch tables, thin views, serializers at the boundary, `useCachedData`, concept classes, tokens.
7. **No new dependencies** except those named (DOMPurify, a pinned markdown parser, `@vimeo/player` lazily, `@axe-core/playwright` dev-only). Anything else needs a justification in the result note.
8. **Never commit** secrets, `db.sqlite3`, `.env.production` backend files, or uploaded media. Never log tokens.
9. **Stop and ask the human** (do not guess) for the items in Appendix D, and whenever a gate cannot be made green without weakening a test.
10. **Record deviations** in `plan/phase-<n>-result.md` — what, why, and what to review.

## Appendix B — New environment variables (all read **only** in `config/settings.py`; placeholders go in `backend/.env.development`; real values in the host environment)

| Variable | Default | Phase | Purpose |
| :--- | :--- | :--- | :--- |
| `VIDEO_UPLOAD_MAX_BYTES` | `2147483648` | 4 | Max single upload (replaces the hard-coded constant). |
| `VIDEO_UPLOAD_CHUNK_BYTES` | `4194304` | 4 | Chunk size; must be a multiple of 262144 and < 4.5 MB on Vercel. |
| `VIDEO_USER_QUOTA_BYTES` | `21474836480` | 4 | Per-instructor storage quota. |
| `VIDEO_SPOOL_DIR` | `""` | 4 | Persistent spool for Telegram uploads (empty = provider unavailable). |
| `VIDEO_RAW_RANGE_CAP_BYTES` | `8388608` | 4 | Raw-proxy window. |
| `VIDEO_RAW_MAX_CONCURRENT` | `4` | 4 | Raw-proxy concurrency cap. |
| `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | `30` | 4 | Free-preview grant lifetime. |
| `VIDEO_RAW_GRANT_TTL_MINUTES` | `120` | 13 | Raw grant lifetime (token rides in the URL). |
| `VIDEO_MAX_OPEN_UPLOADS` | `3` | 13 | Open upload sessions per user. |
| `VIDEO_EMBED_ALLOWED_HOSTS` | `youtube-nocookie.com,vimeo.com` | 4 | Embed allow-list. |
| `LIVE_ALLOWED_HOSTS` | `meet.google.com,zoom.us,teams.microsoft.com,teams.live.com,whereby.com` | 10 | Live-session link allow-list. |
| `REVIEW_MIN_PROGRESS` | `20` | 11 | Percent needed before reviewing. |
| `AUDIT_RETENTION_DAYS` | `365` | 2 | Audit log retention. |
| *(new throttle scopes in `SCOPED_RATES`)* | `studio_write 120/min`, `video_progress 30/min`, `quiz_check 120/min`, `quiz_save 60/min`, `cert_verify 30/min` | 3–11 | Abuse limits. |

## Appendix C — Risk register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| Permission regression locks admins out | M | H | Legacy `is_admin` bridge in `effective_permissions` until Phase 12; last-administrator guard; seed migration idempotent; `createsuperuser` always yields an administrator assignment. |
| Cached catalog leaks drafts | M | H | Single `published()` manager used by every public reader; publish/unpublish cache-bump tests; parity snapshots. |
| Entitlement bug blocks paying/enrolled learners | M | H | Rule table with exhaustive matrix test; `lessons.watch` is in the default role; a support runbook ("a video won't play") and the permission inspector. |
| Raw proxy overloads serverless | M | M | Range cap, concurrency semaphore with `503 Retry-After`, honest docs; HLS remains the scalable path. |
| Large uploads unreliable on Vercel | H | M | 4 MiB chunking, idempotent offsets, spike S-3, graceful provider-unavailable reasons. |
| Drive refresh token expiry (OAuth app in Testing) | M | M | Existing `DriveGrant` revoked-state + diagnostics; release checklist item to publish the consent screen. |
| Markdown XSS | M | H | Sanitizer allow-list, shared corpus on both sides, CSP report-only → enforce. |
| Scope creep from "good animations" | M | M | Motion budget table (§7.3), `transform/opacity` only, reduced-motion required, no animation library. |
| SQLite write contention (progress heartbeats, autosaves) | M | M | Heartbeat every 15 s, coalesced client-side, `watchedDelta` clamping; WAL + busy_timeout already configured; Postgres on production. |
| Vercel Hobby cron cadence (daily) breaks reminders | H | L | Client-side "starting soon" banner; documented cadence requirement. |
| Frontend `features → features` imports creep in | M | M | Shared chrome extraction in Phase 7, `shared/` for quiz card/editor, ESLint `no-restricted-imports` rule added in Phase 0 for `@/features/*` from another feature, with the two documented exceptions (Phase 0, task P0.7). |

## Appendix D — Human-only actions (the agent must stop and ask / hand over)

1. Add the new `frontend.yml` check to **branch protection** for `main`.
2. Create/rotate **Google OAuth client** credentials, publish the consent screen "In production", authorize the Drive account in the console (existing flow).
3. Create the **Telegram** bots/channel and provide `TELEGRAM_*` values; provision a **persistent host with FFmpeg** (and `VIDEO_SPOOL_DIR`) if Telegram HLS is wanted.
4. Provide a **Postgres `DATABASE_URL`** for Vercel (without it, roles, uploads and every write fail to persist there).
5. Decide the answers to Appendix E.
6. Confirm the licence/URL of any demo video; approve the CSP move from report-only to enforced.
7. Real Google/Telegram **spike runs** (S-1…S-3) that need live accounts.

## Appendix E — Open questions for the product owner (defaults already chosen so work is never blocked)

| # | Question | Default used |
| :--- | :--- | :--- |
| E1 | Should new instructors publish directly or go through review? | Review required (`courses.submit_for_review` only); the senior template can publish. |
| E2 | Can instructors see learners' email? | No — masked; only `students.view_any`. |
| E3 | Free previews: how many lessons? | Instructor's choice per lesson; checklist warns when none. |
| E4 | Review eligibility threshold | ≥ 20 % progress. |
| E5 | Exam unlock threshold | 80 % progress (editable per exam). |
| E6 | Certificate numbering/branding | `KH-<year>-<6 random>`; Observatory design, gold seal. |
| E7 | Telegram when FFmpeg is unavailable | Refused with a reason (no raw path) until spike S-1 says otherwise. |
| E8 | Account deletion policy | Self-service, anonymizes public content, blocked for last admin/course owners. |

## Appendix F — Definition of Done (every phase)

- [ ] Branch merged into `Feature/AccessStudio` via PR; commit style followed.
- [ ] All §0.4 gates green; test counts recorded; `spectacular` zero warnings.
- [ ] New/changed endpoints documented in `docs/07-backend-contract.md` and have `@extend_schema`.
- [ ] Every new permissioned route classified in the route manifest.
- [ ] Query-count pins added for every new list/detail endpoint.
- [ ] Public payload parity vs Phase-0 snapshots: additive-only, diff attached.
- [ ] Frontend: skeleton states, empty/error states, RTL, keyboard, reduced-motion verified; screenshots at 375/768/1280 in the result note.
- [ ] Copy lives in JSON/dictionaries; no raw hex; no cross-feature imports.
- [ ] `plan/phase-<n>-result.md` written (changes, gates, deviations, discovered items, **(?) resolutions**).
- [ ] Feature README(s) updated.

## Appendix G — Endpoint index by phase (new surface at a glance)

| Phase | Prefix | Count (approx.) |
| :--- | :--- | :---: |
| 2 | `/api/admin/roles*`, `/api/admin/users/<id>/roles`, `/api/admin/audit` | 12 |
| 3 | `/api/studio/courses*`, `/api/studio/modules*`, `/api/studio/lessons*`, `/api/admin/review-queue*` | 25 |
| 4 | `/api/courses/<slug>/lessons/<id>/{playback,progress}`, `/api/stream/<t>/captions/<l>.vtt`, `/api/studio/videos*`, `/api/studio/uploads*`, `/api/studio/video-providers` | 17 |
| 6 | `/api/courses/<slug>/quizzes`, `/api/quizzes/*`, `/api/attempts/*`, `/api/questions/<id>/check`, `/api/problems/<id>/check`, `/api/studio/quizzes*`, `/api/studio/questions*` | 24 |
| 7–8 | `/api/studio/overview`, duplicate/bulk endpoints | 5 |
| 10 | `/api/studio/courses/<slug>/live-sessions*`, announcements, students, analytics | 18 |
| 11 | `/api/certificates/verify/<serial>`, reviews, discussions, notifications | 16 |
| 13 | `/api/profile/export`, `DELETE /api/profile` | 2 |

**Expected end state:** ~119 new operations on top of today's 72 (verify against `spectacular` at release; the number is an estimate, not a gate).
