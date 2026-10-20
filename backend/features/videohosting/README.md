# Video Hosting — استضافة الفيديو

Unlimited, cheap, encrypted video hosting for lesson playback. A Telegram
channel is the **data plane** (unlimited, free storage in direct-CDN redirect
mode); this Django app is the **control plane** (hashing, manifests, keys — a few
kilobytes per request). The backend never proxies a video byte.

## The shape of a request

```
browser                Django (control)                 Telegram (data)
  │  POST /api/videos/<slug>/token
  ├────────────────────────────►  mint IP-bound, hashed grant
  │  GET /api/stream/<token>/master.m3u8
  ├────────────────────────────►  stored master with __TOKEN__ swapped in
  │  GET /api/stream/<token>/480p/index.m3u8
  ├────────────────────────────►  media playlist, token-scoped URIs
  │  GET /api/stream/<token>/key/480p
  ├────────────────────────────►  16-byte AES key (no-store, IP-bound)
  │  GET /api/stream/<token>/480p/00012.ts
  ├────────────────────────────►  302 → api.telegram.org/file/... ─────────►  .ts
  │  ◄─────────────────────────────────────────────── encrypted segment ────┘
```

Every `.ts` is an AES-128 encrypted segment: Telegram only ever stores and
serves ciphertext, the key is delivered exclusively through the gated endpoint,
and no route ever exposes a raw Telegram file or a download URL.

## Routes

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/videos/<slug>` | Readiness, duration, and the rendition ladder |
| `POST` | `/api/videos/<slug>/token` | Mint a playback grant (auth required) |
| `GET` | `/api/stream/<token>/master.m3u8` | Master playlist, token-scoped |
| `GET` | `/api/stream/<token>/<quality>/index.m3u8` | Rendition media playlist |
| `GET` | `/api/stream/<token>/key/<quality>` | AES-128 key for one rendition |
| `GET` | `/api/stream/<token>/<quality>/<index>.ts` | 302 redirect to Telegram's CDN |

## Data

| Model | Role |
| :--- | :--- |
| `VideoAsset` | One video: `slug` business key, status, duration, master playlist, source message |
| `VideoRendition` | One quality (360p/480p/720p): media playlist, bandwidth, **AES key** |
| `VideoSegment` | One encrypted `.ts`: message id, stable `file_id`, cached `file_path` |
| `StreamToken` | A grant: SHA-256 `token_hash`, `ip_binding`, `expires_at` |

Only the token **hash** is stored, so a database dump yields no usable links; the
raw token is shown once at mint time. `VideoStatus` lives in
`features/common/choices.py`.

## How it works

1. **Ingest** (`python manage.py ingest_video <file> --slug <slug>`): the source
   is uploaded to the channel (files over ~2GB are auto-split), FFmpeg builds an
   AES-128 HLS ladder (one **unique key per rendition**, 6s VOD segments), each
   `.ts` is uploaded as a document, and the manifests keep `__TOKEN__`
   placeholders — no usable URL is ever stored at rest.
2. **Serve**: a signed-in viewer mints a token (IP-bound, TTL from
   `STREAM_TOKEN_TTL_HOURS`); the playlists are rewritten per request with that
   token; the key endpoint returns raw bytes with `no-store`; each segment view
   resolves a fresh Telegram file path over plain HTTPS and returns a **302**
   straight to the CDN, so `api.telegram.org` does the byte work.
3. **Protect**: the segment route only ever redirects to ciphertext; the key is
   IP-bound and expiring; the master and key responses are `no-store`. A leaked
   segment URL exposes encrypted bytes and nothing more.

## Configuration

Environment variables (never commit real values):

| Variable | Purpose |
| :--- | :--- |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram API credentials (ingest) |
| `TELEGRAM_BOT_TOKEN` | Ingest/upload bot, a member of the channel |
| `TELEGRAM_STREAM_TOKEN` | Throwaway read-only bot whose token appears in redirect URLs |
| `TELEGRAM_CHANNEL_ID` | Storage channel (`@handle` or numeric id) |
| `STREAM_TOKEN_TTL_HOURS` | Playback grant lifetime (default `6`) |

`pyrogram` + `tgcrypto` are only imported on the ingest path; the serving stack
stays importable (and serverless-safe) without them.

## Tests

```bash
python manage.py test features.videohosting
```

Telegram is never contacted: segment rows carry a cached `file_path` and the key
endpoint serves the stored key, so the full token → master → media → key →
segment redirect flow is covered offline.
