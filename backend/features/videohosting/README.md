# Video Hosting — استضافة الفيديو

The feature is a provider-backed video control plane. Telegram or Google Drive stores the bytes; Django stores metadata, playback plans, manifests, keys, captions, grants, and provider handles. The browser never receives provider credentials or upload-session URIs.

## Routes

All paths are mounted under `/api/`.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/videos/providers` | Authenticated registry (`{results:[...]}`). |
| `GET` | `/videos/<slug>` | Entitlement-filtered readiness and rendition metadata. |
| `POST` | `/videos/<slug>/token` | Mint an IP-bound, expiring grant; optional `lessonRef`. |
| `POST` | `/courses/<slug>/lessons/<lesson_id>/playback` | Resolve the linked lesson asset and return grant/resume/next-lesson data. |
| `GET` | `/videos/<slug>/raw?token=...` | Gated Drive raw source with bounded `Range`. |
| `GET` | `/stream/<token>/captions/<lang>.vtt` | Valid-token WebVTT response. |
| `GET` | `/stream/<token>/master.m3u8` | Token-rewritten HLS master. |
| `GET` | `/stream/<token>/<quality>/index.m3u8` | Token-rewritten rendition playlist. |
| `GET` | `/stream/<token>/key/<quality>` | 16-byte AES-128 key. |
| `GET` | `/stream/<token>/<quality>/<index>.ts` | `302` to provider ciphertext; Django does not proxy segment bytes. |
| `PUT` | `/courses/<slug>/lessons/<lesson_id>/progress` | Authenticated learner lesson heartbeat. |
| `GET` | `/studio/video-providers` | Authenticated provider rows with availability, reason, policy, and effective plan. |
| `GET` · `POST` | `/studio/videos` | Paged owned/all library or create a storage asset. |
| `POST` | `/studio/videos/link` | Create validated YouTube/Vimeo embed or external-link asset. |
| `PATCH` · `DELETE` | `/studio/videos/<asset_id>` | Edit title/poster or delete an unlinked owned asset. |
| `POST` | `/studio/videos/<asset_id>/captions` | Add a WebVTT language track (512 KiB maximum). |
| `DELETE` | `/studio/videos/<asset_id>/captions/<language>` | Delete one owned language track. |
| `POST` | `/studio/videos/<asset_id>/upload` | Start resumable provider upload; response contains no provider URI. |
| `PUT` | `/studio/uploads/<session_id>/chunk` | Raw binary strict `Content-Range` chunk. |
| `GET` · `DELETE` | `/studio/uploads/<session_id>` | Poll session offset or cancel it. |
| `POST` | `/studio/uploads/<session_id>/complete` | Complete the upload and return the asset row. |

Studio responses are authenticated and `Cache-Control: private, no-store`. Studio asset rows contain only catalog metadata and lesson links. Library responses are `{results,total,page,pageSize}`; provider listing is a list; upload session responses contain `sessionId`, `chunkSize`, `offset`, `total`, and status where applicable.

## Playback contract

The grant response is mode-specific:

- `hls`: token, expiry, `masterUrl`, `qualities`, duration, encrypted protection, and captions.
- `raw`: token, expiry, gated `playUrl`, duration, MIME/protection, and captions.
- `embed`: safe allow-listed `embedUrl`, empty token, and no private bearer.
- `external`: validated `sourceUrl`, empty token, and no private bearer.

Direct metadata hides non-entitled assets as 404. Token minting and lesson playback require authentication and the shared entitlement policy: `videos.watch_any`/administrator, owner, course staff/editor, a published free-preview lesson, or an enrolled learner with `lessons.watch`. A lesson request must resolve the actual `CourseLesson` link. Unready assets return a coded conflict; missing lesson video returns `no_video`.

HLS/raw grants are IP-bound and expiring (`STREAM_TOKEN_TTL_HOURS`, default 6; preview TTL default 30 minutes). Only SHA-256 token hashes are stored. Stored playlists contain `__TOKEN__`; request-time rewrites inject the raw token. HLS master/media playlists, AES keys, captions, and raw ranges use `no-store`; raw uses the token query because media requests cannot rely on an Authorization header. Telegram segment redirects expose encrypted bytes only and use the configured read-only stream bot when available.

Drive raw serving accepts one normalized byte range at most `VIDEO_RAW_RANGE_CAP_BYTES` (default 8 MiB), requires an upstream `206`, and limits concurrent streams with `VIDEO_RAW_MAX_CONCURRENT` (default 4). It returns `private, no-store`, never forwards the Drive bearer, and returns `503` with `Retry-After` when the local bound is full.

## Providers and packaging

`providers/base.py` defines the registry contract: capabilities, env/deep checks, source/package hooks, raw stream, segment redirect, path refresh, upload hooks, and cleanup. Current registry entries are `google_drive`, `telegram`, `youtube`, `vimeo`, and `external`.

### Telegram

S-1 is a NO-GO for general Telegram raw playback on the hosted Bot API: the documented download limit and short-lived file URLs are not a lesson-video fallback. Telegram therefore requires encrypted HLS packaging. Studio uploads first land in an absolute persistent writable `VIDEO_SPOOL_DIR`; the background ingest then needs a persistent FFmpeg-capable host. If the resolved plan cannot package, upload-init/ingest fails with `provider_requires_packaging` before storing a new source. It does not leave new Telegram uploads staged indefinitely. HLS uses AES-128 keys and six-second VOD segments; each segment request redirects to Telegram’s CDN.

### Google Drive

Drive uses a personal Google OAuth 2.0 grant with `drive.file`; the refresh token is stored in `DriveGrant`, never sent to React. Files remain private in the configured folder. S-2 is a NO-GO for Drive-backed HLS in v1, so Drive’s current supported playback is the gated raw media proxy using `files.get?alt=media` and Range. Drive is not documented as an HLS packager or origin.

Studio’s relay default is 4 MiB (`VIDEO_UPLOAD_CHUNK_BYTES`), exactly 16 × Drive’s 256 KiB resumable alignment. The backend probes the authoritative provider offset, resumes duplicate/reloaded chunks safely, retries bounded transient failures, and never returns the Drive session URI. S-3 was validated with fake transport/protocol tests only. No real Drive OAuth account was used; live OAuth/upload/raw-playback acceptance is still an outstanding external acceptance.

## Data and backfill

`VideoAsset` carries the status (`uploading`, `processing`, `ready`, `staged`, `error`), mode/protection, source identifiers, progress/stage, and provider. `VideoRendition`/`VideoSegment` hold the encrypted HLS ladder; `VideoCaption` holds validated WebVTT; `StreamToken` holds only the grant hash; `DriveGrant`/`DriveAuthState` hold server-side OAuth state. `ProviderAsset` is retained for historical compatibility.

Migration `0010` backfills assets with a master playlist to `hls/encrypted`, Drive source assets to `raw/gated`, and only uniquely resolvable `<course>--<lesson>` links. Ambiguous links are logged and skipped. `manage.py package_pending` recovers stale `processing`/legacy `staged` rows older than its threshold when a persistent spool and provider source-download hook exist; it forces HLS, uses a lock, skips unsupported/no-source rows, and redacts provider URIs from errors. It is a recovery path for retained sources, not a reason to leave new unsupported Telegram uploads staged.

## Settings

Relevant typed settings (real credentials belong only in the host environment):

| Setting | Default / rule |
| :--- | :--- |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | `google_drive` |
| `VIDEO_HOSTING_USE_FFMPEG` | `true`; copied to `VideoSystemConfig` initially |
| `VIDEO_UPLOAD_MAX_BYTES` | 2 GiB |
| `VIDEO_UPLOAD_CHUNK_BYTES` | 4 MiB |
| `VIDEO_USER_QUOTA_BYTES` | 20 GiB; `videos.manage_any` exempt |
| `VIDEO_SPOOL_DIR` | unset; required as persistent writable storage for Telegram Studio |
| `VIDEO_RAW_RANGE_CAP_BYTES` | 8 MiB |
| `VIDEO_RAW_MAX_CONCURRENT` | 4 |
| `STREAM_TOKEN_TTL_HOURS` | 6 |
| `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | 30 |
| `VIDEO_EMBED_ALLOWED_HOSTS` | `youtube-nocookie.com,vimeo.com` |

## Tests and operational boundary

Feature tests cover offline registry, plan resolution, upload offsets, staged/error behavior, token/playlist/key/redirect flow, raw proxy caps, diagnostics, and fake Drive resumable transport. They do not substitute for a real Drive account. The real OAuth grant, authorized folder, deployed upload/resume path, and end-to-end private raw playback remain external acceptance work.
