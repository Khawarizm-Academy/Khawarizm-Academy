# Khawarizm Academy · Backend

A small **Django + Django REST Framework + SQLite** service that owns all data the frontend renders. It is organised as one app per product feature, mirroring `frontend/src/features/`. The API speaks the exact camelCase shapes the UI expects.

## Stack

| | |
| :--- | :--- |
| Framework | Django 6.1 |
| API layer | Django REST Framework 3.18 (function-based views) |
| CORS | `django-cors-headers` (frontend origin allow-list) |
| Database | SQLite locally · Postgres on Vercel when `DATABASE_URL` is set |
| Auth | Firebase ID-token verification + HS256 access tokens with rotating refresh sessions (`accounts.User`) |
| API contract | drf-spectacular — OpenAPI at `/api/schema`, Swagger UI at `/api/schema/docs` |
| Video data plane | Telegram or private Google Drive; Django remains the metadata/control plane |

## Layout

```text
backend/
├── config/                     project wiring and typed settings
├── features/                   one app per product feature
│   ├── common/                 shared models, choices, cache, commands
│   ├── auth/ · access/         identity, sessions, canonical permissions
│   ├── courses/ · studio/     course domain and model-less authoring API
│   ├── adminconsole/           staff APIs and role/content management
│   └── videohosting/           provider registry, ingest, HLS/raw control plane
├── requirements.txt
├── .env.development
└── .env.production
```

## Run it

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API is at `http://127.0.0.1:8000/api/`. Docker and the normal Firebase/database environment setup remain as previously documented in this file. On Vercel, use Postgres for durable writes; the serverless runtime is the video control plane only and cannot run FFmpeg or retain an upload spool.

## Video hosting

The video feature is provider-driven. `google_drive`, `telegram`, `youtube`, `vimeo`, and `external` are registry entries. Storage providers expose source/upload capabilities; link providers create safe `embed`/`external` grants. The backend does not return provider credentials, Drive upload-session URIs, Telegram upload URLs, or raw private provider links.

### Provider policy

`VideoSystemConfig.use_ffmpeg` is a typed, persisted global toggle; each storage provider also has `packagingPolicy: auto|always|never`. The resolver combines request choice, provider policy, global toggle, and host capabilities before storing bytes.

- Telegram raw fallback is **not supported**. S-1 found hosted Bot API download limits and expiring file URLs unsuitable for general lesson playback. Telegram Studio requires a persistent writable `VIDEO_SPOOL_DIR` and a persistent FFmpeg-capable host. If packaging cannot run, the plan fails with `provider_requires_packaging` before a new source is stored; new Telegram uploads do not remain staged indefinitely.
- Drive HLS is **not** the v1 origin (S-2). Drive stores private source files under the OAuth user grant and serves raw media through the gated backend proxy with bounded `Range` reads. Studio uses a 4 MiB binary relay chunk (16 × Drive’s 256 KiB alignment); provider offsets are probed and resumed authoritatively.

Relevant typed settings and defaults:

| Variable | Purpose |
| :--- | :--- |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram ingest credentials |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_STREAM_TOKEN` / `TELEGRAM_CHANNEL_ID` | upload bot, read-only redirect bot, storage channel |
| `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET` | backend-only OAuth client |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` / `GOOGLE_DRIVE_OAUTH_REDIRECT_URI` | private Drive folder and registered callback |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | default `google_drive` |
| `VIDEO_HOSTING_USE_FFMPEG` | boolean, default `true` |
| `VIDEO_UPLOAD_MAX_BYTES` | 2 GiB source cap |
| `VIDEO_UPLOAD_CHUNK_BYTES` | 4 MiB relay chunk |
| `VIDEO_USER_QUOTA_BYTES` | 20 GiB per user; `videos.manage_any` exempt |
| `VIDEO_SPOOL_DIR` | persistent absolute writable directory for Telegram Studio uploads |
| `VIDEO_RAW_RANGE_CAP_BYTES` | 8 MiB per raw range by default |
| `VIDEO_RAW_MAX_CONCURRENT` | 4 raw streams per process by default |
| `STREAM_TOKEN_TTL_HOURS` / `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | 6-hour normal / 30-minute preview grants |
| `VIDEO_EMBED_ALLOWED_HOSTS` | default `youtube-nocookie.com,vimeo.com` |

### Secret and cache rules

Stream tokens are IP-bound, expiring grants; only SHA-256 hashes are persisted. HLS playlists retain `__TOKEN__` placeholders and are rewritten per request. HLS manifests, keys, captions, Studio, admin, and raw responses are private/no-store as applicable. Raw Drive responses are finite `206` ranges; malformed ranges are rejected and concurrent raw streams are bounded. HLS segment requests return a redirect to provider ciphertext rather than proxying bytes.

### Current video routes

All paths below are relative to `/api/`; route ownership is `videohosting` unless noted.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/videos/providers` | Authenticated registry (`results`). |
| `GET` · `POST` | `/videos/:slug` · `/videos/:slug/token` | Entitlement-filtered metadata and playback grant minting. |
| `POST` | `/courses/:slug/lessons/:lesson_id/playback` | Lesson-linked grant plus resume/next-lesson data. |
| `GET` | `/videos/:slug/raw?token=...` | Gated Drive raw Range proxy. |
| `GET` | `/stream/:token/{captions/:lang.vtt,master.m3u8,:quality/index.m3u8,key/:quality,:quality/:index.ts}` | Caption, HLS playlists/key, and provider segment redirect. |
| `GET` · `POST` | `/studio/video-providers`, `/studio/videos` | Studio provider rows and paged library/create. |
| `POST` | `/studio/videos/link` | Create validated embed/external asset. |
| `PATCH` · `DELETE` | `/studio/videos/:asset_id` | Edit title/poster or delete an unlinked owned asset. |
| `POST` · `DELETE` | `/studio/videos/:asset_id/captions[/:language]` | Create/delete WebVTT tracks (512 KiB max). |
| `POST` | `/studio/videos/:asset_id/upload` | Start provider upload session; returns no upload URI. |
| `PUT` · `GET` · `DELETE` | `/studio/uploads/:session_id/chunk`, `/studio/uploads/:session_id` | Send a strict `Content-Range` chunk, poll offset, or cancel. |
| `POST` | `/studio/uploads/:session_id/complete` | Complete and return the asset row. |
| `PUT` | `/courses/:slug/lessons/:lesson_id/progress` | Persist bounded lesson heartbeat progress. |
| `GET` · `POST` | `/admin/video-providers`, `/admin/video-providers/:code/policy` | Provider gate/policy (`videos.configure`). |
| `GET` · `POST` | `/admin/video-assets` | Paged global assets or registration (`videos.manage_any`). |
| `POST` | `/admin/video-assets/upload` | Multipart upload → `202`, real-server worker, poll detail. |
| `GET` · `DELETE` | `/admin/video-assets/:id` | Tracker detail or deletion with published-link protection. |
| `GET` · `POST` | `/admin/video-system-config` | Read/update the FFmpeg toggle. |
| `GET` | `/admin/video-diagnostics?deep=true` | Shallow checks, or opt-in live provider probes. |
| `GET` | `/admin/video-drive/oauth/start` · `/status` | Start consent or inspect account/status only. |
| `GET` · `POST` | `/admin/video-drive/oauth/callback` · `/disconnect` | Public callback / admin revoke-and-delete. |

Studio responses are authenticated and `private, no-store`. `videos.manage_own` scopes owned assets; `videos.manage_any` is the elevated global path. `videos.upload`, `videos.use_embed`, `videos.package`, `videos.watch_any`, and `videos.configure` are separate canonical permissions; `administrator` implies the catalog.

### Validation status and legacy data

S-3’s fake-transport tests cover Drive resumable protocol behavior, 4 MiB alignment, offset probing, retry, and expiry semantics. No real Google OAuth account was used, so live Drive OAuth/upload/raw-playback acceptance remains an outstanding external acceptance; it must not be reported as passed. Migration `0010` backfills legacy HLS/Drive modes and only unambiguous lesson links. `manage.py package_pending` recovers stale `processing`/legacy `staged` rows only when a persistent spool and provider source-download hook are available; it forces HLS, uses a run lock, skips unsupported/no-source rows, and redacts provider URIs in errors. New unsupported Telegram plans still fail before storing a source.

## Endpoints outside video hosting

The rest of the auth, catalog, course, dashboard, admin, health, caching, hardening, observability, and cleanup endpoint documentation remains in this README and the linked numbered guides. Errors retain `{detail,code,fields?}` and list payloads remain wrapped.

## Related

- Feature map: [`features/README.md`](features/README.md)
- Contract: [`../docs/07-backend-contract.md`](../docs/07-backend-contract.md)
- Architecture: [`../docs/08-backend-architecture.md`](../docs/08-backend-architecture.md)
- Video feature: [`features/videohosting/README.md`](features/videohosting/README.md)
