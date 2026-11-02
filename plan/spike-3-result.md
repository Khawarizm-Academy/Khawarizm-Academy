# Phase 4 Spike S-3 — 4 MiB Drive resumable relay

**Date:** 2026-11-02
**Decision:** **GO** for implementing the 4 MiB relay with a fake transport and protocol-complete offline tests. **Live acceptance remains unverified** until the same upload/resume flow is exercised with an authorized Google OAuth test account; do not report mocked tests as proof of live Drive behavior.

## Findings

- Google Drive creates a resumable session and returns its `Location` URI. Chunk requests carry `Content-Length` and inclusive `Content-Range`; non-final chunks must be multiples of 256 KiB, while the final chunk may be smaller. An accepted incomplete upload returns `308 Resume Incomplete`; completion returns `200` or `201`.
- A bodyless `PUT` status query with `Content-Range: bytes */TOTAL` returns the authoritative committed `Range`; if `Range` is absent, no bytes have been accepted. A `404` indicates an expired session. The Drive guide says resumable sessions expire after one week of inactivity. The service must follow the returned offset and must not assume every submitted byte landed.
- **4 MiB = 16 × 256 KiB**, so it meets Drive's chunk alignment. Vercel currently documents a **4.5 MB** maximum request or response body. Send each chunk as raw binary (not JSON/base64) and keep the body comfortably within that limit.
- Fake-transport tests can prove session initiation, ranges, partial acceptance, offset probing, duplicate/reload resume behavior, finalization, expiry, and bounded retries. They cannot prove that a real OAuth scope, account permissions, Drive quota, session URI, or deployed serverless request path succeeds.

## Validation limits

The protocol and Vercel limit were checked against current official documentation. No live Drive OAuth grant was used; the production-account acceptance required by the plan is **pending**. Implementation should be mock-tested, with a future credentialed smoke test recorded separately rather than silently treating it as complete.

## Sources

- [Google Drive API — Upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads): session URI, `Content-Range`, 256 KiB alignment, `308`/`Range`, empty-`PUT` status checks, expiry, and resume behavior.
- [Vercel Functions — Limits](https://vercel.com/docs/functions/limitations): 4.5 MB request and response payload cap and 413 behavior.
