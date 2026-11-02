# Google Drive Integration — Video Hosting

## Current decision

Google Drive is a **private source/storage provider**, not the v1 HLS origin. The S-2 spike rejected Drive-backed HLS because Drive does not provide a private HLS/CDN/signing contract and a per-segment proxy would move all HLS bandwidth and quota pressure through the application. Drive’s supported Phase 4 playback path is authenticated raw media through the backend with bounded HTTP Range reads.

## OAuth and privacy

- Use a Google user OAuth 2.0 web client with offline access and the least-privilege `https://www.googleapis.com/auth/drive.file` scope.
- `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, and `GOOGLE_DRIVE_OAUTH_REDIRECT_URI` are backend settings; real values stay in the host environment.
- The admin starts `/api/admin/video-drive/oauth/start`; Google returns to the public, origin-exempt `/api/admin/video-drive/oauth/callback`. A single-use hashed state protects the callback.
- The backend stores the refresh token in `DriveGrant` and refreshes access tokens server-side. React sees only `authUrl`, account email/status, or neutral callback HTML. `/oauth/status` never returns a token; disconnect revokes at Google best-effort and deletes the row.
- Files remain private in the configured folder. Do not use `webViewLink`, public sharing, or a browser bearer as a playback shortcut.

## Upload protocol

The Studio relay accepts raw binary chunks, not JSON/base64. Its default `VIDEO_UPLOAD_CHUNK_BYTES` is **4 MiB**, which is `16 × 256 KiB` and therefore aligned with Drive resumable upload requirements while remaining under the documented Vercel request cap. Each provider request carries `Content-Length` and inclusive `Content-Range`; incomplete uploads return/handle `308`, completion returns `200`/`201`, and a bodyless status probe follows Drive’s authoritative committed `Range`.

The implementation must:

- never assume submitted bytes were accepted;
- resume from the provider-reported offset and make duplicate ranges idempotent;
- treat expired sessions as recoverable upload errors (Drive sessions can expire after inactivity);
- use bounded retries for transient 5xx/network errors;
- keep the Drive session URI, OAuth bearer, and file ID out of browser responses unless a file ID is needed only inside server-side state.

The Studio API returns `{sessionId,chunkSize,offset}` on init, `{offset,complete}` for chunks, and a metadata-only asset row on completion. The upload URI is deliberately server-side.

## Raw playback

A ready Drive raw asset stores `source_file_id`, `playbackMode=raw`, and `protection=gated`. The browser receives a short-lived platform grant whose `playUrl` points to `/api/videos/<slug>/raw?token=...`; it does not receive a Drive URL or OAuth bearer.

For each request, Django validates the IP-bound token, calls `files.get?alt=media` with the backend OAuth bearer, forwards one normalized Range window, and verifies that Drive returned a `206` whose window is no larger than `VIDEO_RAW_RANGE_CAP_BYTES` (default 8 MiB). The process limits concurrent raw streams with `VIDEO_RAW_MAX_CONCURRENT` (default 4). Responses use `Accept-Ranges: bytes`, `Content-Range`, `Content-Length`, and `Cache-Control: private, no-store`; malformed/unsatisfiable ranges get a structured error and `Content-Range: bytes */total`. A saturated gateway returns `503` with `Retry-After`.

This is a bounded authenticated proxy, not a claim that Drive supplies HLS, DRM, a CDN SLA, or arbitrary custom-player entitlement semantics.

## Diagnostics and acceptance

Shallow diagnostics check the OAuth client, folder, redirect URI, and stored grant without contacting Drive. `GET /api/admin/video-diagnostics?deep=true` additionally refreshes the stored bearer and performs a disposable 1-byte write probe into the configured folder, then attempts cleanup. The admin sees only check details, account email/status, and actionable hints.

S-3 fake-transport tests cover session initiation, 4 MiB/alignment assumptions, partial acceptance, offset probing, duplicate/resume behavior, finalization, expiry, and bounded retries. **No real Drive OAuth test account was used.** Therefore the authorized account, folder permission, live OAuth callback, deployed upload/resume path, quota behavior, and end-to-end private raw playback remain an outstanding external acceptance; mocked/offline tests must not be reported as passed live validation.

## Rejected assumptions

- `webViewLink` is not a direct stream URL.
- Public sharing is not an acceptable private-video fallback.
- Drive is not documented here as an HLS packager or production HLS origin.
- A Drive file ID is not a browser playback URL.
- The backend does not expose the OAuth bearer, resumable session URI, or provider download URL.
