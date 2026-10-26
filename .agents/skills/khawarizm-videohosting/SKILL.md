---
name: khawarizm-videohosting
description: Video hosting playbook for Khawarizm Academy — Django control plane (features/videohosting) plus the frontend HLS player twin. Use whenever adding a hosting provider, touching the ingest/packaging pipeline, debugging playback, HLS manifests, stream tokens, or segment routes, changing the rendition ladder, or wiring new provider credentials. Covers the control/data-plane split, the providers/ registry (add a provider in 3 steps), ingest → FFmpeg → storage pipeline, token-gated serving, and the Vercel packaging constraints.
---

# Khawarizm Academy — Video Hosting Skill

Unlimited, cheap, encrypted video hosting: a storage channel is the **data
plane**; this Django app is the **control plane** (hashing, manifests, keys — a
few kilobytes per request). The backend never proxies a video byte.

> Feature README: [`backend/features/videohosting/README.md`](../../../backend/features/videohosting/README.md).
> Credentials & env blocks: [`khawarizm-env-config`](../khawarizm-env-config/SKILL.md).
> Backend master rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md).

---

## 1. The shape of a request

```
browser                Django (control)                 Provider (data)
  │  POST /api/videos/<slug>/token
  ├────────────────────────────►  mint IP-bound, hashed grant
  │  GET /api/stream/<token>/master.m3u8
  ├────────────────────────────►  stored master with __TOKEN__ swapped in
  │  GET /api/stream/<token>/480p/index.m3u8
  ├────────────────────────────►  media playlist, token-scoped URIs
  │  GET /api/stream/<token>/key/480p
  ├────────────────────────────►  16-byte AES key (no-store, IP-bound)
  │  GET /api/stream/<token>/480p/00012.ts
  ├────────────────────────────►  302 → provider CDN ─────────────────►  .ts
```

Every `.ts` is AES-128 encrypted at rest with the host: the CDN only ever stores
and serves ciphertext, the key leaves the backend **exclusively** through the
gated key endpoint, and no route exposes a raw file URL.

## 2. The folder — one module per provider under `providers/`

```text
features/videohosting/
├── providers/
│   ├── __init__.py      registry — SPECS, spec_for(), ensure_defaults(), default_code()
│   ├── base.py          ProviderSpec — code, name, enablement, capabilities
│   ├── google_drive.py  GOOGLE_DRIVE spec + credentials() access point
│   └── telegram.py      TELEGRAM spec + TelegramMediaService + Bot API helpers
├── ingest.py            upload → package → store pipeline (management command calls it)
├── packaging.py         FFmpeg AES-128 HLS ladder (360p/480p/720p)
├── tokens.py            SHA-256-hashed, IP-bound, TTL grants
├── models.py            VideoProvider, VideoAsset, VideoRendition, VideoSegment, StreamToken, ProviderAsset, UploadSession
├── views.py urls.py     the 7 routes (4 are the HLS control plane)
└── management/commands/ingest_video.py
```

**The specs are the source of truth.** `ensure_defaults()` upserts one
`VideoProvider` row per spec — a row toggled by hand in the admin is re-synced
to its spec on the next call. Enablement is decided in code and reviewed in git.

### Adding a new provider — 3 steps, no existing logic touched

```text
1. providers/<code>.py  — a ProviderSpec (code, name, is_enabled, is_default,
                          capabilities) + a credentials() reading its settings block
2. config/settings.py   — os.environ.get for its keys; .env.development — placeholders
                          (full checklist: khawarizm-env-config)
3. providers/__init__.py — import the spec and add it to SPECS
```

Registry access is data-driven, never a branch ladder:

```python
spec = spec_for(code) or fallback  # record lookup, returns None for unknown codes
```

## 3. Ingest — runs anywhere with FFmpeg, never on Vercel

```bash
cd backend && source .venv/bin/activate
python manage.py ingest_video ~/lesson-01.mp4 --slug course-1--lesson-1 --delete-source
```

The pipeline (`ingest.py`): upload the source to the provider (files over ~2GB
are auto-split by `TelegramMediaService.upload_file`) → `packaging.package_video`
encodes one ladder with **one unique AES-128 key per rendition** and 6s VOD
segments → every `.ts` is stored as a document/object → the manifests keep
`__TOKEN__` placeholders — **no usable URL is ever stored at rest**. Errors land
on the asset row (`status=error`, `error_message`) so the admin can see them.

`require_packaging_host()` refuses serverless runtimes loudly with the reasons
(`no FFmpeg, body cap, runtime limit, read-only FS`): encode locally once per
video or on an FFmpeg worker container, then deploy — the API only serves
tokens, manifests, keys, and redirects.

## 4. Serving — the token is the whole grant

`Authorization` cannot ride on an hls.js segment request, so playback paths
carry the token instead of a session cookie.

| Route | Behavior |
| :--- | :--- |
| `GET /api/videos/providers` | Registry rows, camelCase (`provider_payload`) — **declared before `<slug>` or it 404s as an asset slug** |
| `GET /api/videos/<slug>` | Readiness, duration, rendition ladder (`asset_meta`) |
| `POST /api/videos/<slug>/token` | Mint grant (auth required; 409 when not ready) |
| `GET /api/stream/<token>/master.m3u8` + `/<quality>/index.m3u8` | Playlists rewritten per request; `no-store` |
| `GET /api/stream/<token>/key/<quality>` | Raw 16-byte AES key; `no-store` |
| `GET /api/stream/<token>/<quality>/<int:index>.ts` | 302 to the provider CDN (redirect built with the read-only stream bot token) |

Token rules (`tokens.py`): only a **SHA-256** is stored, grants are bound to the
minting IP, TTL comes from `STREAM_TOKEN_TTL_HOURS`, expired grants are deleted
on first miss. Segment redirect helpers (`resolve_file_path_http`,
`telegram_file_url`) refresh Bot API paths over plain HTTPS so the serving stack
never needs Pyrogram.

## 5. Tests — Telegram is never contacted

`tests.py` covers models, registry, tokens, serializers, and the full
token → master → media → key → segment flow offline: segments carry a cached
`file_path` and the key endpoint serves the stored key, so no network call
happens. A new provider needs the same offline profile (mock the client, never
the network conditions away in views).

## 6. Pitfalls

| Pitfall | Problem | Prevention |
| :--- | :--- | :--- |
| Route ordering | `videos/<slug>` swallows `videos/providers` | Static slugs first in `urls.py` |
| Hand-enabling a provider in admin | Silently reverts on next call | Set `is_enabled` in the spec, not the row |
| Reading provider env in views | Values leak past the access point | `credentials()` in the provider module only |
| Packaging on Vercel | Confusing runtime failure | `require_packaging_host()` guard; encode on a worker host |
| Placeholder `__TOKEN__` left in a stored playlist | One leaked URL serves everyone | Rewrite per request; never persist a resolved URL |

## 7. Verification gate

```bash
cd backend && source .venv/bin/activate
python manage.py check
python manage.py test features.videohosting   # 26 tests, fully offline
```

Then curl with an allowed Origin (see `khawarizm-backend` §9). Frontend twin:
`frontend/src/features/videohosting/` (HLS player + providers data/hooks).
