# 08 · Backend Architecture

How the Django service is organised and how the provider-backed video control plane fits the feature-first backend. Read this with [07 · Backend Contract](07-backend-contract.md); the source of truth for video routes is `backend/features/videohosting/urls.py`.

## 1. One feature = one app = one folder

The backend mirrors `frontend/src/features/`. Each feature owns its models, serializers, views, routes, admin, migrations, tests, and README. `studio` is model-less course authoring; it delegates to `courses`, `access`, and `videohosting`.

The video feature owns `VideoProvider`, `VideoAsset`, `VideoCaption`, `VideoRendition`, `VideoSegment`, `StreamToken`, `DriveGrant`, `DriveAuthState`, `VideoSystemConfig`, `ProviderAsset`, and `UploadSession`. `ProviderAsset` and the original `UploadSession` shape remain historical compatibility tables; the live Studio upload path uses the current provider hooks and `UploadSession` fields.

## 2. Video control-plane/data-plane split

`videohosting` never treats a provider URL as a public application contract. It stores provider-neutral metadata and provider handles, then delegates transport mechanics to one `ProviderSpec` per provider in `providers/`:

```text
backend/features/videohosting/
├── urls.py                 public meta/token/raw + stream routes
├── views.py                entitlement, grants, playlists, keys, ranges
├── studio_uploads.py       provider-neutral resumable Studio protocol
├── studio_assets.py        owned metadata and WebVTT mutations
├── console/                admin providers/assets/policy/diagnostics/OAuth
├── providers/base.py       ProviderSpec, checks, upload protocol
├── providers/telegram.py  Telegram ingest, HLS segment publishing, redirects
├── providers/google_drive.py OAuth-backed upload and bounded raw stream
├── playback_plan.py       package/raw/refuse decision table
├── ingest.py               source → package → publish pipeline and tracker
├── packaging.py            FFmpeg AES-128 HLS ladder
├── tokens.py               hash-only, IP-bound, expiring grants
└── migrations/             schema and legacy source/mode backfill
```

The provider spec supplies capabilities, environment/deep checks, `store_source`, optional `store_package`, raw streaming, file-path refresh, segment redirect, OAuth/cleanup, and Studio upload hooks. Adding a provider is a module plus one registry entry; views and diagnostics do not grow a provider-code branch ladder.

## 3. Plan before bytes

`playback_plan.resolve_playback_plan()` applies request choice (`auto|always|never`, with CLI `force` alias), provider policy, global `VideoSystemConfig.use_ffmpeg`, and host capabilities. The result is `hls`, `raw`, or `refused` with a reason. Unsupported plans are rejected before provider storage.

- Telegram has no supported raw hook. Hosted Bot API raw download limits make the S-1 general raw fallback NO-GO. A Studio Telegram source is spooled only on a persistent writable `VIDEO_SPOOL_DIR`, then a background ingest requires a persistent FFmpeg-capable host to publish encrypted HLS. Missing prerequisites return `provider_requires_packaging`; new Telegram uploads are not intentionally left staged.
- Drive is a private source store with OAuth-backed raw reads. The S-2 spike rejects Drive as the v1 HLS origin. The Drive provider therefore has `store_source` and `raw_stream`, not a Drive HLS package target. Raw mode is `ready` with `protection=gated`; HLS mode is not claimed for Drive.
- Link providers are separate: validated YouTube/Vimeo links use `embed` with an allow-listed host; other validated external links use `external`. Their grants intentionally carry no bearer token.

The migration backfill is conservative: existing master playlists become `hls/encrypted`; Drive source IDs become `raw/gated`; only one matching `<course>--<lesson>` row is linked, and ambiguous lesson links are logged/skipped. `manage.py package_pending` is the bounded recovery command for stale `processing`/legacy `staged` rows: it requires a persistent spool, downloads a retained provider source when supported, forces HLS packaging, locks concurrent runs, skips rows without a source/package target, and redacts provider URIs from errors. It is not a reason to stage new unsupported Telegram uploads.

## 4. Upload pipeline and secrecy

The admin multipart upload is a real-server worker path; the Studio path is resumable and provider-neutral:

1. authenticate and check `videos.upload`/ownership/configuration;
2. resolve the provider and plan, validate extension, MIME, size/quota, and first-chunk magic;
3. create a provider session, but return only `sessionId`, `chunkSize`, `offset`;
4. accept raw binary chunks with strict inclusive `Content-Range`, probe authoritative provider offsets, and make duplicate ranges idempotent;
5. complete the provider session and persist only source identifiers and mode/protection;
6. run provider-specific packaging/publishing and update asset/session progress.

`VIDEO_UPLOAD_CHUNK_BYTES` defaults to 4 MiB for the relay. This is `16 × 256 KiB`, satisfying Drive’s resumable alignment while staying under the documented Vercel body cap when sent as raw binary. Provider session URIs, Drive bearer tokens, Telegram upload credentials, and secrets never enter a response or log. The Studio response is `private, no-store`.

`ingest.py` uses a weighted progress tracker (source upload, FFmpeg packaging, segment publishing). Errors land on the asset row as `status=error` with a bounded message. The worker is a thread, not Celery; persistent hosts are required for long-lived Telegram spool/FFmpeg work.

## 5. Playback and entitlement boundary

`playback_access()` is the shared policy for both direct asset token minting and lesson playback. It evaluates, in order, video admin/watch-any, asset owner, course staff/editor, free-preview lesson, and enrolled learner with `lessons.watch`. Direct metadata hides non-entitled assets as 404; token minting returns `not_entitled` for authenticated callers. A lesson playback request resolves the linked `CourseLesson`, so the client cannot invent a slug.

For HLS/raw, `tokens.mint()` stores only a SHA-256 hash, binds the grant to the client IP, and applies the normal or preview TTL. Manifests retain `__TOKEN__` placeholders at rest; request-time rewrite injects the grant into playlist/caption URIs. Master/media/key/caption responses are `no-store`; the AES key is server-only and segment requests redirect to the provider rather than proxying bytes.

Drive raw serving is the exceptional byte path. `raw_video_view` accepts the token in the query because media element/segment requests cannot rely on an Authorization header, calls Drive with the backend OAuth bearer, normalizes one range to `VIDEO_RAW_RANGE_CAP_BYTES` (default 8 MiB), bounds concurrent streams at four by default, verifies the upstream `206` window, and emits `private, no-store`. Provider URLs and OAuth credentials are never forwarded to the browser.

## 6. Console and diagnostics

The admin video console is owned by `videohosting.console`, although its URL prefix remains `/api/admin/`. `videos.manage_any` governs global asset operations; `videos.configure` governs provider policy, `useFfmpeg`, diagnostics, and Drive OAuth. `videos.manage_own`, `videos.upload`, `videos.use_embed`, `videos.package`, and `videos.watch_any` remain distinct catalog permissions. The provider listing is a registry projection with `available`/`reason`; the policy endpoint persists `auto|always|never`; the diagnostics endpoint is shallow/offline by default and deep only when the admin asks for live Telegram/Drive probes.

Drive OAuth is authorization-code/offline access with `drive.file`. `DriveGrant` stores the refresh token server-side; the browser sees only `authUrl`, account email/status, or neutral callback HTML. The deep Drive check can mint a bearer and perform a disposable 1-byte write probe, but no real test account was used for the Phase 4 spike; live OAuth/upload/raw playback acceptance is therefore still outstanding.

## 7. Typed configuration

`config/settings.py` parses booleans, integers, and lists with typed helpers. Relevant video defaults are:

| Setting | Default / purpose |
| :--- | :--- |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | `google_drive` |
| `VIDEO_HOSTING_USE_FFMPEG` | `true`; copied into the singleton on first creation |
| `VIDEO_UPLOAD_MAX_BYTES` | 2 GiB source cap |
| `VIDEO_UPLOAD_CHUNK_BYTES` | 4 MiB relay chunk |
| `VIDEO_USER_QUOTA_BYTES` | 20 GiB per user; managers are exempt |
| `VIDEO_SPOOL_DIR` | empty; must be an absolute persistent writable directory for Telegram Studio uploads |
| `VIDEO_RAW_RANGE_CAP_BYTES` | 8 MiB per raw request |
| `VIDEO_RAW_MAX_CONCURRENT` | 4 raw streams per process |
| `STREAM_TOKEN_TTL_HOURS` | 6 hours |
| `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | 30 minutes |
| `VIDEO_EMBED_ALLOWED_HOSTS` | `youtube-nocookie.com,vimeo.com` |

Provider credentials and Google OAuth client values are backend-only. A real Drive account acceptance remains an external gate, not a passed implementation claim.

## Related

- API surface and exact endpoints: [07 · Backend Contract](07-backend-contract.md)
- Feature map: [`backend/features/README.md`](../backend/features/README.md)
- Video feature runbook: [`backend/features/videohosting/README.md`](../backend/features/videohosting/README.md)
