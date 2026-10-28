# Phase 4 — Cache Layers & Compression (result)

Branch: `Perf/Caching` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/common/cache.py` (new) | The one cache-aside helper: `cached(namespace, digest, loader)` — keys `kh:<ns>:v<version>:<digest>`, ±10% TTL jitter over `DEFAULT_TTL_SECONDS=300`, a sentinel so a cached `None` reads as a hit, and one `cache miss` JSON log line per miss (namespace + key + request id) — the observable hit ratio. `bump_version(namespace)` invalidates a family by moving the version inside the key (no scans); `param_digest` is a deterministic, order-insensitive params digest. |
| `backend/features/common/http_cache.py` (new) | `etag_response(request, data, …)`: strong ETag from a canonical dump + `Cache-Control` (`public, max-age=30, s-maxage=300, stale-while-revalidate=600` default; short + `must-revalidate` for `/api/auth/config`; `private, no-store` mode available), and a 304 short-circuit on `If-None-Match`. The comparison strips the `W/` weak marker **GZipMiddleware adds** when it compresses a strong ETag — verified live (gzip → `W/"…"` echoed → 304). 200 bodies still render through DRF exactly as before. |
| `backend/features/common/cache_invalidation.py` (new) | The model→namespace registry (courses, scholarships, events, competitions, the five home-rail models, FilterGroup/FilterOption) + `connect()` attaching `post_save`/`post_delete` receivers that bump versions inside `transaction.on_commit`. One write path covers every editor: admin console, `seed_demo`, and commands all go through save/delete. |
| `backend/features/common/apps.py` | `CommonConfig.ready()` connects the invalidation receivers. |
| `backend/config/settings.py` | `GZipMiddleware` (after SecurityMiddleware); `CACHES` = LocMem default with an optional `REDIS_URL` → django-redis block (documented, **not installed** — the env var warns loudly if set without the package); `CONN_MAX_AGE = env_int("DJANGO_CONN_MAX_AGE", 0 if IS_VERCEL else 60)` for both DB blocks. |
| `backend/config/middleware.py` | `PrivateCacheMiddleware`: `Cache-Control: private, no-store` on the per-user/privileged prefixes (`/api/dashboard/`, `/api/auth/me`, `/api/auth/sessions`, `/api/admin/`, `/api/videos`, `/api/stream`), `setdefault` so explicit headers win. |
| `backend/config/logging.py` | The formatter's whitelist (now `_FIELDS`, single source) gains `cache_ns`/`cache_key`; the dead duplicate tuple is gone. |
| Cached views | `catalog_list` (params digest) + `catalog_detail` (slug; `None` cached as a short-lived negative entry) + `catalog_filters_view` (surface+tab) under ns `catalog`; `home_view` under `home`; `events_list` / `competitions_list` under their own ns. `auth_config` is headers-only (no DB). Each view keeps a `build_*`/`_*_data` module function holding the **exact** previous body — handlers stayed thin. |
| `backend/README.md` | "Caching" section (layers, invalidation contract, private no-store) + `DJANGO_CONN_MAX_AGE`/`REDIS_URL` env rows. |
| Tests (+13 → **407**) | Cache helper: miss-then-hit, version bump invalidates, cached-None is a hit, one greppable miss line, order-insensitive digest. Catalog HTTP cache: header shape, 304 on revalidate, warm 200 = `assertNumQueries(0)`, cached 404, editor write invalidates via `captureOnCommitCallbacks`, gzip response. Config: no-store on every private prefix, public paths untouched. |

## The gate, proven

- **Second identical catalog request = zero queries**: warm 200 with `assertNumQueries(0)`, and the 304 path likewise (the ETag computes from cached data).
- **304 verified**: plain echo (strong) and the gzip-weakened `W/"…"` echo both answer 304.
- **Hit ratio observable**: every miss logs `{"msg": "cache miss", "cache_ns": …, "cache_key": "kh:catalog:v1:…"}`; hits log nothing.

## Live smoke (dev server)

- First `GET /api/catalog` → 200 with `ETag` + full public `Cache-Control`; one cache-miss line in the log.
- Same request + `If-None-Match` → **304 Not Modified**, no new miss line.
- `Accept-Encoding: gzip` → `Content-Encoding: gzip`, `Vary: Accept, Accept-Encoding, origin`; the weakened ETag still 304s on echo.
- `/api/auth/me` (401) and `/api/dashboard/summary` (404) carry `Cache-Control: private, no-store`.

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes.
- `test -v2 --parallel` → **407 tests OK**.
- Parity: **23/23** GET snapshots identical — payload bytes go through the same DRF renderer; only headers changed for non-caching clients.

## Notes for later phases

- The catalog engine itself is still O(total) per **miss** (Phase 5 reworks it into `build_items()` + constant-query filtering); the cache bounds the *repeat* cost today.
- `REDIS_URL` is intentionally package-less: adding `django-redis` to `requirements.txt` is a one-line deploy decision, and the settings block is already written.
- LocMem counters/keys are per-instance; multi-instance deploys need the Redis switch (recorded in the master plan's risks).
- Negative caching for detail 404s lives under the same 300 s TTL + version bump — an editor publish instantly un-404s a slug.
