# Phase 11 — Docs & Profile Sync (result)

Branch: `Docs/BackendAlignment` → PR into `Refactor/BackendSkills`. Date: 2026-10-29.

Docs-only phase: ten files, zero code. Every documented value was re-checked
against the code it describes — **27 automated fact checks pass**, plus a
stale-statement sweep (`grep` for "none yet", "to be added", "currently dead",
…) across the whole doc set: clean.

## What landed

### 1. `PROJECT_PROFILE.md` — the values learned in Phases 1–10

Every stale line from the pre-alignment draft is gone:

| Was | Now |
| :--- | :--- |
| §2 "Cache / queue: none yet" | The app cache (`features/common/cache.py`, namespaced versioned keys, 300 s ±10% TTL) + HTTP ETag layer; LocMem default, Redis via `REDIS_URL`; no task queue (threads + cron). |
| §3 checks line | Adds `check --deploy`, `spectacular --fail-on-warn`, and the test line with both counts (451 serial ~40 s / `--parallel` ~7 s, CI runs `test -v2 --parallel`). |
| §3 seed line | Adds `cleanup_expired` (idempotent, self-hosted cron 6 h). |
| §4 tests line | File-backed `/tmp` test DB **with WAL + per-worker clone files via `config.sqlite_backend`** — "do not revert" now names the mechanism. |
| §6 "Cache: none… Phase 4" | The real facts: namespaces `catalog`/`home`/`events`/`competitions`, `on_commit` version bumps via the `cache_invalidation` registry, ETag + `Cache-Control`. |
| §6 "enrolled_count is dead" | Fixed in Phase 6 — `courses/services.py::enroll` bumps it (`F()+1` inside the enrollment transaction). |
| §7 "CI pipeline to be added (Phase 1)" | The actual gate list: ruff check+format, `check`, `spectacular --fail-on-warn`, `makemigrations --check`, `migrate`, `test -v2 --parallel`, `check --deploy`, pip-audit, gitleaks; branch protection requires it. Plus the cron row (`0 3 * * *`, Hobby = at most once/day, 6 h is self-hosted) and the OpenAPI contract (`/api/schema` + `/api/schema/docs`, public, origin-exempt, drf-spectacular 0.30). |
| §8 SQLite TEST-DB line | The full WAL story in one pitfall: WAL + `busy_timeout=10000` + `IMMEDIATE`, the `config.sqlite_backend` engine, per-worker clone files — and *why* (the ingest worker thread + the parallel runner; the in-memory shared-cache default table-locks the ingest thread). |

### 2. `backend/README.md` — the operations surface

- **Stack table** gains the API-contract row (drf-spectacular, `/api/schema`,
  `/api/schema/docs`).
- **Env table** gains `AUTH_EVENT_RETENTION_DAYS` (default 180) and
  `MAINTENANCE_CRON_SECRET` (with the `CRON_SECRET` fallback name).
- **The gates table** gains the schema step (`spectacular --fail-on-warn`,
  "a rotting annotation breaks the build") and the test row now says what CI
  actually runs (`-v2 --parallel`) with the local timings.
- **Endpoints table** — the Phase 11 task list, row by row: the two schema
  routes (public, origin-exempt), `/admin/maintenance/cleanup` (202
  `{id, status, deleted}`, cron bearer), and the `{items: [...]}` shapes
  written onto exactly the rows that have them (problems, related, enrolled,
  sessions, notifications) while `/dashboard`, `/saved`, `/competitions` are
  marked single payloads. A paragraph under the table states the convention:
  lists ride in `{items}`, single payloads are flat camelCase, `/catalog`
  pagination keys are `totalResults`/`totalPages`/`currentPage`, every error is
  the `{detail, code, fields?}` envelope.
- **Hardening** now says the 429 body is the same error envelope
  (`code: "throttled" | "login_locked"`) + `Retry-After`, and that a new abuse
  surface gets a named scope in `SCOPED_RATES`, never a hand-rolled counter.
- **Caching** names the four namespaces.
- **New "Jobs & cleanup" section** — the one scheduled job, both triggers
  (self-hosted cron `0 */6 * * *`; Vercel daily `0 3 * * *` with the Hobby-plan
  once/day constraint), the four swept families, chunk-500/one-transaction
  discipline, idempotency, the overlap guard, and the `MaintenanceRun` ledger.

### 3. `backend/features/README.md` — the rules every feature follows

- **Folder contract** gains `services.py` ("business rules — mutating or
  multi-step ones") and the skip-rule now covers both directions: model-less
  features skip `models.py`, pure-read features (`catalog`, engine in
  `service.py`) skip `services.py`.
- **Rule 8** states the list-payload convention (`{items: [...]}` for problems,
  related, enrolled, sessions, notifications; flat objects otherwise; the
  catalog's pagination keys).
- **Four new rules (11–14):**
  - **11 — Business rules live in `services.py`**: the view resolves, calls
    one function, serializes; the service owns writes and the
    `atomic`/`on_commit` discipline. Names the five existing modules.
  - **12 — One error envelope**: every failure renders `{detail, code, fields?}`
    from `features/common/errors.py`; features raise coded exceptions, never
    hand-build error dicts.
  - **13 — Cache reads through `common.cache`, invalidation through the
    registry**: `cached()` only, and a model feeding `catalog`/`home` must be
    registered in `MODEL_NAMESPACES` in the same change.
  - **14 — Throttle abuse surfaces with a named scope**: `@scoped_throttle` +
    one row in `SCOPED_RATES`; 429 comes with the envelope and `Retry-After`.
- **Wiring step 5** mentions services + the throttle tag.

### 4. `docs/08-backend-architecture.md` — the architecture story

- The folder tree gains `services.py`.
- The feature table gains a **`services.py` — business rules** column (auth:
  sessions; courses: enroll with the counter bump; scholarships: apply/save;
  dashboard: summary assembly; adminconsole: account lifecycle + editor
  coercion; catalog marked as the `service.py` pure-read engine; videohosting
  noted as `ingest.py`/`packaging.py` — the domain's own file names).
- **Three new sections, cross-linked to `backend/README.md`**:
  **§8 Observability** (request-id at the edge, the metrics middleware and its
  thresholds `SLOW_DB_SECONDS = 0.3` / `MANY_QUERIES = 25` as the N+1
  tripwire, the field-whitelisting formatter),
  **§9 Caching** (the three layers and the on_commit invalidation contract),
  **§10 Jobs** (the idempotent, overlap-guarded cleanup and its two triggers).

### 5. Feature README gotchas

- **`common/README.md`** — the "What lives here" table gains the Phase 10
  `schemas.py` row (`ErrorSerializer`, `ENVELOPE_STATUSES`,
  `ContractAutoSchema`).
- **`catalog/README.md`** — the engine bullet gains the invalidation
  contract: a write to a watched model bumps the family version inside
  `transaction.on_commit`; there is no manual cache clearing anywhere.
- **`courses/README.md`** — the structure tree gains `services.py`; the
  mutations bullet now tells the full enroll story (get_or_create →
  `F()+1` on a new row only, same transaction, catalog cache bumped after
  commit, re-enroll is a no-op) and credits the services, not the view.
- **`scholarships/` / `dashboard/` / `adminconsole/README.md`** — the trees
  gain their `services.py` lines.
- **`videohosting/README.md`** — already carries the ingest-retry policy from
  Phase 10; no change needed.

## Gate — no doc statement contradicts the code

27 automated checks (values grepped out of `throttling.py`, `cache.py`,
`cache_invalidation.py`, `catalog/service.py`, `dashboard/services.py`,
`courses/services.py`, `schemas.py`, `settings.py`, `urls.py`, `middleware.py`,
`vercel.json`): all pass. One initial "failure" was the check script's own
string (`api/schema` is mounted at the root urlconf, so the browser path *is*
`/api/schema`). The stale-statement sweep across all ten touched files is
empty.

## Notes for Phase 12

- The docs now pin **451 tests** and the exact CI gate list — the final gate
  sweep must reproduce both.
- `docs/07-backend-contract.md` already carried the cleanup row and needed no
  change; the `{items}` shapes it documents are the ones the README table now
  shows.
- The profile's frontend-canonical line is still marked `(?)` — untouched
  (frontend is out of scope for the alignment).
