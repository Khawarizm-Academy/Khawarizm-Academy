# 07 · Backend Contract

The frontend is **fully API-driven** — there are no mocks. Django + DRF in `backend/` implements this contract. See [`backend/README.md`](../backend/README.md) for setup and [08 · Backend Architecture](08-backend-architecture.md) for internal boundaries.

## 1. Environment and response conventions

Frontend profiles select `VITE_API_BASE_URL`; the backend selects `.env.<DJANGO_ENV>` unless Vercel supplies environment variables. Payload keys are camelCase at the serializer boundary. Lists use a top-level object (`items`, `results`, or a named collection); errors use `{detail, code, fields?}`.

Private/admin/Studio/playback responses are not app-cached. Token-bearing HLS manifests, keys, captions, and raw ranges are `Cache-Control: no-store`; Studio responses are `private, no-store`; raw Drive responses are bounded `206` ranges with `private, no-store`. HLS segment responses are `302` redirects, so the backend does not proxy encrypted segment bytes.

## 2. Core course and auth surfaces

The existing auth, catalog, course, dashboard, profile, admin, and Studio course-authoring routes remain as described by the feature modules. Course playback adds the video contracts below. Course lifecycle still controls entitlement: published lessons can be previewed when marked free-preview, enrolled learners need `lessons.watch`, course staff/owners and authorized video admins may manage or watch according to the access policy; draft/in-review content is private.

## 3. Video hosting contract

The video control plane stores metadata, playback plans, manifests, keys, captions, grants, and provider references. Bytes remain with the provider. Current routes are mounted under `/api/` from `backend/features/videohosting/urls.py`.

### Public/learner playback

| Method | Path | Contract |
| :--- | :--- | :--- |
| `GET` | `/videos/providers` | Authenticated provider registry: `{results: [...]}`; no gate diagnostics. |
| `GET` | `/videos/:slug` | Entitlement-filtered readiness/metadata: `status`, `durationSeconds`, `qualities`, `playbackMode`, `protection`, provider and poster fields. Non-entitled/missing assets are 404. |
| `POST` | `/videos/:slug/token` | Authenticated entitlement check, optional body `{lessonRef:{course,lesson}}`; mints one IP-bound, expiring grant only when the asset is `ready`. |
| `POST` | `/courses/:slug/lessons/:lesson_id/playback` | Resolves the lesson's linked asset without clients constructing a video slug; returns the grant plus `resumeAt` and `{lesson,nextLessonId}`. Requires authentication, enrollment/preview/staff/owner/admin entitlement, and a linked ready asset. |
| `GET` | `/videos/:slug/raw?token=...` | Gated Drive raw mode. Accepts `Range`; returns a provider-authenticated, bounded `206` window only. Provider URLs/bearers are never returned. |
| `GET` | `/stream/:token/captions/:lang.vtt` | Caption through a valid HLS/raw grant; WebVTT, `no-store`. |
| `GET` | `/stream/:token/master.m3u8` | Rewrites stored `__TOKEN__` placeholders for an HLS grant; `no-store`. |
| `GET` | `/stream/:token/:quality/index.m3u8` | Rewrites one rendition playlist; `no-store`. |
| `GET` | `/stream/:token/key/:quality` | Returns the 16-byte AES-128 key for the IP-bound grant; `no-store`. |
| `GET` | `/stream/:token/:quality/:index.ts` | Validates the grant and returns `302` to the provider/CDN path; Telegram serves ciphertext directly. |
| `PUT` | `/courses/:slug/lessons/:lesson_id/progress` | Authenticated lesson heartbeat: bounded/monotonic `positionSeconds`, `durationSeconds`, `watchedSeconds`, `completed`; returns the persisted lesson progress and is `private, no-store`. |

A minted grant has `mode: hls | raw | embed | external`. HLS carries `masterUrl`, `qualities`, captions, token and expiry; raw carries a gated `playUrl` and captions; embed carries only the allow-listed `embedUrl` and an empty token; external carries only the validated `sourceUrl` and an empty token. Lesson playback may additionally carry `resumeAt` and the next lesson. Link providers are not private storage and do not receive bearer tokens.

Tokens are shown only at mint time, bound to the minting IP, and expire (`STREAM_TOKEN_TTL_HOURS`, default 6; free preview uses `VIDEO_GRANT_TTL_PREVIEW_MINUTES`, default 30). `StreamToken` stores only SHA-256. Stored manifests contain `__TOKEN__`, not a usable URL. Drive upload-session URIs, OAuth refresh/access tokens, and provider credentials remain server-side. Telegram redirect URLs use the configured read-only stream bot where available and expose encrypted segment bytes only.

Raw reads normalize a single byte range to `VIDEO_RAW_RANGE_CAP_BYTES` (default 8 MiB), reject malformed/unsatisfiable ranges, require a valid upstream `206`, and use a process-wide `VIDEO_RAW_MAX_CONCURRENT` bound (default 4). A busy raw gateway returns `503` with `Retry-After`.

### Instructor Studio video library and upload protocol

All these routes require authentication, return `private, no-store`, and are authorized per ownership. `videos.manage_own` covers owned assets; `videos.manage_any` bypasses ownership. `videos.upload` is required for storage creation/upload; `videos.use_embed` is required for YouTube/Vimeo/external links.

| Method | Path | Contract |
| :--- | :--- | :--- |
| `GET` | `/studio/video-providers` | `[...]` provider rows with `code`, `name`, `kind`, `needs`, `available`, `reason`, `packagingPolicy`, and effective plan. |
| `GET` · `POST` | `/studio/videos` | Paged owned/all library (`results,total,page,pageSize`) or create a storage asset (`201`) with a server-generated slug. `scope=all` requires `videos.manage_any`. |
| `POST` | `/studio/videos/link` | Create a ready `embed`/`external` asset from a validated HTTPS provider URL. Requires `videos.use_embed`. |
| `PATCH` · `DELETE` | `/studio/videos/:asset_id` | Edit title/poster or delete an unlinked owned asset; deletion schedules remote cleanup and refuses published links. |
| `POST` | `/studio/videos/:asset_id/captions` | Create one WebVTT track: `{language,label,isDefault,vtt}`; max 512 KiB and one language per asset. |
| `DELETE` | `/studio/videos/:asset_id/captions/:language` | Delete an owned language track. |
| `POST` | `/studio/videos/:asset_id/upload` | Start a provider session with `{fileName,sizeBytes,mimeType}`; returns `{sessionId,chunkSize,offset}` and never returns `upload_uri`. Max source is `VIDEO_UPLOAD_MAX_BYTES` (default 2 GiB), quota is `VIDEO_USER_QUOTA_BYTES` (default 20 GiB unless `videos.manage_any`). |
| `PUT` | `/studio/uploads/:session_id/chunk` | Raw binary chunk with strict `Content-Range`; returns `{offset,complete}`. The configured relay chunk is `VIDEO_UPLOAD_CHUNK_BYTES` (default 4 MiB). Duplicate accepted ranges are idempotent; out-of-order ranges return the authoritative offset. |
| `GET` · `DELETE` | `/studio/uploads/:session_id` | Poll `{sessionId,chunkSize,offset,total,status}` or cancel the caller's session. Managers may access another user's session. |
| `POST` | `/studio/uploads/:session_id/complete` | Finalize the provider upload and return the asset row; idempotent while complete/processing. |

The Studio asset row exposes catalog metadata (`id`, `slug`, `title`, `status`, `provider`, `sizeBytes`, `playbackMode`, `protection`, lesson links, timestamps), never upload URIs, provider paths, or credentials.

### Admin video console

Admin video routes are owned by `videohosting.console`, mounted under `/api/admin/`. The console uses granular permissions rather than one generic staff gate: `videos.configure` for provider policy, system config, diagnostics, and Drive OAuth; `videos.manage_any` for the global asset list/create/upload/detail/delete; `videos.manage_own` for owned Studio assets; `videos.upload`, `videos.use_embed`, `videos.package`, and `videos.watch_any` are separate catalog permissions. `administrator` implies the catalog; instructor templates receive Studio/upload/own-management, while elevated packaging/configuration remains explicit.

| Method | Path | Contract |
| :--- | :--- | :--- |
| `GET` | `/admin/video-providers` | `{results:[...]}` registry rows with `available`/`reason` gate. |
| `POST` | `/admin/video-providers/:code/policy` | Set `packagingPolicy: auto | always | never`; returns provider row plus `policy`/`packagingPolicy`. |
| `GET` · `POST` | `/admin/video-assets` | Bounded page `{total,page,pageSize,results}` (`pageSize` max 100), or register an asset after provider resolution. |
| `POST` | `/admin/video-assets/upload` | Multipart `{file,slug,title?,provider?}`; returns `202` and starts a real-server worker; poll the detail row's `progress`, `stage`, `status`, `error`. |
| `GET` · `DELETE` | `/admin/video-assets/:id` | Poll one tracker row or delete, refusing assets linked to published lessons and scheduling remote cleanup. |
| `GET` · `POST` | `/admin/video-system-config` | Read/update `{useFfmpeg:boolean}` global packaging toggle. |
| `GET` | `/admin/video-diagnostics?deep=true` | Shallow env/pipeline checks by default; `deep=true` adds live Telegram Bot API and Drive OAuth/token/1-byte write probes. |
| `GET` | `/admin/video-drive/oauth/start` | `{authUrl}`; admin-only consent start. |
| `GET` | `/admin/video-drive/oauth/callback` | Public, origin-exempt Google redirect; validates one-use state, stores the grant, and returns neutral HTML — never a token. |
| `GET` | `/admin/video-drive/oauth/status` | `{connected,accountEmail,status,error}` only. |
| `POST` | `/admin/video-drive/oauth/disconnect` | Best-effort Google revoke and stored-grant deletion; returns `{connected:false}`. |

Admin asset rows contain `id,slug,title,status,provider,playbackMode,protection,sizeBytes,sourceSizeBytes,progress,stage,qualities,viewCount,lastViewedAt,createdAt` and a truncated `error` on list/detail. Diagnostics returns `checkedAt`, `deep`, `okOverall`, `summary`, `problems`, `groups`, and `providers` with per-check severity/hints.

## 4. Provider decisions and settings

The registry currently contains `google_drive`, `telegram`, `youtube`, `vimeo`, and `external`. Link providers produce `embed`/`external` responses. Storage behavior is deliberately not symmetric:

- **Telegram:** HLS packaging is required; raw fallback is a spike S-1 NO-GO on the hosted Bot API (20 MiB `getFile` download limit and expiring URLs are unsuitable for general lessons). Studio requires a persistent writable `VIDEO_SPOOL_DIR`; the packaging host must also provide persistent FFmpeg. If the resolved plan cannot package, upload-init/ingest fails with `provider_requires_packaging` before storing a new source; it does not leave a new Telegram asset staged indefinitely. HLS uses AES-128 keys and six-second segments, with provider/CDN redirects for ciphertext.
- **Google Drive:** OAuth user grant (least-privilege `drive.file`) is stored server-side in `DriveGrant`; files remain private in the configured folder. S-2 rejects Drive-backed HLS as the v1 private origin. Current Drive playback is authenticated raw media through `files.get?alt=media` with bounded Range and no direct browser bearer/URL. Studio’s 4 MiB relay is 16 × Drive’s 256 KiB alignment; incomplete sessions are probed and resumed from the provider’s authoritative offset. S-3 protocol tests are offline/fake-transport only; live OAuth/account acceptance is still outstanding because no real test account was used.

Typed settings in `config/settings.py` include `VIDEO_HOSTING_DEFAULT_PROVIDER` (`google_drive`), `VIDEO_HOSTING_USE_FFMPEG` (`bool`, default true), `VIDEO_UPLOAD_MAX_BYTES` (2 GiB), `VIDEO_UPLOAD_CHUNK_BYTES` (4 MiB), `VIDEO_USER_QUOTA_BYTES` (20 GiB), `VIDEO_SPOOL_DIR`, `VIDEO_RAW_RANGE_CAP_BYTES` (8 MiB), `VIDEO_RAW_MAX_CONCURRENT` (4), `STREAM_TOKEN_TTL_HOURS` (6), `VIDEO_GRANT_TTL_PREVIEW_MINUTES` (30), and `VIDEO_EMBED_ALLOWED_HOSTS`. Provider credentials and OAuth client settings are backend-only.

Migration `0010` backfills legacy rows with a master playlist as `hls/encrypted`, Drive source rows as `raw/gated`, and uniquely resolvable `<course>--<lesson>` links; ambiguous links are logged and skipped. It does not infer ambiguous ownership or provider state. `manage.py package_pending` now recovers stale `processing`/legacy `staged` rows older than its age threshold when a persistent spool and provider source-download hook exist; it forces HLS packaging, locks concurrent runs, skips rows without a package-capable target/source, and redacts provider URIs from errors. This recovery path does not change the rule that new unsupported Telegram plans fail before storing a source.

## 5. Integration guidance

Keep frontend fetchers at the feature boundary, preserve camelCase response shapes, treat `code` as the stable error contract, and do not expose provider URLs or session URIs to the browser. A real Drive OAuth/upload/raw-playback acceptance remains an external follow-up, not a passed test.
