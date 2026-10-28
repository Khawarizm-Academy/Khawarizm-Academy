# Khawarizm Academy — Backend Skills-Alignment Plan

**Date:** 2026-10-28 · **Scope:** Backend only (`backend/`), with small coordinated frontend edits where a payload contract changes (explicitly approved by the user).
**Method:** Every phase below was derived by auditing the live backend against the freshly updated skill library, listing what is already executed, what is partially executed, and what is missing — then planning only the missing work.

---

## 1. Stack & facts (verified in repo)

| Fact | Value |
| :--- | :--- |
| Framework | Django 6.1.2 + DRF 3.18.3, function-based views |
| Python | 3.14 (bleeding edge — soak-period risk noted) |
| DB | SQLite dev (`db.sqlite3`, untracked) · Postgres on Vercel via `DATABASE_URL` |
| Auth | Firebase ID-token verify → HS256 access JWT + hashed rotating refresh (`accounts.User`) |
| Hosting | Vercel (serverless) **or** self-hosted Docker (gunicorn, FFmpeg in image) |
| Features | 12 apps under `backend/features/` mirroring `frontend/src/features/` |
| Tests | ~400 tests across 11 features + config, shared kit in `features/common/testing.py` |
| CI | **None** (no `.github/workflows`) · **No lint/format config** · **No pre-commit** |
| LOC | ~10.8k including tests; largest: `adminconsole/views.py` (344), `auth/tests.py` (564) |

---

## 2. Skill audit matrix (what the skills say vs what exists)

Legend: ✅ executed · 🟡 partial · ❌ missing

### be-architecture — 🟡 (the strongest area)
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| One feature = one app = one folder, mirrors frontend | ✅ | 12 apps, `features/README.md` contract, `accounts` label workaround |
| `common` module: abstract models, choices, seed | ✅ | `UUIDModel`/`TimeStampedModel`, `choices.py`, `seed_demo` |
| Serializers are the only camelCase boundary + `compact()` | ✅ | `features/*/serializers.py`, `common/serializers.py` |
| Data over branches | ✅ | `catalog/filters.py` FILTERS/SORTERS tables |
| Handlers thin | 🟡 | auth/catalog good; `courses/views.py` holds enroll/progress/favorite rules inline; `adminconsole/views.py` = 344 lines with CRUD + coercion logic in handlers |
| `services.py` per feature | 🟡 | only `auth/services.py` exists |
| Serializers must not hit the DB | ❌ | `catalog/serializers.py:41` queries `FilterGroup` inside the serializer boundary |
| Admin = data editor, all models registered | ✅ | every model registered with inlines |
| Seed idempotent | ✅ | `seed_demo` upserts, `@transaction.atomic` |

### be-api-design — 🟡
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Nouns, GET no side effects, POST for actions | ✅ | `/videos/:slug/token`, `/auth/refresh` |
| Static routes before parameterized | ✅ | videohosting urls |
| Top-level JSON object, never bare array | ❌ | `dashboard/enrolled|saved|competitions|notifications`, `courses problems`, `courses related` return bare arrays |
| One error envelope `{detail, code, fields}` | 🟡 | mixed: `{"detail"}` vs `{"code","detail"}` (refresh, video 409s); generic DRF errors have no `code` |
| Pagination capped server-side + stable order | 🟡 | catalog capped at 6/page ✓ but builds the **entire** list first; admin PAGE_SIZE ✓; dashboard lists uncapped |
| Unknown filter → 400, not silent ignore | ❌ | unknown sort/filter values silently ignored |
| OpenAPI spec | ❌ | none |
| Batch endpoint where clients write many | 🟡 | admin content editor is per-row; no batch route (low priority — writes are admin-only) |

### be-auth-and-security — 🟡
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Vetted identity provider, server-side verify | ✅ | Firebase Admin SDK; dev tokens gated by explicit setting |
| Rotating refresh, hashed at rest, revocable | ✅ | `tokens.py` + `UserSession` |
| Object-level checks everywhere | ✅ | every learner query filters by `request.user` |
| Role checks in one place | ✅ | `IsAdminRole` permission class |
| **Rate limiting** on login/search/expensive routes | ❌ | no throttling config at all |
| **Security headers** (HSTS, nosniff, referrer, CSP) | ❌ | only `SECURE_PROXY_SSL_HEADER` set |
| Uniform login errors, no enumeration | ✅ | single Arabic rejection message |
| Secrets out of git/client | ✅ | verified: `.env.production` + `db.sqlite3` + `staticfiles` untracked |
| Dependency audit in CI | ❌ | no CI → no `pip-audit` |
| MFA for admin | ❌ (deferred — Firebase-issued accounts; decision documented) | |

### be-observability-and-logging — ❌ (biggest gap)
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Structured logs (JSON, level, request id) | ❌ | no `LOGGING` block in settings; no request IDs |
| Request/correlation id at edge + response header | ❌ | — |
| Per-request DB metrics (queries, ms) | ❌ | — |
| `/healthz` liveness + `/readyz` readiness | ❌ | only a bare `GET /` JSON; docker healthcheck hits `/` |
| Error tracking hook | ❌ | — |
| Audit trail | ✅ | `AuthEvent` append-only, powers admin analytics |

### be-config-and-secrets — 🟡
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| One module reads env (settings.py only) | ✅ | only `apps.py` RUN_MAIN check + seed password default (acceptable, documented) |
| Typed helpers (`env_bool/int/list`) | ✅ | — |
| Fail loudly at boot (compound credentials) | ✅ | Firebase + SECRET_KEY guards |
| `.env.development` committed with placeholders | ❌ | README + docs claim it is committed; **file absent from repo & disk** (gitignore even un-ignores it — intent confirmed) |
| Inventory table in README | ✅ | env table exists |

### db-schema-design-and-migrations — ✅ (light gaps)
- ✅ UUID PK convention, `slug` business keys, `unique_together` natural keys, `__str__`, `help_text`, UTC tz, small reversible migrations.
- 🟡 Denormalized counter `Course.enrolled_count` **exists but is never incremented** — dead field (enroll endpoint doesn't touch it) → either maintain atomically or drop.
- 🟡 Display dates stored as `CharField` (`completion_date`, `issue_date`, `date_label`) — display-only strings, acceptable, documented.

### db-indexing-and-query-optimization — 🟡
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Indexes chosen from queries | 🟡 | videohosting declares indexes ✅; missing: `AuthEvent(kind, created_at)` (analytics scans), `UserSession(user, is_active)` (per-user active counts), `StreamToken(asset, expires_at)` |
| No N+1 | ❌ | `course_detail` → `modules.all()` then `lessons.all()` **per module**; `adminconsole.user_row` → `user.sessions.filter(...).count()` **per user row** |
| Serializers don't query | ❌ | catalog filter-groups query in serializer |
| Query-count assertions in tests | ❌ | zero `assertNumQueries` in the suite |
| No Python filtering of big lists | 🟡 | catalog loads **all** rows + serializes **all** + filters in Python **per request** (skill allows Python filtering *only for small, already-cached lists* — cache is the missing half) |
| EXPLAIN workflow | ❌ | no slow-query visibility at all (no logging) |

### db-write-batching-and-transactions — ✅ (small gaps)
- ✅ `bulk_create` for segments, `F()` counters in videohosting, throttled progress flusher (write coalescing — exemplary), seed in one transaction.
- 🟡 No `ATOMIC_REQUESTS`; enroll+counter (after Phase 6 fix) must be one transaction; `on_commit` unused.

### cache-strategy-layers — ❌ (second biggest gap)
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Any application cache | ❌ | no `CACHES` config, no cache usage outside videohosting's OAuth-token cache |
| HTTP caching on public GETs (`Cache-Control`/ETag) | ❌ | catalog/home/events/competitions are perfect TTL candidates; only video endpoints set `no-store` (correct) |
| Compression | ❌ | no `GZipMiddleware` (Vercel compresses at edge; self-hosted doesn't) |
| Invalidation path | ❌ | no cache → nothing to invalidate (designed with Phase 4) |
| Private data never in shared cache | ✅ | (nothing cached yet; design guard planned) |

### perf-backend-speed — 🟡
| Rule | Status | Evidence |
| :--- | :--- | :--- |
| Kill N+1 first | ❌ | see indexing rows |
| Cache repeated reads | ❌ | — |
| Shrink payloads / paginate / cap | 🟡 | catalog capped ✓ but O(total) work per request |
| Compress | ❌ | — |
| Slow work out of request | ✅ | video ingest is a command with progress row + status (exemplary) |
| Every outbound call has a timeout | ✅ | all provider calls use `timeout=` (11 call sites verified) |
| Connections reused | 🟡 | `CONN_MAX_AGE=0` — right for Vercel Lambda, wasteful for self-hosted gunicorn (make it env-driven) |

### be-background-jobs-and-queues — 🟡
- ✅ Heavy work (FFmpeg/HLS) guarded off serverless (`require_packaging_host`), progress tracked on the row, idempotent ingest (`get_or_create` by slug), errors land on the row.
- ❌ No scheduled cleanup (expired `StreamToken`s only die on first miss; stale `UploadSession`s, old `AuthEvent`s, expired `DriveAuthState` accumulate forever).
- ❌ No retry/backoff/dead-letter policy (acceptable for a manual command; document the policy instead of building Celery — team size = 1).

### be-testing — 🟡
- ✅ Shared kit (`ApiTestCase`, factories, `authenticate`), offline video tests (providers mocked, file paths cached on rows), ~400 tests.
- ❌ No `assertNumQueries`/`CaptureQueriesContext` guards · no contract tests vs frontend types · no CI to run any of it.

### ops-deployment-and-ci — ❌
- No CI pipeline, no lint stage, no migration-check stage, no audit, no secrets scan, no `check --deploy`, no PR template/checks. Docker is dev-only (fine, documented). Vercel build runs migrate at build ✓.

### core-code-style — ✅
- One-line why-comments throughout (genuinely excellent), named constants, no banners/dead code found, data-driven tables, descriptive names.
- 🟡 `adminconsole._coerce` kind-based `if` chain → dispatch dict (Phase 7).

### core-error-handling — 🟡
- ✅ Fail loudly on bad config, 404 with a real Arabic message (defined once per feature), no swallowed exceptions (ingest catches broadly and records on row — intentional and correct).
- ❌ Inconsistent envelope/codes; `Throttled`/`ValidationError` shapes left at DRF defaults.

### core-project-profile — ❌
- No `PROJECT_PROFILE.md` anywhere → Phase 0 creates it.

### core-verification-and-quality-gates — 🟡
- ✅ Gates documented in README (check / makemigrations / migrate / test / curl-with-Origin).
- ❌ Nothing enforces them (no CI); no parity-capture workflow for refactors (we will use it heavily).

---

## 3. Branch & workflow model (user decision: base branch + phase branches)

```
main
 └── Refactor/BackendSkills        ← base branch (created from main)
      ├── Chore/BackendCI          ← Phase 1
      ├── Server/Observability     ← Phase 2
      ├── Server/Hardening         ← Phase 3
      ├── Perf/Caching             ← Phase 4
      ├── Perf/CatalogEngine       ← Phase 5
      ├── Perf/QueryHealth         ← Phase 6
      ├── Refactor/Services        ← Phase 7
      ├── Refactor/Envelope        ← Phase 8 (touches frontend fetchers)
      ├── Server/Jobs              ← Phase 9
      ├── Docs/OpenAPI             ← Phase 10
      └── Docs/BackendAlignment    ← Phase 11
```

- Each phase = one branch off the base branch = one PR into the base branch. Phase 12 merges the base branch into `main` as one reviewed release.
- Naming matches the repo's existing convention (`Server/*`, `Refactor/*`, `Perf/*` are new but consistent with `Chore/*`, `Fix/*`, `Docs/*`).
- Every phase PR must pass the Phase-1 CI gates before merge (Phase 1 lands first for exactly this reason).
- All migrations stay **additive/backward-compatible** so any phase can be reverted without a data migration.

---

## 4. Phases

> Every phase: code style per `core-code-style` (one-line why-comments, data over branches, no clever code), verification per `core-verification-and-quality-gates`, commit messages in the repo's `feat/fix/refactor/docs(chore)(scope):` style.

---

### Phase 0 — Baseline & Safety Net
**Branch:** `Refactor/BackendSkills` · **Skills:** core-project-profile, core-verification-and-quality-gates, be-config-and-secrets §1
**Goal:** make the ground truth explicit and capture "before" evidence, so every later refactor can prove parity.

Tasks:
0. **Check the plan into the project (user request):** create `plan/` at the repo root containing this master plan and the session-knowledge handoff (`plan/backend-skills-alignment.md`, `plan/session-knowledge.md`). Committed on the base branch so the plan lives in the repo, is editable there, and travels with the phases. Later phases append per-phase result notes under `plan/` (e.g. `plan/phase-1-result.md`).
1. Create `PROJECT_PROFILE.md` at repo root (draft from the skill template): stack, commands, folder map, DB facts, env inventory, limits — mark every unverified value `(?)`.
2. skip
3. Baseline gate run — record output in the plan appendix: `python manage.py check`, `makemigrations --check --dry-run`, `migrate`, `test`.
4. **Parity capture:** with seed data, curl every public GET endpoint with an allowed Origin and save JSON to `/tmp/opencode/parity/before/*.json` (catalog list ×3 param sets, detail, home, events, competitions, dashboard ×4 as a dev-token user, videos meta). These are the refactor-contract baselines.
5. Write the structure conventions down (they govern all phases):
   - `features/<f>/services.py` — business rules used by views **and** commands.
   - Cross-cutting project wiring lives in `config/` (middleware, logging, health); cross-cutting feature code lives in `features/common/` (cache helper, throttle classes, envelope, messages).
   - No new file categories; follow the existing folder contract.

**Gate:** profile exists, env profile exists, all 4 baseline gates green, parity JSONs captured.

---

### Phase 1 — CI Pipeline, Lint & Quality Gates
**Branch:** `Chore/BackendCI` · **Skills:** ops-deployment-and-ci §1, be-auth-and-security §9, be-testing §7, core-verification-and-quality-gates §1

Tasks:
1. `backend/pyproject.toml`: ruff config (line-length 120, target py314, select `E,F,I,B,SIM,UP,RUF`, isort profile) + formatter settings. Fix findings (expect a small diff; codebase is clean).
2. `.pre-commit-config.yaml`: ruff-format + ruff + hygiene checks.
3. `.github/workflows/backend.yml` — one job, cached pip, on push/PR to `main` and `Refactor/*`:
   ```
   ruff check + ruff format --check
   python manage.py check
   python manage.py makemigrations --check --dry-run   # models ⇄ migrations agree
   python manage.py migrate (tmp sqlite)
   python manage.py test -v2 --parallel
   pip-audit (requirements.txt)
   gitleaks detect (secrets scan, whole history)
   DJANGO_ENV=production DJANGO_SECRET_KEY=<dummy-real> DJANGO_DEBUG=false python manage.py check --deploy
   ```
4. Protect `main` with required status checks; add a PR template with the gate checklist.
5. README: replace the manual verification section with "CI runs these; locally: `pre-commit run -a` + the 4 commands".

**Gate:** workflow green on the branch; `check --deploy` reports only accepted findings (documented inline).

---

### Phase 2 — Observability & Health
**Branch:** `Server/Observability` · **Skills:** be-observability-and-logging §1–5, core-error-handling §5

Tasks:
1. `config/logging.py`: JSON console formatter (`ts, level, msg, logger, request_id, user_id, path, status, duration_ms, queries`), contextvar-based request-id filter, noisy-loggers silence list.
2. `config/middleware.py`: `RequestIDMiddleware` — accept inbound `X-Request-ID` or mint `uuid4().hex`; store in a contextvar; echo as a response header; feed the log filter.
3. `config/middleware.py`: `RequestMetricsMiddleware` — logs one INFO line per request with status + duration + **query count and DB time** (via `connection.execute_wrapper`); WARNING above thresholds (>25 queries or >300 ms DB) — the N+1 tripwire for everything Phases 5/6 fix.
4. `settings.py`: `LOGGING` block (INFO default; DEBUG in dev; no secrets/PII — rule stated in a comment), plumb the formatter.
5. Health endpoints in `config/views.py` + `urls.py`: `/healthz` (process alive, no DB, exempt from origin middleware) and `/readyz` (`SELECT 1` → `{"database": "up"}` or 503). Add both to `EXEMPT_PATHS`; switch the docker-compose healthcheck to `/healthz`.
6. Tests: readyz 200→503 with a broken DB; request-id header round-trip; metrics log line emitted.

**Gate:** every log line carries `request_id`; `readyz` flips correctly; docker healthcheck passes.

---

### Phase 3 — Hardening: Throttling & Security Headers
**Branch:** `Server/Hardening` · **Skills:** be-auth-and-security §1,5,6 · be-api-design §10 · core-error-handling §4

Tasks:
1. `features/common/throttling.py`: scoped DRF throttle classes — `AuthBurstThrottle` (login/refresh, anon, e.g. 10/min), `CatalogThrottle` (anon GET lists, e.g. 120/min), `VideoTokenThrottle` (per-user mint, e.g. 60/min), `AdminBurstThrottle`. Rates live as named constants with a one-line why-comment.
2. Wire via `DEFAULT_THROTTLE_CLASSES` + per-view scope attrs; 429 keeps DRF's `Retry-After`.
   - Documented caveat: per-instance memory counters on serverless (acceptable MVP; Redis via `REDIS_URL` is the later upgrade — same classes, shared store).
3. `settings.py` security block (prod-only via `env_bool` gates, dev untouched):
   `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_REFERRER_POLICY="strict-origin-when-cross-origin"`, `SECURE_CONTENT_TYPE_NOSNIFF=True`; a tiny middleware header for `Permissions-Policy`; report-only `Content-Security-Policy` for `/admin/`.
4. Login abuse signal: reuse `AuthEvent(kind=REJECTED)` — a lockout check in the login view: N rejects for one email/IP in 15 min → 429 with `Retry-After` (data-driven constants).
5. Tests: 429 on login spam with `Retry-After`; headers present under a prod profile; dev profile unaffected.

**Gate:** `check --deploy` clean; 429 smoke green; admin still usable.

---

### Phase 4 — Cache Layers & Compression
**Branch:** `Perf/Caching` · **Skills:** cache-strategy-layers §1–4,7,12 · perf-backend-speed §3 · be-api-design §8

Tasks (user decision: locmem + HTTP caching now, Redis-ready):
1. `settings.py`: `GZipMiddleware` (after `SecurityMiddleware`); `CACHES` = locmem default; optional `REDIS_URL` env → django-redis block (documented, not installed by default). `CONN_MAX_AGE` becomes env-driven (0 on Vercel, 60 self-hosted).
2. `features/common/cache.py`: one helper used everywhere —
   `cached(key, ttl_seconds, loader)` with **TTL jitter** (±10%) and namespaced keys `kh:<ns>:v<int>:<digest>`; `bump_version(namespace)` invalidation (version bump = instant family-wide expiry, no `KEYS *` scan).
3. `features/common/http_cache.py`: `etag_response(payload, *, public, max_age, s_maxage)` — ETag from a digest of the serialized payload; `Cache-Control` (`public, max-age=30, s-maxage=300, stale-while-revalidate=600` public; `private, no-store` private).
4. Apply to **public, rarely-changing GETs**: `/api/catalog` (+detail), `/api/home`, `/api/events`, `/api/competitions`, `/api/auth/config` (short, must-revalidate). Mark **private endpoints `no-store` explicitly**: `/api/dashboard/*`, `/api/auth/me|sessions`, `/api/admin/*`, all `/api/videos|stream/*` (video already does ✓).
5. Invalidation after commit: a registry of watched content models (`Course, Scholarship, EventItem, Competition, Filter*, Home*`) → `post_save`/`post_delete` signals + admin-console editor actions + `seed_demo` all call `bump_version(...)` inside `transaction.on_commit`.
   - **Guard:** never cache responses that depend on `request.user` (assertion helper added to the test kit).
6. Tests: ETag → 304 on the second request; cache hit = 0 DB queries (`assertNumQueries(0)`); editor write bumps the version; private endpoints carry `no-store`.

**Gate:** second identical catalog request = zero queries; 304 verified; per-miss log line makes the hit ratio observable.

---

### Phase 5 — Catalog Engine Rework
**Branch:** `Perf/CatalogEngine` · **Skills:** be-architecture §3,5 · db-indexing §6 · cache-strategy-layers §2 · perf-backend-speed §3,4

**Why:** today every `/api/catalog` request loads **all** courses + scholarships, serializes **every** row, filters in Python, then slices a page — O(catalog) work per view. The skill allows Python filtering only *for small, already-cached lists* → Phase 4's cache is the missing half.

Tasks:
1. New `features/catalog/service.py` (the catalog engine):
   - `build_items()` — the interleave (courses ⇄ scholarships, order preserved) built **once**, cached under `kh:catalog:v*:items` (TTL + version invalidation from Phase 4).
   - `list_items(params)` — cached list → existing `FILTERS`/`SORTERS` tables → pagination slice. Filtering logic is unchanged (data-driven; `matches()` untouched).
   - `filter_groups_payload(surface, tab)` — **moved out of `catalog/serializers.py`** so the serializer boundary stops querying.
2. `catalog/views.py` becomes: resolve params → call service → serialize the page slice. Handlers thin.
3. Unknown `sort`/`type`/etc. values → 400 listing valid options (be-api-design §5) — the frontend only sends whitelisted values, so this is additive-safe.
4. DB-pushdown trigger documented in the service docstring: when the catalog exceeds ~2k rows, move filters into `QuerySet.filter()` per type and keep only pagination in Python. (Recorded as a trigger, not built now — the catalog is dozens of rows.)
5. Guards: `assertNumQueries` — miss = constant (2), hit = 0; page slice O(1). Parity diff vs the Phase 0 baseline = zero.

**Gate:** parity zero; constant queries; cached-path p95 < 50 ms locally.

---

### Phase 6 — N+1 Kill & Index Pass
**Branch:** `Perf/QueryHealth` · **Skills:** db-indexing §3,6,7 · db-write-batching §3,5 · be-testing §4

Tasks:
1. **Course-detail N+1:** `course_detail_view` prefetches —
   `prefetch_related(Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lessons")), "live_sessions")` → constant 3 queries instead of 2+N.
2. **Admin users N+1:** `users` queryset annotates `active_sessions=Count("sessions", filter=Q(sessions__is_active=True))`; `user_row` reads the annotation.
3. **Dead counter fix:** enroll (service lands in Phase 7; the counter fix here) increments `Course.enrolled_count` with `F()` inside the same transaction as the `Enrollment` upsert; catalog cache invalidation via `on_commit`. One commit per enroll (db-write-batching §1).
4. **Indexes** (declared in `Meta`, names `idx_<table>_<cols>`):
   - `AuthEvent: ("kind", "created_at")` — admin analytics ranges; `("user", "-created_at")` — per-user trail.
   - `UserSession: ("user", "is_active")` — per-user active-session counts.
   - `StreamToken: ("asset", "expires_at")` — asset lookups + cleanup sweep.
   - FK indexes: Django creates them automatically ✓.
5. Migration via `makemigrations` (tables are small; `AddIndexConcurrently` documented as the rule once a table exceeds ~100k rows).
6. **Query-count regression guards** (`assertNumQueries`) on: course detail, dashboard summary/enrolled/saved, admin users list, `my_sessions`, catalog hit/miss — the permanent tripwire the skills demand.

**Gate:** `makemigrations --check` clean; every new guard green; before/after query counts recorded in the PR.

---

### Phase 7 — Services Layer & Thin Handlers
**Branch:** `Refactor/Services` · **Skills:** be-architecture §3,10 · core-code-style §3,9 · core-verification-and-quality-gates §2

**Pure refactor — behavior parity is the definition of done** (payload diffs must be exactly zero).

Tasks:
1. `features/courses/services.py` — out of views: `enroll(user, course)`, `save_progress(enrollment, data)`, `toggle_favorite(user, course)`, `related_for(course)`, `certificate_payload(course)`.
2. `features/scholarships/services.py` — `apply(user, scholarship, data)`, `toggle_save(user, scholarship)`.
3. `features/adminconsole/services.py` — out of the 344-line views.py: `create_user_account`, `update_user_account` (role⇄`is_staff` sync + self-demote/self-delete guards), `delete_user_account`, and the content editor (validate/coerce/apply per `CONTENT_TYPES`) — with `_coerce`'s `if`-chain turned into a **dispatch dict** keyed by field kind (core-code-style §3).
4. `features/dashboard/services.py` — `summary(user)`, `notifications(user)` assembly.
5. Views end at the skill's shape: resolve caller → validate → call service → serialize → return (≤ ~25 lines each).
6. Parity verification: re-run the Phase 0 curl set (including an authenticated dashboard run); `diff <(jq -S before) <(jq -S after)` = zero for every endpoint.
7. Tests stay green (they already cover routes; view-level unit tests move to the service).

**Gate:** zero payload diffs; all tests green; every touched view visibly thin.

---

### Phase 8 — Error Envelope & `{items}` Contract Wrap (coordinated frontend edits)
**Branch:** `Refactor/Envelope` · **Skills:** be-api-design §2,3,5 · core-error-handling §4 · (user-approved: changed endpoints may update the frontend too)

Tasks:
1. `features/common/messages.py` — **all** user-facing strings defined once (feature NOT_FOUND constants import from here; one source of truth).
2. `features/common/errors.py` — `api_exception_handler` renders the one envelope:
   `{ "detail": ..., "code": <code>, "fields": {...}? }` — wraps `ValidationError`, `Http404`, `PermissionDenied`, `NotAuthenticated`, `Throttled`. Existing explicit codes (`session_invalid`, `expired`, video 409s) keep their current keys — **additive only**; the SPA already maps `code`.
3. Every hand-rolled 400/404/409 in features switches to the envelope helpers (same status codes, same messages, plus `code`).
4. Unknown catalog filter/sort → 400 with the valid values list (wired in Phase 5; shape lands here).
5. **Wrap bare arrays** into `{ "items": [...] }` and update the frontend in the same phase:
   - Backend: `dashboard/enrolled|saved|competitions|notifications`, `courses problems` ×2, `courses related`, `auth/sessions` → `{"items": [...]}`.
   - Frontend (per docs/07 fetcher seam): `dashboardFetchers.ts`, `courseFetchers.ts`, auth session types, plus each feature's `types.ts` / `shared/types/entities.ts` where the shape is declared.
   - Frontend gates: `npm test` + `npm run build` green.
6. Contract tests: one test per changed endpoint asserting the exact key set (the be-testing §5 contract test the suite lacks).

**Gate:** backend + frontend suites green; payloads match the updated frontend types; parity diffs match the documented shape changes only.

---

### Phase 9 — Background Jobs, Cleanup & Idempotency
**Branch:** `Server/Jobs` · **Skills:** be-background-jobs-and-queues §3,4,7 · be-file-uploads-and-media-pipeline §5 · core-error-handling §8

Tasks:
1. `cleanup_expired` management command (owned by `features/common`): deletes in **chunks of 500, one transaction per chunk**:
   expired `StreamToken`s (sweep beyond the existing on-miss delete), stale `UploadSession`s (>7 days, not done), expired `DriveAuthState`s, `AuthEvent`s older than `AUTH_EVENT_RETENTION_DAYS` (env, default 180).
2. Overlap guard: last-run marker row (tiny `MaintenanceRun` model in common) — a second concurrent run exits 0 with "skipped, still running".
3. Scheduling docs for both hosts:
   - Self-hosted: cron line (every 6h).
   - Vercel: `vercel.json` `crons` → `POST /api/admin/maintenance/cleanup` (staff-authenticated, idempotent, 202 + status body per the skill's request/response pattern).
4. Ingest retry policy documented (not a Celery build): the command is idempotent (`get_or_create` by slug), failures land on the row (`status=error`, `error_message`), re-run is the retry — verify the admin lists error rows with filters.
5. Assert `on_commit` discipline: counter increments (Phase 6) and cache invalidation (Phase 4) never fire pre-commit.
6. Tests: run cleanup twice → identical state; guard blocks overlap; endpoint path is staff-only.

**Gate:** command idempotent; failure rows visible in admin; both cron paths documented.

---

### Phase 10 — OpenAPI & Route Manifest
**Branch:** `Docs/OpenAPI` · **Skills:** be-api-design §11 · be-architecture §9

Tasks:
1. Add `drf-spectacular`; `@extend_schema` on every view (GETs first, then writes) — function-based views need explicit annotations.
2. Serve `/api/schema` (+ Swagger UI at `/api/schema/docs`); exempt from origin middleware like the health endpoints (read-only docs, no auth).
3. CI step: schema generation must exit 0 (catches annotation rot).
4. **Route-manifest test:** a data-driven test asserting (a) every feature route is mounted, (b) within each feature's `urls.py`, static paths precede parameterized ones (mechanizes the `videos/providers` pitfall from the skill).
5. Note for later (out of backend scope): frontend types can be generated from this schema.

**Gate:** schema renders; manifest test green; CI schema step passes.

---

### Phase 11 — Docs & Profile Sync
**Branch:** `Docs/BackendAlignment` · **Skills:** core-project-profile · be-config-and-secrets §8 · be-architecture §7

Tasks:
1. Finalize `PROJECT_PROFILE.md` with values learned in Phases 1–10 (commands, thresholds, retention days, cache namespaces, throttle rates).
2. `backend/README.md`: new sections — health endpoints, throttling rates + 429 semantics, caching layers + invalidation, jobs/cleanup + cron, CI gates; env table rows (`AUTH_EVENT_RETENTION_DAYS`, optional `REDIS_URL`); endpoint table updated (`{items}` shapes, 429/400 rules, health routes).
3. `features/README.md` rules gain: the services rule, the envelope rule, the cache/invalidation rule, the throttle rule; the folder contract gains `services.py`.
4. `docs/08-backend-architecture.md`: new sections (observability, caching, jobs) cross-linked; the feature table gains services info.
5. Feature READMEs touched by phases get their "gotchas" updated (catalog caching, enroll counter, `{items}` shapes).

**Gate:** no doc statement contradicts the code (spot-check pass).

---

### Phase 12 — Final Verification & Release
**Branch:** merge `Refactor/BackendSkills` → `main` · **Skills:** core-verification-and-quality-gates §5, ops-deployment-and-ci §6

Tasks:
1. Full gate sweep: ruff, `check`, `makemigrations --check`, `migrate`, `test`, `check --deploy` (prod env), `pip-audit`, `gitleaks` — all green, results recorded.
2. **Parity sweep:** re-curl every GET endpoint; diff vs the Phase 0 baselines — every diff must be one of the documented Phase 8 shape changes, nothing else.
3. Query-count table before→after for the 8 guarded endpoints.
4. Offline smoke: fresh clone → `seed_demo` → runserver → catalog with Origin (cache miss → hit) → admin editor write → catalog invalidation → token mint → playlist/key/segment via the mocked-provider offline path.
5. Merge base → `main` via PR; delete phase branches; tag (`backend-skills-v1`); refresh `REPORT.md` with the audit summary and open items.

**Rollback:** every migration additive; revert = re-deploy the previous commit. No destructive schema steps introduced.

---

## 5. Explicitly out of scope (recorded triggers, not tasks)
| Item | Why deferred | Trigger to revisit |
| :--- | :--- | :--- |
| Redis mandatory | locmem + short TTLs suffice at current scale | multi-instance prod, or global throttle correctness |
| DB-level catalog filtering | catalog is tiny; cached build is O(1) after warm | catalog > ~2k rows |
| MFA for admin | accounts are Firebase-issued | policy decision |
| Celery/RQ | single-dev team, one scheduled command, ingest is manual + guarded | real queue volume appears |
| Search engine upgrade (`pg_trgm`/full-text) | `?q=` matches small cached lists | catalog growth |
| Frontend-wide refactor | this plan is backend-scoped | separate plan |

## 6. Risks & mitigations
| Risk | Mitigation |
| :--- | :--- |
| Django 6.1 / Python 3.14 bleeding edge (be-auth §9 soak rule) | CI pins the same versions; `pip-audit`; no version bump attempted |
| Throttle counters per-instance on Vercel | documented; generous scopes; Redis upgrade path pre-built |
| Locmem cache is per-instance | only public/short-TTL data cached; version-bump invalidation self-heals within TTL |
| Contract wrap breaks the SPA | same-phase frontend updates + both suites green + fetcher-seam isolation |
| Progress-flusher threads on serverless | already guarded (`IS_SERVERLESS_RUNTIME` + FFmpeg host guard) — untouched |
| `CONN_MAX_AGE=0` on self-hosted | env-driven value added in Phase 4 (0 on Vercel, 60 elsewhere) |

## 7. Execution order
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12
(Phases 2 and 3 are mutually independent; everything else is sequential — caching → catalog → query guards build on each other, and the envelope wrap needs the services layer to exist.)
