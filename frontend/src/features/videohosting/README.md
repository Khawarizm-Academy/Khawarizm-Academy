# Video Hosting — استضافة الفيديو

The frontend control plane for real lesson playback. The backend resolves each lesson's linked asset, checks entitlement, and returns a short-lived playback grant; this feature selects a lazy engine for that grant and mirrors its real events into the course player.

## At a glance

| | |
| :--- | :--- |
| **Routes** | No standalone pages; consumed by the course player |
| **Depends on** | `features/courses` for the single player stage and `features/auth` for per-user preferences/watermark identity |
| **Entries** | `hooks/usePlayback.ts`, `engines/registry.ts`, `data/videoHostingFetchers.ts` |
| **Styles** | Player surfaces live in `features/courses/courses.css` |

## Playback flow

1. `usePlayback` requests `POST /courses/:courseSlug/lessons/:lessonId/playback`. It does not guess an asset slug or reuse cached grants. The server resolves the lesson, authorizes the viewer, and returns the supported mode, source URLs, captions, resume point, and next lesson.
2. `resolveEngineLoader` selects an engine by grant mode/provider and loads its code only when needed: native HLS or hls.js, a progressive/raw `<video>`, YouTube, or Vimeo. Iframe engines validate their HTTPS provider origin and use `no-referrer`.
3. Each adapter attaches to the one `PlayerStage` host and reports normalized time, state, quality, captions, readiness, and errors. The UI store has no synthetic clock; controls issue commands to the active engine.
4. Lesson heartbeats use `PUT /courses/:courseSlug/lessons/:lessonId/progress`, are bounded/coalesced, and flush on intervals, pause/end, visibility/page exit, and player cleanup. Resume and up-next data remain server-authoritative; the next lesson requires a learner action.

## Structure

```text
videohosting/
├── components/overlays/                 Error, resume, up-next, protection and watermark surfaces
├── data/
│   ├── videoHostingFetchers.ts           Lesson grant, progress, and legacy metadata requests
│   └── playerCopy.json / playerCopy.ts   Arabic player copy
├── engines/
│   ├── registry.ts                       Lazy mode/provider-to-engine mapping
│   ├── mediaEngine.ts                    Native media lifecycle and capabilities
│   ├── hlsEngine.ts / nativeHlsEngine.ts HLS adapters
│   ├── fileEngine.ts                     Raw and validated external media
│   ├── youtubeEngine.ts / vimeoEngine.ts Provider embed adapters
│   └── types.ts                          Normalized adapter/event contract
├── hooks/usePlayback.ts                  Grant, attach, retry, resume and progress state machine
├── types.ts
└── README.md
```

## Boundaries and safety

- Grant responses are private and short-lived. `usePlayback` aborts stale requests and destroys engine listeners, SDK instances, timers, and media elements on lesson changes or unmount.
- Fatal HLS/raw token failures get a bounded fresh-grant retry; raw busy responses use bounded backoff. Other failures are surfaced with localized, cause-specific copy and a retry action.
- The settings menu is capability-driven. Quality/caption choices are hidden when the active provider exposes no usable levels/tracks; PiP and AirPlay are shown only when the attached browser media element supports them.
- Viewer marks are a deterrent, not DRM. The canvas watermark respects `prefers-reduced-motion`; protection badges reflect the server's actual protection mode.
- Per-user speed, volume, quality, caption language, mute, and theater preferences use local storage only; access tokens and playback grants are never persisted there.

## Related

- Course player: [`../courses/README.md`](../courses/README.md)
- Backend video feature: [`../../../../backend/features/videohosting/README.md`](../../../../backend/features/videohosting/README.md)
- API contract: [`../../../../docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
