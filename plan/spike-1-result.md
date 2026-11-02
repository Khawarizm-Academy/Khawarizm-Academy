# Phase 4 Spike S-1 — Telegram raw-source playback

**Date:** 2026-11-02
**Decision:** **NO-GO** for a general raw-playback fallback on the current hosted Bot API architecture. Keep the Phase 4 matrix behavior: when Telegram's packaging prerequisites are unavailable, refuse upload-init with `provider_requires_packaging`; do not leave assets staged indefinitely. A separately scoped future experiment is possible only with a persistent Telegram file gateway and a verified browser-compatible source matrix.

## Findings

- Telegram's hosted Bot API documents `getFile` downloads up to **20 MB** and says the returned file URL is guaranteed valid for at least one hour. The official Bot API FAQ documents bot sends up to **50 MB**. This is too restrictive for a general lesson-video raw path.
- Telegram's local Bot API server can download files without a size limit, but it requires a persistent self-hosted process; the ordinary hosted API cannot supply this behavior.
- MTProto provides `upload.getFile` for file downloads in offset/limit chunks (up to 1 MB per precise request). File references can expire and require refresh. Telegram documents bot authorization to MTProto using `auth.importBotAuthorization`, but an API ID/API hash and durable session are still needed.
- Raw byte access would not replace HLS. It needs its own token-gated, range-capable endpoint, and only files the browser can decode natively can play without a packaging/transcoding step. The repository's Telegram provider currently has an HLS upload leg but no raw streaming hook.

## Validation limits

The protocol facts are verified from official documentation. No live Telegram credentials or persistent gateway were used; therefore channel/message access, codec compatibility, range behavior, performance, and end-to-end playback are **not** verified. This spike does not authorize exposing Telegram Bot API file URLs (which contain a bot token and expire).

## Sources

- [Telegram Bot API — getFile](https://core.telegram.org/bots/api#getfile): current hosted download limit and file URL lifetime.
- [Telegram Bot API — local server features](https://core.telegram.org/bots/api): local mode enables downloads without a size limit and uploads up to 2000 MB.
- [Telegram Bots FAQ](https://core.telegram.org/bots/faq): bot send limit up to 50 MB.
- [Telegram MTProto file transfers](https://core.telegram.org/api/files): `upload.getFile`, chunked offset/limit downloads, file-reference refresh requirements.
- [Working with bots using MTProto](https://core.telegram.org/api/bots): `auth.importBotAuthorization` uses a bot token and still requires an API ID.
- [Telegram Bot API server repository](https://github.com/tdlib/telegram-bot-api): local-mode operational requirements and capabilities.
