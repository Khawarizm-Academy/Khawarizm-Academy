# Phase 2 — Observability & Health (result)

Branch: `Server/Observability` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/config/logging.py` (new) | `JsonConsoleFormatter` (one JSON object per line: `ts`, `level`, `msg`, `logger`, `request_id`, `user_id`, `path`, `status`, `duration_ms`, `db_ms`, `queries`; exceptions as `exc`), `RequestContextFilter` (contextvar → record), request-id/user-id contextvars with set/reset, `build_logging_config(DEBUG)` (root level DEBUG in dev / INFO prod; noisy loggers silenced: `django.server`, `django.db.backends`, `pyrogram` → WARNING), the `SLOW_DB_SECONDS = 0.3` / `MANY_QUERIES = 25` tripwire thresholds, `QueryCounter` (`connection.execute_wrapper` counting queries + DB seconds). The formatter whitelists fields — no secrets/request bodies can leak into logs (be-observability §2). |
| `backend/config/middleware.py` | `RequestIDMiddleware` — inbound `X-Request-ID` (8–64 printable chars) or minted `uuid4().hex`; stored on the request + contextvar; echoed as the response header; token reset per request. `RequestMetricsMiddleware` (new-style `__call__`) — wraps the inner stack in the query counter, reads DRF-propagated `request.user` (DRF's user setter writes the raw request), logs one line per request, WARNING when `queries > 25` or `db_ms > 300`; user-id contextvar reset in `finally` so nothing leaks across worker threads. |
| `backend/config/settings.py` | `MIDDLEWARE`: RequestID + Metrics right after CORS. `LOGGING = build_logging_config(DEBUG)`. |
| `backend/config/views.py` + `urls.py` | `/healthz` (liveness, zero dependencies) and `/readyz` (`SELECT 1` → 200 `{"database": "up"}` / 503 `{"database": "down"}`), both mounted at root, unauthenticated, exempt from the origin gate (also listed in `EXEMPT_PATHS` for explicitness). |
| `backend/docker-compose.yml` | healthcheck curls `/healthz` instead of `/`. |
| `backend/config/tests.py` | +11 tests: liveness shape; readyz 200 → 503 with a broken DB; inbound request id echoed, hostile value replaced, minted otherwise; one JSON line per request with request fields; escalation to WARNING on the query threshold; user-id context does not leak to the next request; filter + formatter unit tests. |

## Live smoke (dev server)

- `GET /healthz` → `{"status": "ok"}` (0 queries) · `GET /readyz` → `{"status": "ok", "database": "up"}` (1 query)
- `GET /api/catalog` with `X-Request-ID: parity-run-42` → response header echoes it; log line:
  `{"ts": "...", "level": "info", "msg": "request", "request_id": "parity-run-42", "path": "/api/catalog", "status": 200, "duration_ms": 4.1, "db_ms": 0.2, "queries": 2}`
- The catalog baseline reads **2 queries / 4.1 ms** per request — the recorded "before" for Phases 5/6.

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes.
- `test` → **381 tests OK** (370 + 11 new).
- Parity: **23/23** GET snapshots identical after the middleware change — zero behavior change to payloads.

## Notes for later phases

- The WARNING tripwire thresholds live in `config/logging.py`; Phases 5/6 read them as the target (constant queries, no WARNING on the hot paths).
- Log correlation with background jobs (ingest) can adopt the same contextvars when Phase 9 touches the command.
- Error tracking (Sentry-style) is intentionally deferred — no provider chosen yet; the structured lines make the hookup trivial later.
