---
name: be-file-uploads-and-media-pipeline
description: File upload and media pipeline design - direct-to-storage uploads with signed URLs, validation, image resizing and modern formats, video ingest and adaptive HLS packaging with AES-128, control-plane vs data-plane split, provider registry (add a storage/video provider in 3 steps), token-gated playback, CDN delivery, and serverless limits. Use when handling uploads, images, video hosting, downloads, or private media.
---

# File Uploads & Media Pipeline

Keep the application server as a **control plane** (auth, metadata, tokens, manifests - a few KB per request). Bytes flow through **storage and a CDN** (the data plane).

## 1. Uploads

1. **Direct upload** to object storage via a short-lived **signed URL** (browser -> storage), then notify the API with the object key. The API never proxies large bodies (serverless body limits are small).
2. Validate server-side: size cap, allowed extensions **and real content type** (magic bytes), image dimensions, virus scan when risk warrants.
3. Store under **random keys** (UUID/hash), never user-provided names; keep the original name as metadata only.
4. Process asynchronously ([`be-background-jobs-and-queues`](../be-background-jobs-and-queues/SKILL.md)); show `processing -> ready/error` status.
5. Resumable/multipart for big files; abort and cleanup incomplete uploads on a schedule.

## 2. Images

- Generate responsive variants (e.g. 320/640/960/1280 widths) and modern formats (AVIF/WebP with JPEG/PNG fallback); strip metadata; set explicit width/height to avoid layout shift.
- Serve from a CDN with long immutable caching and content-hashed names ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)); an image CDN/transform service can do resizing on the fly.
- Frontend usage (`srcset`, `sizes`, lazy loading, LCP image priority): [`design-imagery-and-media`](../design-imagery-and-media/SKILL.md).

## 3. Video hosting shape

```
browser                    API (control plane)                    storage/CDN (data plane)
  | POST /videos/{id}/token -> mint short-lived, hashed, context-bound grant
  | GET  /stream/{token}/master.m3u8 -> manifest with token-scoped URIs
  | GET  /stream/{token}/key/{quality} -> 16-byte AES key (no-store)
  | GET  /stream/{token}/{quality}/00012.ts -> 302 redirect to CDN segment (ciphertext)
```
- Package once with FFmpeg into an **adaptive ladder** (e.g. 360p/480p/720p), 4-6 s segments, HLS, **AES-128 with a unique key per rendition**; segments are stored encrypted, the key leaves the backend only through the gated endpoint.
- Manifests keep placeholders; the token is substituted **per request**. No usable URL is stored at rest.
- Tokens: store only a **hash**, bind to the minting context (IP/session), short TTL, delete expired on first miss.
- Packaging runs on a host with FFmpeg and time, **never on a serverless request runtime**; the guard raises a clear error with the reasons (no FFmpeg, body cap, runtime limit, read-only FS).
- Honest limit: encryption and tokens deter casual download; they do not stop a determined user from screen-recording.

## 4. Provider registry: add a provider in 3 steps

```
providers/
  __init__.py   registry: SPECS, spec_for(code), ensure_defaults(), default_code()
  base.py       ProviderSpec (code, name, is_enabled, is_default, capabilities)
  <code>.py     one module per provider + credentials() access point
```
1. `providers/<code>.py`: a `ProviderSpec` and a `credentials()` that reads settings and fails loudly naming missing keys ([`be-config-and-secrets`](../be-config-and-secrets/SKILL.md)).
2. Settings + committed env placeholders for its keys.
3. Import the spec and add it to `SPECS`.

Lookup is data (`spec_for(code) or fallback`), never an `if provider == ...` ladder. Enablement is decided **in code** and synced to the DB rows, so a hand-toggled admin row cannot silently diverge.

## 5. Serving rules

- Private media: short-lived signed URLs or tokens ([`be-auth-and-security`](../be-auth-and-security/SKILL.md) §8).
- `Content-Disposition` for downloads; correct `Content-Type`; `X-Content-Type-Options: nosniff`.
- Range requests and CDN caching for large files; redirect to the CDN instead of streaming through the app.
- Delete derived files when the source is deleted (lifecycle rules).

## 6. Offline tests

Cache `file_path`/keys on rows so the full token -> manifest -> key -> segment flow runs in tests with the provider client mocked and **no network** ([`be-testing`](../be-testing/SKILL.md)).

## 7. Pitfalls

| Pitfall | Prevention |
| --- | --- |
| Proxying uploads through a serverless function | signed direct uploads |
| `videos/<slug>` swallowing `videos/providers` | static routes first |
| Hand-enabling a provider in admin | set enablement in the spec |
| Reading provider env in views | `credentials()` in the provider module only |
| Persisting a resolved CDN URL | resolve per request |
| One giant original image on a list page | responsive variants + modern formats |

## 8. Checklist

- [ ] Direct signed uploads; validated type/size; random keys.
- [ ] Async processing with visible status; cleanup of orphans.
- [ ] Images responsive + modern formats; CDN with immutable hashed names.
- [ ] Video: HLS ladder, per-rendition AES keys, per-request token substitution, hashed IP-bound TTL tokens.
- [ ] Providers in a registry; credentials fail loudly; offline tests pass.
