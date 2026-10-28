# Session Knowledge Handoff — Backend Skills Alignment (Khawarizm Academy)

> **Purpose:** a new session (fresh context) reads this file + `backend-skills-alignment.md` + the repo docs and is fully up to speed. Written 2026-10-28 after a deep audit.

---

## 1. Status
- **Planning: DONE.** Master plan: `backend-skills-alignment.md` (same directory). 13 phases (0–12), branch-per-phase off base branch `Refactor/BackendSkills`. Committed into the project at `plan/` as the first execution act.
- **Execution: NOT STARTED.** Nothing committed; `main` untouched (`9374b54`).
- Companion handoff: this file (`session-knowledge.md`) travels with the plan into `plan/`.

## 2. User decisions (locked)
| Decision | Choice |
| :--- | :--- |
| Branch strategy | Base branch `Refactor/BackendSkills` + one branch per phase, PR into base; Phase 12 merges base → `main` |
| Cache backend | Locmem + HTTP caching first; Redis only later via optional `REDIS_URL` env |
| Envelope wrap | Bare-array endpoints MAY be wrapped in `{items}` **now**, with coordinated frontend fetcher/type edits in the same phase (user approved touching the frontend for changed endpoints) |
| Plan location | `plan/` folder inside the project (editable) |
| Scope | Backend only, except the Phase-8 frontend fetcher/type updates |

## 3. How to get up to speed (in order)
1. Read `plan/backend-skills-alignment.md` (in project after task 0; otherwise `~/.opencode/plan/`)
2. Read repo docs: `docs/00-overview.md` → `docs/08-backend-architecture.md`, especially `07-backend-contract.md` (API surface) and `08` (internal shape)
3. Read `backend/features/README.md` (folder contract + rules) and `backend/README.md` (run/env/deploy)
4. Skills live in `.agents/skills/` — user updated them all recently; 17 are relevant to this plan (listed in the master plan §2)
5. Read `REPORT.md` at repo root (last feature-completion report; ~400 tests passing at that point)

## 4. Verified repo facts (no need to re-discover)
- **Stack:** Django 6.1.2, DRF 3.18.3, Python 3.14, SQLite dev / Postgres on Vercel via `DATABASE_URL`, firebase-admin, PyJWT (HS256), Pyrogram+TgCrypto, gunicorn, python-dotenv. Docker dev image has FFmpeg.
- **Layout:** `backend/config/` (settings, urls, middleware, views=root+health-ish) + `backend/features/<feature>/` — 12 apps: common, auth (label `accounts`), catalog, courses, scholarships, dashboard, home, events, competitions, profile (no models), adminconsole (no models), videohosting.
- **Conventions already real:** `features/common/models.py` (`UUIDModel`, `TimeStampedModel`), `features/common/choices.py` (all TextChoices), `compact()` + `as_number()` in `common/serializers.py`, camelCase ONLY in serializers, thin-ish function views, one README per feature, admin registers every model, `seed_demo` idempotent.
- **Auth layering (exemplary, don't break):** `firebase.py` verify → `services.py` open/rotate sessions (one-device rule, single-use refresh stored hashed) → `authentication.py` Bearer→UserSession (401 with `authenticate_header="Bearer"`) → `permissions.py IsAdminRole`. Audit = `AuthEvent`.
- **Videohosting (exemplary, reference module):** hashed `StreamToken` (IP-bound, TTL, deleted on first expired use), per-rendition AES-128 keys served gated, `__TOKEN__` playlist placeholders rewritten per request, `no-store` on manifests/keys, 302 segment redirect to provider CDN, provider registry `providers/{base.py,SPECS,spec_for}`, FFmpeg guarded off serverless, `UploadSession` resumable, all outbound calls have `timeout=`.
- **git hygiene verified:** `.env.production`, `db.sqlite3`, `staticfiles/` NOT tracked. `.gitignore` un-ignores `.env.development` (intent: commit it) — but the file is **absent from repo and disk**.
- **Tests:** ~400 (`grep -c "def test_"` breakdown in master plan), shared kit `features/common/testing.py` (`ApiTestCase`, `api_client`, `FakeRequest`, `authenticate`, `make_user/admin/course/scholarship`). File-based SQLite test DB (`TEST.NAME` in /tmp) because of worker-thread writes.

## 5. Audit findings → phase mapping (master plan §2 has full tables)
**❌ Missing (phase):** CI (1) · logging/request-ids/healthz-readyz (2) · throttling+security headers (3) · any cache (4) · catalog Python-engine rework (5) · N+1s in course-detail & admin users, missing indexes, dead `enrolled_count`, zero assertNumQueries (6) · services layer only exists for auth (7) · envelope inconsistent + bare arrays (8) · no cleanup cron (9) · no OpenAPI (10) · no PROJECT_PROFILE.md (0/11)
**🟡 Partial:** catalog serializer queries FilterGroup inside serializer (`catalog/serializers.py:41`) · unknown filter/sort silently ignored (should 400) · `adminconsole._coerce` if-chain (→ dispatch dict) · `CONN_MAX_AGE=0` hardcoded · dashboard list endpoints uncapped
**✅ Strong:** feature layout, choices, compact boundary, data-driven filters (`catalog/filters.py`), auth layering, object-level checks everywhere, secrets out of git, seed idempotent, comments style (one-line why), outbound timeouts

## 6. Execution gotchas (learned this session)
- **Origin middleware:** `/api/` 403s without an allowed `Origin`/`Referer` header — every curl/smoke needs `-H "Origin: http://localhost:5173"`. Tests pass it via `api_client()`.
- **Search pollution:** exclude `backend/.venv/` (site-packages incl. pyrogram) and `backend/staticfiles/` and `__pycache__` from find/grep — they bury real results.
- **Venv:** `cd backend && source .venv/bin/activate` (exists, Python 3.14). Gates: `python manage.py check`, `makemigrations --check --dry-run`, `migrate`, `test`.
- **Serverless rules:** Vercel = read-only FS except /tmp, no long threads for FFmpeg (guarded), locmem cache is per-instance (accepted, TTLs short, public data only), throttle counters per-instance (documented).
- **Parity snapshots:** capture GET payloads before refactor into `/tmp/opencode/parity/before/*.json` with the Origin header; diff with `diff <(jq -S before) <(jq -S after)` after each refactor phase.
- **Contract guard:** frontend fetcher seam = `frontend/src/features/<f>/data/*Fetchers.ts` over `shared/lib/apiClient.ts`; shapes declared in `shared/types/entities.ts` + feature `types.ts`. Any payload change → update both sides in the same PR.
- **Branch naming:** repo uses `Server/*`, `Refactor/*`, `UI/*`, `Fix/*`, `Chore/*`, `Docs/*`, `Skills` — plan reuses this (new `Perf/*` is consistent).
- **Commit style:** `feat(videohosting): …`, `fix(routes): …`, `refactor(app): …` — scope in parens.

## 7. Start-building checklist (Phase 0, in order)
1. From `main`: `git checkout -b Refactor/BackendSkills`
2. Create `plan/` in project root; copy in `backend-skills-alignment.md` + this knowledge file; commit `docs(plan): check in the backend skills-alignment plan`
3. Create `PROJECT_PROFILE.md` at repo root (draft; mark unknowns `(?)`)
4. Create `backend/.env.development` (placeholders + comments only; gitignore already allows it)
5. Run the 4 baseline gates; record results in `plan/phase-0-baseline.md`
6. `seed_demo` if needed, then capture parity snapshots to `/tmp/opencode/parity/before/` (catalog ×3 param sets, catalog detail, home, events, competitions, dashboard×4 with dev-token auth, video meta)
7. Write `plan/CONVENTIONS.md` (structure rules for all phases: services.py rule, config vs common split, no new file categories)
8. PR Phase 0 into base branch → proceed to Phase 1 (`Chore/BackendCI`)

## 8. Out-of-scope ledger (do not sneak these in)
Redis mandatory · DB-level catalog filtering (trigger: >~2k rows) · MFA for admin · Celery/RQ · search engine upgrade (pg_trgm) · frontend-wide refactor · payment flows · CDN setup
