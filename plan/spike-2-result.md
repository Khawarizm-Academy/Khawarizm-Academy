# Phase 4 Spike S-2 — Google Drive as an HLS origin

**Date:** 2026-11-02
**Decision:** **NO-GO** for Drive-backed HLS as the private production playback origin in v1. Keep Drive as a private storage provider with the Phase 4 authenticated, bounded raw-media proxy. Revisit only if a measured prototype demonstrates acceptable concurrency, latency, quota, and operating cost.

## Findings

- Google Drive's supported private binary download path is `files.get` with `alt=media` and an OAuth bearer whose scope permits reading file contents. Google's API explicitly supports HTTP `Range` requests, so the existing raw-proxy direction is technically supportable.
- `webContentLink` is documented as a browser download link for binary files. The reviewed documentation does not promise an HLS/CDN contract, stable streaming URL, cache behavior, media SLA, or per-viewer entitlement. Making HLS segments directly accessible to viewers would transfer authorization to Drive sharing and weaken the academy's per-viewer entitlement/revocation boundary.
- A private proxy could fetch each playlist/segment/key from Drive, but it would put every HLS object request and its bandwidth through the application/edge. Segment-per-file packaging multiplies Drive object and request work. This is architecture inference from the documented API; it needs load testing before any production claim.
- Drive's published limits include 1,000,000 quota units/minute/project, 325,000 quota units/minute/user/project, and a 1 TB/day/project egress threshold before charges apply. Quota errors can be 403/429; Google recommends bounded exponential backoff.

## Validation limits

The API capabilities and quotas are verified from official Google documentation. No live Drive account, HLS packaging target, or expected-production-concurrency test was available in this spike. This decision rejects Drive as the v1 HLS origin; it does **not** reject authenticated Range reads for the existing raw mode.

## Sources

- [Google Drive API — Download and export files](https://developers.google.com/workspace/drive/api/guides/manage-downloads): authenticated `alt=media` downloads, content-read scope, and HTTP Range support.
- [Google Drive API — Files resource](https://developers.google.com/drive/api/reference/rest/v3/files): `webContentLink` is a browser download link for binary content.
- [Google Drive API — Limits](https://developers.google.com/drive/api/guides/limits): quota, egress threshold, rate-limit errors, and retry guidance.
