# Phase 9 — Background Jobs, Cleanup & Idempotency (result)

Branch: `Server/Jobs` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

**444 tests OK** (was 433 — +11), serial and `--parallel`. Ruff/format clean,
`makemigrations --check` clean, `check --deploy` unchanged (the dev-accepted
warning set). Live smoke on the dev DB: all four endpoint paths verified with
curl, the command run twice idempotently, and the run ledger (`MaintenanceRun`)
shows every execution.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/common/choices.py` | `MaintenanceRunStatus` (`running`/`done`/`error`). |
| `backend/features/common/models.py` + `migrations/0001_initial.py` | **`MaintenanceRun`** — the overlap marker *and* the audit row: `trigger` (command \| endpoint \| cron), `status`, `started_at`, `finished_at`, `deleted` (JSON per-family counts), `error`. Common is now a migrated app (`0001_initial`); its only concrete table. |
| `backend/features/common/maintenance.py` (new) | The job service. `expired_families(now)` returns the four dead-weight querysets (**model imports stay inside the function** — `common` must not import features at module load). `_delete_chunked` deletes in **chunks of 500, one transaction per chunk** so a backlog never holds one long transaction. `run_cleanup(trigger)` returns the status body: overlap guard first (newest still-`running` row younger than `RUNNING_GRACE_MINUTES`=60 → `{"id", "status": "skipped"}`), else a `MaintenanceRun` row is created, the four families swept, and `{id, status: "done", deleted}` returned — with the row flipped to `error` (message truncated to 500 chars) if anything raises. |
| `backend/features/common/management/commands/cleanup_expired.py` (new) | `python manage.py cleanup_expired` — self-hosted cron entry (every 6h). Overlap prints `skipped, still running` and **exits 0** (an overlap is the guard working, not a failure). Docstring carries the cron line and the Vercel story. |
| `backend/features/auth/authentication.py` | **`CronSecretAuthentication`** — `hmac.compare_digest` on the bearer against `MAINTENANCE_CRON_SECRET`; a match authenticates as `(None, "cron")` (the marker the view gates on); anything else **falls through** (returns `None`) to `AccessTokenAuthentication`. It must run *first* on its view: token auth raises on a foreign bearer, so a wrong secret must never reach it as "its" token. `authenticate_header` returns `"Bearer"` so DRF keeps a failed credential at **401** — the first authenticator otherwise advertises no scheme and DRF coerces 401→403 (found live in smoke, see below). |
| `backend/features/adminconsole/views.py` + `urls.py` | **`/api/admin/maintenance/cleanup`** (`GET`+`POST`, 202): explicit dual gate — `request.auth == "cron"` or `request.user.is_staff`; anything else `PermissionDenied` (403 `permission_denied`). Response is the run's status body: `{"id", "status": "done", "deleted": {...}}` — 202 per the job pattern (status resource immediately; the work itself is inline chunked deletes, nothing to poll). |
| `backend/config/middleware.py` | The cleanup path joins `EXEMPT_PATHS` — platform crons send no `Origin`; they authenticate with the secret instead (same reasoning as the Drive OAuth callback). |
| `backend/config/settings.py` | `AUTH_EVENT_RETENTION_DAYS` (env, default 180) and `MAINTENANCE_CRON_SECRET` (accepts Vercel's `CRON_SECRET` fallback; unset = cron path dead, staff-only). |
| `backend/vercel.json` | `crons`: `/api/admin/maintenance/cleanup` at `0 */6 * * *`. Vercel auto-attaches `Authorization: Bearer $CRON_SECRET` when that project env var exists. |
| Docs | `features/common/README.md` rewritten (the "no models, no migrations" rule is gone — common is an app with one table; the job, both cron paths, and the lazy-import rule documented). `docs/07-backend-contract.md`: the endpoint row in the admin table. `features/videohosting/README.md`: the ingest retry policy (idempotent `get_or_create` by slug, failures land on the row as `status=error` + `error_message`, the re-run is the retry; Django admin filters by `status`/`provider` — verified present). |
| Tests (+11 → **444**) | `CleanupExpiredTests` (sweeps the 4 families, keeps fresh rows; **twice → identical state**; the service body counts each family), `OverlapGuardTests` (a live marker skips *without deleting*; a stale marker doesn't block), `MaintenanceEndpointTests` (staff 202/`done`/trigger=endpoint; cron secret 202/`done`/trigger=cron; wrong secret → **401** `token_invalid`; student 403; anonymous 403 `permission_denied`), `OnCommitDisciplineTests` (enroll counts in-transaction but bumps the catalog version only on commit; a re-enroll neither recounts nor re-bumps). |

## Notable decisions

- **`common` gained its first table.** The overlap guard needs durable state,
  and `common` is the one place both the command and the endpoint can share.
  The rule "no models, no migrations" is replaced by "one table, everything
  else abstract" — the README now says so.
- **Lazy feature imports in `maintenance.py`.** `common` sits under every
  feature; importing `features.videohosting.models` at module load would cycle
  or force import order. Inside the function, Django is fully loaded.
- **Cron auth as a fall-through authenticator, not a check in the view.**
  Vercel's `Bearer $CRON_SECRET` cannot hold a session, and token auth *raises*
  on bearers it can't decode — so the secret check must happen before token
  auth, per-view (`authentication_classes` on the one endpoint), never in
  `DEFAULT_AUTHENTICATION_CLASSES`.
- **202, not 200.** It's a job trigger: the caller gets a status resource
  (the `MaintenanceRun` id) immediately. The work is inline because chunked
  deletes of the expected volumes finish well inside a serverless runtime;
  if volumes ever outgrow that, the endpoint already returns the shape a
  worker-backed version would poll.
- **401 found in smoke, not in tests.** The wrong-secret case first answered
  403 with `code: token_invalid`: DRF coerces 401→403 when the view's first
  authenticator returns no `authenticate_header` — and `CronSecretAuthentication`
  sat first. Advertised `Bearer` on it (2 lines) and pinned the status in the
  test, so a bad credential reads 401 like on every other endpoint.

## Live smoke (dev server, dev DB)

`MAINTENANCE_CRON_SECRET=smoke-secret python manage.py runserver` after
`python manage.py migrate` (first attempt 500'd on the not-yet-applied
`common.0001` — expected; migrated and re-ran):

- `POST /api/admin/maintenance/cleanup` anonymous → **403** `permission_denied`.
- Same with `Authorization: Bearer wrong` → **401** `token_invalid`.
- `GET` with `Bearer smoke-secret` → **202** `{"id": …, "status": "done",
  "deleted": {…, "driveAuthStates": 6, …}}` — six real expired Drive states
  swept from the dev DB.
- `POST` again with the secret → **202** `done`, all counts 0 (idempotent).
- `python manage.py cleanup_expired` twice → `cleanup done`, zero deletions
  the second time. `MaintenanceRun` ledger afterwards: `cron`, `cron`,
  `command`, `command` — all `done`.

## Gates

| Check | Result |
| :--- | :--- |
| `ruff check .` / `ruff format --check .` | clean |
| `makemigrations --check --dry-run` | no drift |
| `check --deploy` | unchanged (dev-accepted warnings) |
| `manage.py test` | **444 tests OK** (38.9 s) |
| `manage.py test --parallel` | **444 tests OK** (6.6 s) |
| gitleaks | pending (pre-commit) |

## Notes for later phases

- Phase 10 should expose `/api/admin/maintenance/cleanup` in the OpenAPI
  schema; the 202 body (`{id, status, deleted}`) is ad-hoc JSON today — if the
  schema pass wants a typed response, a tiny serializer in `features/common`
  is the natural home.
- `MAINTENANCE_CRON_SECRET` must be set (as `CRON_SECRET` or itself) in the
  live Vercel project env for the cron to authenticate; unset, the schedule
  answers 401 every run and the `MaintenanceRun` ledger stays empty.
- `RUNNING_GRACE_MINUTES` (60) vs the 6h schedule: a crashed run self-heals
  within one window; no watchdog needed.
