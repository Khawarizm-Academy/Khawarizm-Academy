# Video Hosting — استضافة الفيديو

The player side of Telegram-backed encrypted HLS playback. This feature is the
only place the stream endpoints are called and the only place hls.js is
configured; it hands the courses player a tokenized master URL and an
anti-record watermark.

## At a glance

| | |
| :--- | :--- |
| **Routes** | — (the courses player consumes it) |
| **Depends on** | `features/courses` (mounts the stage), `features/auth` (the watermark identity) |
| **Entries** | `hooks/useHlsPlayback.ts`, `data/videoHostingFetchers.ts` |
| **Styles** | `.player-watermark` in `features/courses/courses.css` |

## Purpose

- **Attach:** mint a short-lived, IP-bound grant and point hls.js (or native HLS
  on Safari) at the tokenized master playlist.
- **Deter capture:** draw a moving viewer stamp over the frame so a recording is
  traceable to one account.
- **Stay thin:** the backend does tokens, manifests, and keys; this feature never
  touches video bytes — segments resolve to Telegram's CDN.

## Structure

```text
videohosting/
├── components/
│   └── overlays/
│       └── WatermarkOverlay.tsx     canvas viewer stamp
├── data/
│   ├── videoHostingFetchers.ts      fetchVideoMeta / mintStreamGrant
│   └── videoSlug.ts                 lesson → hosting slug mapping
├── hooks/
│   └── useHlsPlayback.ts            hls.js attach + lifecycle
├── types.ts                         HostedVideoMeta, StreamGrant
└── README.md
```

## How it works

- **Grant.** `mintStreamGrant(slug)` → `POST /videos/:slug/token` returns an
  absolute, tokenized `masterUrl`. Every mount mints a fresh grant because
  tokens are IP-bound and expire — a cached one would be rejected later.
- **Attach.** `useHlsPlayback` prefers native HLS (`canPlayType`), falls back to
  `Hls.js`, and surfaces fatal errors through the returned `status`/`reload`.
- **Playback clock.** The courses `videoPlayerStore` exposes
  `bindMediaElement` / `syncFromMedia`: when a real `<video>` is bound the store
  mirrors the element (no simulated ticker), and every control (`play`, `skip`,
  `setSpeed`, `mute`) drives the element directly. Unhosted lessons keep the
  placeholder surface and the simulated engine.
- **Watermark.** `WatermarkOverlay` paints the signed-in viewer's email over the
  frame, drifting each tick so a still capture cannot mask it.
- **Slug.** `videoHostingSlugFor(courseId, lessonId)` produces
  `<courseId>--<lessonId>`, matching the backend ingest convention.

## Data

| Source | Provides |
| :--- | :--- |
| `data/videoHostingFetchers.ts` | `GET /videos/:slug`, `POST /videos/:slug/token` |
| `features/auth` (`useAuth`) | the signed-in viewer identity for the watermark |
| `features/courses` | the active course/lesson and player chrome |

## Related

- Backend feature: [`../../../../backend/features/videohosting/README.md`](../../../../backend/features/videohosting/README.md)
- Player: [`../courses/README.md`](../courses/README.md)
- Backend contract: [`docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
