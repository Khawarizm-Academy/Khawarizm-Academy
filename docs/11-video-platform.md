# 11 · Video Platform

Lesson video without owning bytes. Telegram and Google Drive store the media;
Django stores metadata, plans, manifests, keys, captions, grants and provider
handles. The browser never receives a provider credential or an upload-session
URI.

Backend: `backend/features/videohosting/`. Frontend:
`frontend/src/features/videohosting/`. Operational triage:
[`13-operations-runbook.md`](13-operations-runbook.md).

## 1. The provider × FFmpeg matrix

What an asset can do depends on two things the platform cannot control: the
provider's API and whether this host has FFmpeg and a persistent spool. The
answer is computed, never guessed — `playback_plan.resolve_playback_plan(spec,
requested, host, config, provider_row)` returns a `Plan` plus a reason.

| Host has FFmpeg + `VIDEO_SPOOL_DIR` | Provider supports packaging | Provider supports raw | Result |
| :--- | :--- | :--- | :--- |
| yes | yes (Telegram) | — | **HLS + AES-128**, packaged on ingest |
| no | — | yes (Drive) | **gated raw** — bounded `Range` proxy through Django |
| no | requested but impossible | yes | **raw**, with the refusal reason recorded on the asset |
| no | requested but impossible | no | **rejected before any source is stored** (409 with the reason) |
| — | link-type provider (YouTube/Vimeo) | — | **embed** (allowed hosts only) |
| — | external link | — | **external** source URL, no token |

Two deliberate properties:

- **A new unsupported plan fails at the door.** Telegram packaging needs a
  persistent spool; if the host cannot provide it, the upload plan is refused
  rather than leaving an asset `staged` forever. The user gets a reason, not a
  spinner.
- **The refusal is stored.** `VideoAsset.stage` / `error_message` keep why an
  asset is not playable, which is what `/studio/videos` shows as a playability
  hint and the runbook triages against.

Registry: `providers/{telegram,google_drive,youtube,vimeo,external}.py` over
`providers/base.py`, with `providers/drive_uploads.py` for the resumable Drive
transport. Adding a provider is a spec + a transport, not a new branch in a view.

## 2. Entitlement (who may watch)

```
POST /api/courses/<slug>/lessons/<lesson_id>/playback   ← the player's only call
POST /api/videos/<slug>/token                           ← direct asset grant (optional lessonRef)
```

- The grant is **IP-bound and expiring**; only its SHA-256 hash is stored
  (`StreamToken`). A grant from another IP or after expiry is refused.
- TTLs differ by exposure, because a raw token rides the query string:

  | Setting | Default | Applies to |
  | :--- | :--- | :--- |
  | `STREAM_TOKEN_TTL_HOURS` | 6 | HLS manifest/key/segment routes |
  | `VIDEO_RAW_GRANT_TTL_MINUTES` | 120 | raw source grants (shorter on purpose) |
  | `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | 30 | free-preview lessons |

- Enrollment/entitlement is resolved server-side from the lesson → asset link;
  `videos.watch_any` is the only bypass, and every use of it is auditable.
- A lesson with no linked asset answers **409 `no_video`** ("لا يوجد فيديو مرتبط
  بهذا الدرس") — the state the Phase 14 demo course ships in, so playback fails
  honestly instead of pointing at an unverified URL.

## 3. The serving surface

Everything below `/stream/` and `/videos/<slug>/raw` is token-gated and private:

| Route | Behaviour |
| :--- | :--- |
| `GET /stream/<token>/master.m3u8` | Token-rewritten HLS master |
| `GET /stream/<token>/<quality>/index.m3u8` | Rewritten rendition playlist |
| `GET /stream/<token>/key/<quality>` | The 16-byte AES-128 key |
| `GET /stream/<token>/<quality>/<n>.ts` | **`302` to provider ciphertext** — Django does not proxy segment bytes |
| `GET /stream/<token>/captions/<lang>.vtt` | WebVTT for a valid token |
| `GET /videos/<slug>/raw?token=…` | Gated Drive raw source with bounded `Range` |

Limits that keep the proxy from becoming the incident:
`VIDEO_RAW_RANGE_CAP_BYTES` (8 MiB per read) and `VIDEO_RAW_MAX_CONCURRENT` (4
simultaneous raw streams); at the cap the route answers busy rather than
buffering a video in serverless memory. Manifest, key, raw and Studio responses
are `private`/`no-store`.

## 4. Upload protocol (resumable, provider-agnostic)

```
POST   /api/studio/videos/<asset_id>/upload      start a session (no provider URI returned)
PUT    /api/studio/uploads/<session_id>/chunk    raw binary, strict `Content-Range`
GET    /api/studio/uploads/<session_id>          poll {offset, total, status, progress}
DELETE /api/studio/uploads/<session_id>          cancel
```

- **The server's `Range` is the only truth about progress.** A bodyless `PUT` with
  `Content-Range: bytes */TOTAL` returns the committed offset; if no `Range` comes
  back, no bytes were accepted. The client follows the server, never assumes
  (this is the spike-S-3 finding, still the rule).
- Chunk size `VIDEO_UPLOAD_CHUNK_BYTES` (4 MiB) under `VIDEO_UPLOAD_MAX_BYTES`
  (2 GiB) per file, `VIDEO_USER_QUOTA_BYTES` (20 GiB) per user,
  `VIDEO_MAX_OPEN_UPLOADS` (3) open sessions per user.
- **The spool has a quota and it is enforced.** `VIDEO_SPOOL_DIR` must live on
  persistent storage; `VIDEO_SPOOL_MAX_BYTES` (20 GiB) is checked at upload init,
  and a full spool answers **400 `spool_full`** instead of filling the disk
  mid-transfer. With no spool configured the quota is inert — the Drive path
  never writes one, so it must not be blocked by a directory it does not use.
- Stale sessions are pruned by `cleanup_expired` after
  `VIDEO_UPLOAD_STALE_HOURS` (24).
- Client side (`/studio/videos`): a framework-independent queue with **two
  concurrent files**, visibility-aware readiness polling (stop polling a hidden
  tab), and delete guards that refuse to drop an asset still linked to a lesson.
- Server side ingest runs in a worker thread (`ingest.py`) — no task queue exists,
  and the request never waits for FFmpeg.
- `manage.py ingest_video FILE --slug <slug> --package auto|force|never` is the
  operator path for a file that arrived out of band.
- `manage.py package_pending` recovers assets stranded in `processing`/legacy
  `staged` when a spool and a provider source-download hook exist: it forces HLS,
  takes a lock, skips rows it cannot serve, and redacts provider URIs from
  persisted errors.

## 5. Player engines

One responsive `PlayerStage` mounts, and `engines/registry.ts` resolves a lazy
loader from the **grant's mode** — never from the asset's shape:

| Grant mode | Engine | Notes |
| :--- | :--- | :--- |
| `hls` | `native` if `canPlayType(...mpegurl)`, else `hls` (hls.js) | Safari uses the platform decoder; the hls.js chunk stays **lazy** (the Phase 13 bundle budget asserts this) |
| `raw` | `file` | plain `<video src>` against the gated raw route |
| `external` | `file` | provider-supplied source URL, no token |
| `embed` + `youtube` | `youtube` | only `VIDEO_EMBED_ALLOWED_HOSTS` hosts |
| `embed` + `vimeo` | `vimeo` | as above |

- `resolveEngineLoader()` is side-effect free, so React render paths may call it.
  Unknown provider/mode returns `null` → the UI shows an unsupported state.
- **Token expiry is a retry, not an error page:** a rejected token (`hls`/`raw`) or
  a network failure on a raw source triggers exactly one silent re-grant
  (`usePlayback`, `tokenRetriedRef`) before surfacing.
- `videoPlayerStore` mirrors **real engine state** — no synthetic ticker — so
  progress, resume point and quality labels cannot drift from what is playing.
- Quality menus come from the grant (`qualities`) for HLS only.

## 6. Progress and completion

`PUT /api/courses/<slug>/lessons/<lesson_id>/progress` is the heartbeat. The
server, not the browser, decides completion (`docs/05-feature-directory.md` →
courses): a monotonic per-lesson completion, a `progress_revision` that catches a
curriculum change under a learner's feet, and milestone notifications. Certificates
are issued from the server-side view of "all published lessons + the required exam
passed" — never from a client claim.

## 7. Protection model in one table

| Layer | Mechanism | What it stops |
| :--- | :--- | :--- |
| At rest | Provider-owned bytes; Django stores only handles | Nothing leaks from our DB that isn't metadata |
| Playback | AES-128 on HLS renditions | Casual download of a rendition URL |
| Access | IP-bound, expiring, hashed tokens | Link sharing, replay after expiry |
| Transport | 302 to provider ciphertext for segments | Django as a CDN (and its bandwidth bill) |
| Bounds | Range cap + concurrency cap on raw | One learner saturating the server |
| UI | Visible watermark + honest `protection` label | Embeds/Drive carry no DRM, and the player says so |

DRM (Widevine/FairPlay) and forensic watermarking are **backlog B5**, not a gap in
this design: the posture above is documented and the UI reflects it.

## 8. Configuration

Every key with its default, in the order a deploy needs it:

```
VIDEO_HOSTING_DEFAULT_PROVIDER=google_drive   VIDEO_HOSTING_USE_FFMPEG=true
VIDEO_SPOOL_DIR=/persistent/video-spool       VIDEO_SPOOL_MAX_BYTES=21474836480
VIDEO_UPLOAD_MAX_BYTES=2147483648             VIDEO_UPLOAD_CHUNK_BYTES=4194304
VIDEO_USER_QUOTA_BYTES=21474836480            VIDEO_MAX_OPEN_UPLOADS=3
VIDEO_UPLOAD_STALE_HOURS=24                   VIDEO_RAW_RANGE_CAP_BYTES=8388608
VIDEO_RAW_MAX_CONCURRENT=4                    VIDEO_RAW_GRANT_TTL_MINUTES=120
STREAM_TOKEN_TTL_HOURS=6                      VIDEO_GRANT_TTL_PREVIEW_MINUTES=30
VIDEO_EMBED_ALLOWED_HOSTS=youtube-nocookie.com,vimeo.com
TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_BOT_TOKEN / TELEGRAM_STREAM_TOKEN / TELEGRAM_CHANNEL_ID
GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET / GOOGLE_DRIVE_ROOT_FOLDER_ID / GOOGLE_DRIVE_OAUTH_REDIRECT_URI
```

`VIDEO_SPOOL_DIR` unset disables Telegram packaging entirely (the provider shows
unavailable with a reason instead of failing later). Drive's OAuth refresh token
is stored server-side in `DriveGrant` after the consent callback and is never
sent to React. See `../../backend/.env.development` for the commented catalogue
and `docs/06-development-guide.md` for profiles.

## 9. Verifying it

```bash
python manage.py test features.videohosting          # offline registry, plan resolution,
                                                     # offsets, staged/error, token/playlist/key/
                                                     # redirect flow, raw caps, fake Drive transport
python manage.py ingest_video sample.mp4 --slug test--lesson1 --package auto   # FFmpeg host only
```

Tests run against fake providers — no credentials, no network. What they cannot
prove is the real Drive consent grant, an authorized folder, and end-to-end
private playback on the deployed host; those remain human acceptance steps in
`plan/release-checklist.md`.
