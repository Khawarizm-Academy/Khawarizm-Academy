# Video Hosting — استضافة الفيديو

Unlimited, cheap, encrypted video hosting for lesson playback. A Telegram
channel or a Google Drive folder is the **data plane** (unlimited, cheap
storage); this Django app is the **control plane** (hashing, manifests, keys — a
few kilobytes per request). The backend never proxies a video byte.

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

1. **Ingest** (`python manage.py ingest_video <file> --slug <slug>`): the asset's
   provider decides the flow. **Telegram** uploads the source to the channel
   (files over ~2GB are auto-split), FFmpeg builds an AES-128 HLS ladder (one
   **unique key per rendition**, 6s VOD segments), each `.ts` is uploaded as a
   document, and the manifests keep `__TOKEN__` placeholders — no usable URL is
   ever stored at rest. **Google Drive** resumable-uploads the source into the
   configured folder and stages the asset (`source_file_id`) for a later
   packaging run — no HLS is built on this path.
2. **Serve**: a signed-in viewer mints a token (IP-bound, TTL from
   `STREAM_TOKEN_TTL_HOURS`); the Telegram playlists are rewritten per request
   with that token; the key endpoint returns raw bytes with `no-store`; each
   segment view resolves a fresh Telegram file path over plain HTTPS and returns
   a **302** straight to the CDN, so `api.telegram.org` does the byte work.
3. **Protect**: the segment route only ever redirects to ciphertext; the key is
   IP-bound and expiring; the master and key responses are `no-store`. A leaked
   segment URL exposes encrypted bytes and nothing more.

## Where FFmpeg runs — **not on Vercel**

FFmpeg is only needed for **packaging** (step 1). It cannot run on Vercel: the
serverless runtime has no system packages, a 4.5 MB request cap, a 300 s ceiling,
a read-only filesystem, and a 500 MB `/tmp`. `require_packaging_host()` fails
loudly with those instructions instead of a vague "ffmpeg not found".

The split is the whole point — the **serving** path (steps 2–3) is tiny and
serverless-friendly, so it runs fine on Vercel:

| Concern | Runs where | Needs FFmpeg? |
| :--- | :--- | :--- |
| `ingest_video` (upload + package + store) | Your machine, a worker container, or any VM | **Yes** |
| Token mint, manifests, keys, segment redirects | Vercel (serverless) | No |
| Segment bytes | Telegram CDN (redirect target) | No |

**Recommended flow** — encode locally once per video, then deploy:

```bash
cd backend && source .venv/bin/activate
python manage.py ingest_video ~/lesson-01.mp4 --slug course-1--lesson-1 --delete-source
```

For hosted/repeatable encoding, run the same command in a small worker container
(Railway / Render / Fly / a VPS) that has FFmpeg — never the Vercel function.

## Providers

Providers live in `providers/` — one module per host, plus the registry:

```text
features/videohosting/providers/
├── __init__.py      registry — SPECS, spec_for(), ensure_defaults(), default_code()
├── base.py          ProviderSpec — code, name, enablement, capabilities
├── google_drive.py  GOOGLE_DRIVE spec + GoogleDriveService (resumable upload)
│                    + dual-mode auth (refresh token → service-account JWT)
└── telegram.py      TELEGRAM spec + TelegramMediaService + Bot API helpers
```

The specs are the source of truth for the admin-visible `VideoProvider` rows:
`ensure_defaults()` upserts one row per spec, so a row toggled by hand in the
admin is re-synced to its spec on the next call.

### Adding a new provider — three steps, no existing logic touched

1. **`providers/<code>.py`** — a `ProviderSpec` (code, name, enablement,
   capabilities) and a `credentials()` reading the provider's settings block.
2. **`config/settings.py`** — `os.environ.get` for its keys; **`.env*`** — a
   placeholder block (commented dev, real values only via host env).
3. **`providers/__init__.py`** — import the spec and add it to `SPECS`.

## Configuration

Environment variables (never commit real values):

| Variable | Purpose |
| :--- | :--- |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram API credentials (ingest) |
| `TELEGRAM_BOT_TOKEN` | Ingest/upload bot, a member of the channel |
| `TELEGRAM_STREAM_TOKEN` | Throwaway read-only bot whose token appears in redirect URLs |
| `TELEGRAM_CHANNEL_ID` | Storage channel (`@handle` or numeric id) |
| `STREAM_TOKEN_TTL_HOURS` | Playback grant lifetime (default `6`) |
| `GOOGLE_DRIVE_CLIENT_ID` / `CLIENT_SECRET` | Drive OAuth application credentials |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Drive OAuth grant — the upload engine, tried first when minting access tokens |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | Drive headless auth fallback (raw JSON or base64) — mints tokens, but its uploads need a Shared Drive |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | The Drive folder videos upload into; share it with the service-account email as **Editor** for its uploads to land |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | The provider assets default to (default `google_drive`) |

Google bills a Drive upload to the **uploader**, and service accounts carry
*no storage quota* — so an SA upload into a personal folder dies with
"Service Accounts do not have storage quota" even with an Editor share,
unless the folder is a Workspace **Shared Drive**. The durable fix is the
human refresh token; re-mint it with:

```bash
python manage.py drive_auth             # 1: prints the consent URL
python manage.py drive_auth --code=...  # 2: prints the GOOGLE_DRIVE_REFRESH_TOKEN line
```

Keep the OAuth consent screen published as **In production** — a Testing app
expires its refresh tokens after 7 days, which is the usual cause of
`invalid_grant`. The deep diagnostics end in a real 1-byte write probe
(`drive_probe`), so `فحص المنظومة` exposes the quota reality itself instead
of the first real upload doing it.

`pyrogram` + `tgcrypto` are only imported on the ingest path; the serving stack
stays importable (and serverless-safe) without them.

## Tests

```bash
python manage.py test features.videohosting
```

Telegram is never contacted: segment rows carry a cached `file_path` and the key
endpoint serves the stored key, so the full token → master → media → key →
segment redirect flow is covered offline.
