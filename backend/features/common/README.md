# Common — الأنماط المشتركة

The lowest layer every feature app imports: shared choices, serializers, errors,
cache + HTTP-cache helpers, throttling, the test kit — and the **maintenance
job** (one model, one command, one endpoint). Feature apps depend on this
package; it depends on no feature.

## What lives here

| File | Provides | Used by |
| :--- | :--- | :--- |
| `choices.py` | Every enum-style `TextChoices` (course levels, scholarship statuses, notification types…) | every feature's `models.py` |
| `serializers.py` | `compact(**fields)` — drops empty/`None` keys; `as_number(Decimal)` — Decimal → float | every feature's serializers |
| `errors.py` | `api_exception_handler` — the DRF exception handler named in `settings.py` | the project |
| `cache.py` | Namespaced app cache with version keys (`cached`, `bump_version`) | catalog, home, dashboard |
| `cache_invalidation.py` | Model write → `bump_version` receivers, **on_commit** only | `apps.py` |
| `http_cache.py` | `etag_response` — strong ETag + `Cache-Control` + 304 short-circuit | catalog, auth config |
| `throttling.py` | `SCOPED_RATES` + the scoped throttle classes | `settings.py`, auth views |
| `messages.py` | Arabic user-facing message strings | serializers, errors |
| `testing.py` | `api_client()`, `ApiTestCase`, `make_user/make_course/…` factories | every feature's tests |
| `models.py` | `UUIDModel`, `TimeStampedModel` (abstract bases) + **`MaintenanceRun`** (concrete, below) | every feature's models |
| `maintenance.py` | The `cleanup_expired` job service (below) | command + admin endpoint |

## Rules

- **One source of truth for choices.** A value like `fully_funded` is declared
  once here and imported; never re-typed as a literal in a model.
- **No feature imports at module load.** `common` is imported by every feature,
  so it must not import `features/*` at module scope. Feature models are
  imported lazily inside functions (see `maintenance.py`) — Django resolves
  app-label strings (`"accounts"`) in FKs so models never need the import.
- **Migrations live here now.** `common` is an installed Django app
  (`INSTALLED_APPS` in `config/settings.py`); its only concrete model is the
  maintenance ledger below. Anything that grows a second table should probably
  move to the feature that owns it.
- **Run DB writes inside the atomic block, signals' effects after commit.**
  The pattern in `cache_invalidation.py` (`transaction.on_commit`) is the
  project rule; `OnCommitDisciplineTests` in `tests.py` pins it.

## The maintenance job (`maintenance.py` + `cleanup_expired`)

Sweeps four dead-weight families — expired `StreamToken`s, `UploadSession`s
stale past 7 days, expired `DriveAuthState`s, `AuthEvent`s past
`AUTH_EVENT_RETENTION_DAYS` (env, default 180) — in **chunks of 500, one
transaction per chunk**. Idempotent: deleting an already-deleted row deletes
nothing, so re-runs converge. An overlap guard (the newest still-`running`
`MaintenanceRun`, younger than 60 min) makes a concurrent second run exit 0
with `skipped, still running`; every run leaves its per-family delete counts
on its `MaintenanceRun` row (`trigger` = command | endpoint | cron).

Two ways to schedule it:

- **Self-hosted** — `python manage.py cleanup_expired` on cron, every 6h:
  `0 */6 * * *  cd backend && .venv/bin/python manage.py cleanup_expired`
- **Vercel** — `backend/vercel.json` schedules
  `GET /api/admin/maintenance/cleanup` daily (03:00 UTC; Hobby-plan crons run
  at most once per day — self-hosted cron is where the 6h cadence belongs);
  Vercel attaches `Authorization: Bearer $CRON_SECRET`, which
  `CronSecretAuthentication` (`features/auth/authentication.py`) verifies
  against `MAINTENANCE_CRON_SECRET` (accepts `CRON_SECRET` as a fallback env
  name). The endpoint (in `features/adminconsole`) also accepts a staff
  session bearer; anything else is 401/403. See
  [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md).

## Importing

```python
from features.common.choices import CourseLevel
from features.common.serializers import compact, as_number
```

## Related

- Feature map: [`../README.md`](../README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
