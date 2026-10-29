# PROJECT_PROFILE

> Project-specific facts the generic skills read first. Keep it short and true. Mark unverified lines with `(?)`.

## 1. Identity
- Name / one-line purpose: **Khawarizm Academy** — a bilingual (Arabic-first, RTL) online learning academy: courses, live sessions, practice problems, scholarships, competitions/events, with self-hosted HLS lesson video.
- Audience and languages: Arabic-speaking learners; UI copy is Arabic, `dir=rtl`; API payloads are camelCase English keys with Arabic values.
- Brand: React SPA in `frontend/src` (logo/design tokens live there; see `frontend/src` styles + `docs/01-design-system.md`).

## 2. Stack
- Frontend: React 19.2 + TypeScript ~6.0, Vite 8, Tailwind v4, lucide icons; data via per-feature `*Fetchers.ts` over `shared/lib/apiClient.ts`; tests Vitest + Testing Library.
- Backend: Python 3.14, Django 6.1.2 + DRF 3.18.3, function-based views; auth = Firebase ID-token verify → HS256 access JWT + hashed rotating refresh sessions.
- Database: dev SQLite (`backend/db.sqlite3`, untracked) · production Postgres via `DATABASE_URL` (managed, sslmode=require). Tiny tables (seed = 3 courses, 2 scholarships).
- Cache / queue: app cache via `features/common/cache.py` (namespaced versioned keys `kh:<ns>:v<n>:<digest>`, 300 s ±10% TTL) + HTTP ETag layer; LocMem by default, Redis via optional `REDIS_URL`. No task queue — background work is threads (upload ingest) + cron (cleanup).
- Hosting: Vercel serverless (read-only FS, `/tmp` scratch) **or** self-hosted Docker with gunicorn + FFmpeg. Frontend on Vercel.

## 3. Commands (exact)
- Backend install: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Backend run: `cd backend && source .venv/bin/activate && python manage.py migrate && python manage.py runserver 127.0.0.1:8000`
- Backend checks: `python manage.py check` · `python manage.py makemigrations --check --dry-run` · `python manage.py migrate` · `python manage.py check --deploy` · `python manage.py spectacular --fail-on-warn` (OpenAPI must generate with zero warnings)
- Backend tests: `python manage.py test` (451 tests, ~40 s serial) · `python manage.py test --parallel` (~7 s; CI runs `test -v2 --parallel`)
- Backend seed: `python manage.py seed_demo` (idempotent)
- Backend cleanup job: `python manage.py cleanup_expired` (idempotent; self-hosted cron every 6h)
- Video ingest: `python manage.py ingest_video <file> --slug <slug>` (FFmpeg host only, never Vercel)
- Frontend: `cd frontend && npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run lint`
- Frontend env: `VITE_API_BASE_URL=http://localhost:8000/api`

## 4. Layout and conventions
- Monorepo: `backend/` (Django) + `frontend/` (Vite SPA) + `docs/` (numbered guides, `07`/`08` = API contract & backend architecture).
- Backend: `backend/config/` (settings/urls/middleware) + `backend/features/<feature>/` — 12 apps mirroring `frontend/src/features/`; shared code in `features/common/`. Contract: `backend/features/README.md`.
- App labels: `features.auth` uses label `accounts` (`AUTH_USER_MODEL = "accounts.User"`); everything else labels as its folder.
- Serializers are the only camelCase boundary (`compact()` in `common/serializers.py`); views/models keep snake_case.
- Tests: `python manage.py test` with shared kit `features/common/testing.py` (`ApiTestCase`, `api_client`, `make_user/admin/course/scholarship`, `authenticate`); test DB is file-backed in `/tmp` with WAL + per-worker clone files via the `config.sqlite_backend` engine (worker threads + parallel runner need it — do not revert to the in-memory default).
- Frontend: feature-first `src/features/<f>/{components,data,types.ts}`, shared in `src/shared/`; contract docs in `docs/07-backend-contract.md`.

## 5. Design
- Tokens live in the frontend (`frontend/src` CSS + Tailwind v4 theme); see `docs/01-design-system.md`.
- Motion/type/breakpoints per `docs/01-design-system.md` (frontend-scoped; this profile focuses backend).

## 6. Data and performance
- Writes go through admin-console content editor or Django admin; seed is one `@transaction.atomic` upsert pass; video progress flusher coalesces writes.
- Cache: public GETs are app-cached (`features/common/cache.py`) — namespaces `catalog` (union + detail + filters), `home` (rails), `events`, `competitions`; 300 s TTL with ±10% jitter; invalidation is version bumps inside `transaction.on_commit` via the registry in `features/common/cache_invalidation.py`. Public GETs also carry an ETag + `Cache-Control` (`features/common/http_cache.py`).
- Index conventions: UUID PKs, `slug` business keys, FK indexes automatic; videohosting declares its own indexes.
- Counter `Course.enrolled_count` is maintained by `courses/services.py::enroll` (`F()+1` inside the enrollment transaction) — fixed in alignment Phase 6; it is no longer dead.

## 7. SEO and deployment
- SPA (client-rendered) at Vercel; API at `backend` Vercel project (`vercel.json` runs `migrate` + `collectstatic` at build; its cron hits `/api/admin/maintenance/cleanup` daily at `0 3 * * *` — Hobby plan allows at most once/day; the 6h cadence is self-hosted cron only).
- Canonical: SPA `https://khawarizmacademy.vercel.app` `(?)`; API target `https://khawarizm.vercel.app` (origin names verified from `.env.production`).
- Env profiles: `.env.development` committed (dev defaults + placeholders) · `.env.production` git-ignored, real keys on the box · Vercel uses Project Environment Variables.
- CI: `.github/workflows/backend.yml` runs on every push/PR touching `main`/`Refactor/*` — ruff check+format, `check`, `spectacular --fail-on-warn`, `makemigrations --check`, `migrate`, `test -v2 --parallel`, `check --deploy`, pip-audit, gitleaks (whole history). Branch protection on `main` requires it.
- OpenAPI contract: `/api/schema` (YAML) + Swagger UI `/api/schema/docs` — public and origin-exempt; generated with drf-spectacular 0.30 (`ContractAutoSchema` appends the shared error envelope to every operation).

## 8. Known pitfalls
- Every `/api/` request needs an allowed `Origin: http://localhost:5173` header (`config/middleware.py`); curls/tests without it 403.
- `/api/admin/*` requires Firebase-issued accounts (`FIREBASE_ALLOW_DEV_TOKENS` off) to escape dev-token-only mode for staff flows `(?)`.
- SQLite dev (and self-hosted) runs on WAL + `busy_timeout=10000` + `IMMEDIATE` transactions with the `config.sqlite_backend` engine; the test DB is a file in `/tmp` cloned per parallel worker (`khawarizm-test-db_N.sqlite3`). Do not revert any of this — the upload ingest's worker thread and the parallel runner both need it (the in-memory shared-cache default table-locks the ingest thread).
- Search: exclude `backend/.venv/`, `backend/staticfiles/`, `__pycache__` — they bury real results.
- Excluding `frontend/.env.production` from git on purpose; bare un-ignores at repo root would re-include it — keep the `frontend/` exception when editing `.gitignore`.
- Django admin (`/admin/`) needs the same origin handling as the API when run behind Vite dev proxy.
