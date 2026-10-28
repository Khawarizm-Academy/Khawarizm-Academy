# Phase 10 — OpenAPI & Route Manifest (result)

Branch: `Docs/OpenAPI` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

**451 tests OK** (was 444 — +7 net), serial and `--parallel`. Ruff/format clean,
`makemigrations --check` clean, and the schema generates with **zero warnings**
under `--fail-on-warn`: **62 paths, 72 operations, 72 unique operationIds**.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/requirements.txt` | `drf-spectacular==0.30.0` (runtime dep — the schema endpoint serves requests). |
| `backend/config/settings.py` | `drf_spectacular` in `INSTALLED_APPS`; `DEFAULT_SCHEMA_CLASS` → `features.common.schemas.ContractAutoSchema`; `SPECTACULAR_SETTINGS` (title/description/version, `COMPONENT_SPLIT_REQUEST`, `SERVE_INCLUDE_SCHEMA=False`, public `SERVE_PERMISSIONS`). |
| `backend/config/urls.py` | `/api/schema` (`SpectacularAPIView`) + `/api/schema/docs` (Swagger UI). Declared **before** the feature mounts, by the same static-before-parameterized rule — `docs` must never read as a path parameter. |
| `backend/config/middleware.py` | Both schema paths join `EXEMPT_PATHS`: read-only docs with no auth, fetched by browsers and curl scripts that send no `Origin` (same reasoning as the Drive callback — the protection is the read-only surface, not the gate). |
| `backend/features/common/schemas.py` (new) | **`ErrorSerializer`** — the one error envelope `{detail, code, fields?}` as a component; **`ENVELOPE_STATUSES`** = `400/401/403/404/429` (the statuses `api_exception_handler` answers with the envelope on *any* operation); **`ContractAutoSchema`** — an `AutoSchema` whose `_get_response_bodies` appends the envelope component to every operation that didn't declare that status itself, so 65 handlers share one `Error` component instead of 65 copies. |
| `backend/features/auth/schema.py` (new) + `apps.py` | Two `OpenApiAuthenticationExtension`s — `sessionAuth` (the SPA's `Bearer <access>`) and `cronAuth` (the maintenance cron's secret) — registered by import side effect from `AuthConfig.ready()`. Without them every operation warns "could not resolve authenticator". |
| Every view module (12 files, 72 decorated operations) | `@extend_schema` on **all** FBVs: `catalog` (3), `home` (1), `events` (1), `competitions` (1), `scholarships` (3), `courses` (8), `dashboard` (6), `profile` (2), `auth` (7), `adminconsole` (19), `videohosting` (8), `videohosting/console` (13). Public views pin `auth=None`; playback/media types are declared per media type; throttled and gated operations carry the endpoint-specific statuses (`429` login lockout, `409` not-ready/upload-in-progress, `413` too large). |
| `backend/config/sqlite_backend/` (new) | The SQLite engine used by the non-`DATABASE_URL` path: the built-in engine plus a `clone_test_db` that checkpoints the WAL before the parallel runner copies the test DB file (otherwise clones miss the parent's migrations). See the flake note below. |
| `backend/features/videohosting/ingest.py` | The tracker's flush loop swallows `OperationalError` on its best-effort progress writes (retries next tick) instead of dying — under the parallel suite a busy lock could previously kill the thread. |
| `.github/workflows/backend.yml` | New CI step: `spectacular --fail-on-warn` — a rotting annotation (renamed serializer, dropped param) now breaks the build instead of silently degrading the spec. |
| `backend/config/tests.py` (+7 classes) | **`SchemaEndpointTests`** (YAML content-type + a known `operationId` present, Swagger page is HTML, the `Error` component and every envelope status appear in the spec), **`OriginGateStillEnforcedTests`** (no-Origin → 403 on a real endpoint; allowed Origin → 200 — the exemptions didn't open the API), **`MountedRoutesTests`** (19 pinned `(urlconf, path, url_name)` rows — an accidental unmount fails loudly), **`StaticBeforeParameterizedTests`** (walks all 13 urlconf modules; an earlier parameterized sibling that regex-matches a later static route fails with the exact shadowing pair — mechanizes the `videos/providers` pitfall). |

## Notable decisions

- **The parallel-suite flake forced a SQLite engine fix (found in the first
  CI run).** CI's `--parallel` crashed with `cannot pickle 'traceback'
  object`: the admin-upload test's poll loop (a read every 50 ms) starved the
  ingest worker-thread's writes on SQLite past the busy timeout —
  `database table is locked` — and the runner then died trying to serialize
  the failure. Fixed in three layers:
  1. **WAL + `busy_timeout` + `IMMEDIATE`** on the SQLite connection
     (`config/settings.py`): readers and the one writer proceed side by side,
     so poll reads can't starve the ingest thread; `IMMEDIATE` takes the write
     lock at `BEGIN` so a transaction never dies halfway on an upgrade (which
     the timeout doesn't retry).
  2. **`config/sqlite_backend/`** — a `DatabaseWrapper` subclass of the
     built-in sqlite3 engine whose `clone_test_db` runs
     `PRAGMA wal_checkpoint(TRUNCATE)` before the runner's file copy. Without
     it, the parent's just-run migrations still sit in the `-wal` sidecar and
     every parallel clone starts without its tables (`no such table` in
     random workers — hit and reproduced while testing fix 1).
  3. **The ingest tracker's flush loop treats a lock timeout as
     best-effort** (`features/videohosting/ingest.py`): a failed progress
     write retries next tick instead of killing the thread; the terminal
     state comes from the ingest path itself.
  Verified with 8 consecutive `--parallel` runs (451 OK, zero lock errors,
  zero flusher deaths) plus the serial suite.

- **The payload builders stay.** A Serializer-class refactor of the `compact()`
  dict functions was the tempting road; it would have churned every feature for
  schema niceness alone. Instead: **request bodies** (small, typed, stable) are
  declared with `inline_serializer`/`OpenApiTypes`, and **content responses**
  are documented as `OpenApiTypes.OBJECT` with the shape written into the
  response description (`{items: [...], totalResults, ...}`). The spec is
  truthful today; generating named frontend types from those content shapes
  remains a later-phase item (it needs real Serializer components, worth its
  own phase with the frontend in the loop).
- **One error component, appended centrally.** Views declare only what is
  *specific* to them (a `429` with `Retry-After`, a `409` conflict); the
  envelope statuses ride in via `ContractAutoSchema`, so a new endpoint is
  documented-correct by default and can't drift from `errors.py`.
- **`OpenApiResponse` takes no `media_type`.** Media types belong in the
  response dict key: `responses={("200", "video/mp2t"): ...}` — the playlist
  (`application/vnd.apple.mpegurl`), key (`application/octet-stream`), segment
  (`video/mp2t`), raw source (`video/mp4`), and the OAuth callback's
  `text/html` page are typed per media type, not per status.
- **Bodyless POSTs need explicit `request=None`.** Without it, spectacular
  falls back to guessing and warns "unable to guess serializer" for every
  action endpoint (apply, enroll, favorite, token mint, logout, revokes, the
  cleanup trigger). With it the operation is documented as having no body.
- **Multi-method FBVs use stacked per-method `@extend_schema`s.** A dict
  `request={"GET": None, "POST": ...}` documents fine but produces **one
  operationId per view** — spectacular then collides and suffixes numerals
  (`admin_users_1`, `admin_users_2`). Stacked decorators with
  `methods=[...]` and distinct ids (`admin_users_list` / `admin_users_create`,
  `profile_read` / `profile_update`, `admin_maintenance_cleanup_status` /
  `_trigger`, …) keep every operation named — which is the contract the
  frontend's generated clients would consume.
- **The `config/tests.py` accident — caught by the count, fixed by restore.**
  The manifest test was first written as a fresh file that silently overwrote
  the middleware/hardening tests that already lived there on the base branch;
  the suite dropped 444 → 417 (+7 new, −30 overwritten) and the diff against
  the Phase-9 tree (throwaway worktree at `2589a63`) showed exactly which
  classes vanished. The original 30 tests were restored from `2589a63` and the
  four new classes appended into the same module — **41 tests in `config.tests`,
  451 total**. Lesson for the plan: a suite-total sanity check against the
  previous phase's number is what surfaced it; keep running it.

## Gates

| Check | Result |
| :--- | :--- |
| `ruff check .` / `ruff format --check .` | clean |
| `makemigrations --check --dry-run` | no drift |
| `spectacular --fail-on-warn` | exit 0, **0 warnings** — 62 paths, 72 operations, 72 unique operationIds |
| `manage.py test` | **451 tests OK** (39.4 s) |
| `manage.py test --parallel` | **451 tests OK** (6.6–6.8 s, ×8 consecutive runs after the SQLite fix) |
| CI | `lint · checks · tests · audit` green (incl. the new schema step); Vercel backend preview green |

## Notes for later phases

- **Frontend types from the schema stay open.** Content responses are
  `object` + descriptions today; turning them into named components (and
  generating TS types for the SPA) needs Serializer components for the
  `compact()` payloads — deliberately deferred so this phase stays
  backend-only and additive.
- The spec is served at `/api/schema` (YAML) with Swagger UI at
  `/api/schema/docs` — both origin-exempt and public; if the deployment ever
  wants them private, the gate is `EXEMPT_PATHS` in `config/middleware.py`
  plus `SERVE_PERMISSIONS`.
- `PROFILE.md`/READMEs (Phase 11) should mention the two new CI steps
  (`spectacular --fail-on-warn`) and the schema URLs in the route tables.
- The mounted-routes rows in `config/tests.py` are the place to extend when a
  feature gains a mount (the test fails with a clear message until the row
  exists) — same data-driven contract as the feature README tables.
- The `config.sqlite_backend` engine and its WAL options apply to the SQLite
  path only; Postgres deployments (`DATABASE_URL`) are untouched. Phase 11's
  README/profile should carry the three facts: WAL options, the clone
  checkpoint, and the flusher's best-effort contract.
