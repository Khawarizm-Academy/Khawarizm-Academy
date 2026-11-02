# PROJECT_PROFILE

> Project-specific facts the generic skills read first. Keep it short and true. Mark unverified lines with `(?)`.

## 1. Identity
- Name / one-line purpose: **Khawarizm Academy** — a bilingual (Arabic-first, RTL) online learning academy: courses, live sessions, server-graded practice and exams, scholarships, competitions/events, with provider-backed lesson video.
- Audience and languages: Arabic-speaking learners; UI copy is Arabic, `dir=rtl`; API payloads are camelCase English keys with Arabic values.
- Brand: React SPA in `frontend/src` (logo/design tokens live there; see `frontend/src` styles + `docs/01-design-system.md`).

## 2. Stack
- Frontend: React 19.2 + TypeScript ~6.0, Vite 8, Tailwind v4, lucide icons; data via per-feature `*Fetchers.ts` over `shared/lib/apiClient.ts`; tests Vitest + Testing Library.
- Backend: Python 3.14, Django 6.1.2 + DRF 3.18.3, function-based views; auth = Firebase ID-token verify → HS256 access JWT + hashed rotating refresh sessions. Canonical role/permission policy lives in `backend/features/access`; the admin console enforces per-method and per-content-type permissions, while legacy `User.role`/`is_staff` remain synchronized compatibility fields.
- Database: dev SQLite (`backend/db.sqlite3`, untracked) · production Postgres via `DATABASE_URL` (managed, sslmode=require). Tiny tables (seed = 3 courses, 2 scholarships).
- Cache / queue: app cache via `features/common/cache.py` (namespaced versioned keys `kh:<ns>:v<n>:<digest>`, 300 s ±10% TTL) + HTTP ETag layer; LocMem by default, Redis via optional `REDIS_URL`. No task queue — background work is threads (upload ingest) + cron (cleanup).
- Hosting: Vercel serverless (control plane/read-only FS, `/tmp` scratch) **or** self-hosted Docker with persistent storage and FFmpeg. Provider video bytes stay with Telegram or Google Drive; the backend serves manifests/keys or a bounded Drive raw proxy.

## 3. Commands (exact)
- Backend install: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Backend run: `cd backend && source .venv/bin/activate && python manage.py migrate && python manage.py runserver 127.0.0.1:8000`
- Backend checks: `python manage.py check` · `python manage.py makemigrations --check --dry-run` · `python manage.py migrate` · `python manage.py check --deploy` · `python manage.py spectacular --fail-on-warn` (OpenAPI must generate with zero warnings)
- Backend tests: `python manage.py test` · `python manage.py test --parallel` (CI runs `test -v2 --parallel`; the row-lock concurrency regression runs only on databases supporting `select_for_update`).
- Backend seed: `python manage.py seed_demo` (idempotent)
- Backend cleanup job: `python manage.py cleanup_expired` (idempotent; prunes expired data and grades overdue quiz attempts; self-hosted cron every 6h)
- Video ingest: `python manage.py ingest_video <file> --slug <slug> --package auto|force|never` (FFmpeg host only for HLS; unsupported Telegram plans fail before provider upload)
- Frontend: `cd frontend && npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run lint`
- Frontend env: `VITE_API_BASE_URL=http://localhost:8000/api`

## 4. Layout and conventions
- Monorepo: `backend/` (Django) + `frontend/` (Vite SPA) + `docs/` (numbered guides, `07`/`08` = API contract & backend architecture).
- Backend: `backend/config/` (settings/urls/middleware) + `backend/features/<feature>/` — 16 Django feature apps, including backend-only `access` policy and Studio teaching-tool APIs; shared code in `features/common/`. Contract: `backend/features/README.md`.
- App labels: `features.auth` uses label `accounts` (`AUTH_USER_MODEL = "accounts.User"`); everything else labels as its folder.
- Serializers are the only camelCase boundary (`compact()` in `common/serializers.py`); views/models keep snake_case.
- Tests: `python manage.py test` with shared kit `features/common/testing.py` (`ApiTestCase`, `api_client`, `make_user/admin/course/scholarship`, `authenticate`); test DB is file-backed in `/tmp` with WAL + per-worker clone files via the `config.sqlite_backend` engine (worker threads + parallel runner need it — do not revert to the in-memory default table-locks the ingest thread).
- Frontend: feature-first `src/features/<f>/{components,data,types.ts}`, shared in `src/shared/`; contract docs in `docs/07-backend-contract.md`.
- Access contract: backend permission keys and labels originate in `features/access/registry.py`; `frontend/src/shared/json/permissionCatalog.json` is an exact, test-checked mirror consumed by `shared/lib/permissions.ts` and the auth `useCan` hook.
- Admin access APIs: `/api/admin/roles/*` owns role catalog, role CRUD, assignments, member pages, and reorder; `/api/admin/audit` pages access changes separately from the auth activity stream. These routes call `features/access/services.py`; do not duplicate grant/hierarchy rules in views.
- Course lifecycle: `features/courses` owns `CourseStatus`, explicit `Course.owner`/`CourseStaff`, lesson resources, lifecycle validation and auditing; model-less `features/studio` exposes authenticated `/api/studio/*` authoring and `/api/admin/review-queue*` moderation. Catalog/home show published courses only; archived detail remains public but is not enrollable, while draft/in-review previews require course-editor access.
- Learner playback: the course player mounts one responsive `PlayerStage`; `videohosting.usePlayback` resolves noncached, entitlement-checked lesson grants and lazy native-HLS/hls.js/raw/YouTube/Vimeo engines. `videoPlayerStore` mirrors real engine state (no synthetic ticker), sends bounded lesson-progress heartbeats, and stores only non-secret user preferences locally.
- Quizzes: `features/quizzes` owns question banks, server-timed attempts, autosaved selections, grading/reveal policy, attempt grants, analytics, and `/api/studio/quizzes*`; public problem lists never include answer keys. `run_cleanup` finalizes overdue attempts.
- Phase 10 teaching tools: `features/courses` owns timestamp-authoritative live sessions with timezone-safe labels/links; `features/announcements` owns sanitized, private course updates and durable per-course/day quotas; `features/studio` owns private learner notes, roster/CSV privacy, and SQL-aggregated analytics. Live-session/review links are per-user no-store and only returned to enrolled learners or authorized staff.

## 5. Design
- Tokens live in the frontend (`frontend/src` CSS + Tailwind v4 theme); see `docs/01-design-system.md`.
- Motion/type/breakpoints per `docs/01-design-system.md` (frontend-scoped; this profile focuses backend).

## 6. Data and performance
- Content writes go through the permission-scoped admin editor or Django admin; course lifecycle/curriculum writes go through Studio and `courses.services`; role and user-role changes go through the access services; quiz authoring/grading writes go through `quizzes.services`; announcement quotas/pinning and live-session timestamps are service-owned; seed is one `@transaction.atomic` upsert pass; video progress flusher coalesces writes.
- Cache: public GETs are app-cached (`features/common/cache.py`) — namespaces `catalog` (union + detail + filters), `home` (rails), `events`, `competitions`; 300 s TTL with ±10% jitter; invalidation is version bumps inside `transaction.on_commit` via the registry in `features/common/cache_invalidation.py`. Public GETs also carry an ETag + `Cache-Control` (`features/common/http_cache.py`). Video/Studio/admin/playback responses are private or explicitly `no-store` where tokens or user state are present.
- Index conventions: UUID PKs, `slug` business keys, FK indexes automatic; videohosting declares its own indexes.
- Counter `Course.enrolled_count` is maintained by `courses/services.py::enroll` (`F()+1` inside the enrollment transaction).

## 7. SEO and deployment
- SPA (client-rendered) at Vercel; API at `backend` Vercel project (`vercel.json` runs `migrate` + `collectstatic` at build; its cron hits `/api/admin/maintenance/cleanup` daily at `0 3 * * *` — Hobby plan allows at most once/day; the 6h cadence is self-hosted cron only).
- Canonical: SPA `https://khawarizmacademy.vercel.app` `(?)`; API target `https://khawarizm.vercel.app` (origin names verified from `.env.production`).
- Env profiles: backend `.env.development` is committed with development defaults/placeholders; backend `.env.production` is gitignored and holds real keys only on the host. `frontend/.env.production` is intentionally tracked and contains only the public `VITE_API_BASE_URL`; Vercel uses Project Environment Variables.
- CI: `.github/workflows/backend.yml` runs backend checks on `main`, `Feature/**`, and legacy `Refactor/*`; `.github/workflows/frontend.yml` runs lint, typecheck, tests, and build on `main`/`Feature/**`. `main` currently requires the backend check; add the frontend check to branch protection after it has run once.
- OpenAPI contract: `/api/schema` (YAML) + Swagger UI `/api/schema/docs` — public and origin-exempt; generated with drf-spectacular 0.30 (`ContractAutoSchema` appends the shared error envelope to every operation).

## 8. Known pitfalls
- Every `/api/` request needs an allowed `Origin: http://localhost:5173` header (`config/middleware.py`); curls/tests without it 403.
- `/api/admin/*` requires Firebase-issued accounts (`FIREBASE_ALLOW_DEV_TOKENS` off) to escape dev-token-only mode for staff flows `(?)`.
- SQLite dev (and self-hosted) runs on WAL + `busy_timeout=10000` + `IMMEDIATE` transactions with the `config.sqlite_backend` engine; the test DB is a file in `/tmp` cloned per parallel worker (`khawarizm-test-db_N.sqlite3`). Do not revert this — the upload ingest's worker thread and the parallel runner both need it.
- Video policy is provider-specific: Telegram has no general raw fallback and needs a persistent `VIDEO_SPOOL_DIR`/FFmpeg-capable host for Studio packaging; missing prerequisites reject the upload plan instead of leaving a new asset staged indefinitely. Drive HLS is a no-go; Drive raw playback uses OAuth-backed bounded Range reads (default cap 8 MiB, max four concurrent raw streams).
- Playback grants are IP-bound and expiring; only SHA-256 token hashes are stored. HLS manifests, keys, captions, Studio, admin, and raw responses are private/no-store as applicable. Upload session URIs, OAuth credentials, and provider bearer tokens never enter API payloads.
- Phase 4's migration backfills legacy HLS assets as `hls/encrypted`, Drive-source assets as `raw/gated`, and only unambiguous `<course>--<lesson>` links. `manage.py package_pending` now recovers stale `processing`/legacy `staged` assets when a persistent spool and provider source-download hook exist; it forces HLS, uses a lock, skips unsupported/no-source rows, and redacts provider URIs from persisted errors. New unsupported Telegram plans still fail before storing a source.
- Search: exclude `backend/.venv/`, `backend/staticfiles/`, `__pycache__` — they bury real results.
- Keep backend `.env.production` out of git. The tracked frontend `frontend/.env.production` is public configuration, not a secret; `.gitignore` explicitly re-includes it.
- Django admin (`/admin/`) needs the same origin handling as the API when run behind Vite dev proxy.
