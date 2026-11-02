# Access Upgrade — Phase 5: Video Player System (result)

**Branch:** `Feature/PlayerSystem` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** responsive grant-driven lesson player, lazy playback engines, resume/progress integration, accessible controls, and visual QA.

## What landed

| Area | Result |
| :--- | :--- |
| Engine architecture | Added a typed engine contract and data-driven lazy registry for HLS.js, native HLS, progressive raw/external files, YouTube, and Vimeo. Vimeo Player is pinned as an allowed dependency; unsupported controls are capability-gated. Engine adapters own event listeners, SDK/player teardown, and truthful capabilities. |
| Grant and progress lifecycle | Replaced guessed video-slug playback with the Phase 4 lesson grant endpoint. Added abort-on-change, one bounded grant refresh for token/network failures, resume handling, progress heartbeats and lifecycle flushes, and cause-specific failure states. |
| Single responsive stage | Replaced the duplicated desktop/mobile player surfaces with one responsive `PlayerStage`. Removed the simulated provider table, ticker, and HLS-only hook. `videoPlayerStore` now mirrors the attached engine and persists only non-secret, per-user preferences. |
| Learner experience and accessibility | Added Arabic player copy, resume/up-next/error overlays, source/protection badges, media-session/fullscreen/PiP/AirPlay actions when supported, mobile gestures, keyboard help, modal settings-sheet semantics with focus management, 44px touch controls, and reduced-motion behavior including the watermark. |
| Documentation and evidence | Updated the project profile and course/video-hosting feature guides. Captured a 15-image Chromium matrix covering loading/initial, playing, paused, error, and up-next states at 375, 768, and 1280px under `plan/evidence/phase-5/`. |

## Verification

| Gate | Result |
| :--- | :--- |
| Frontend `npm test` | **141 tests passed in 20 files.** |
| Frontend `npm run lint` | Pass; no errors or warnings. |
| Frontend `npm run build` | Pass. Vite emits a non-blocking advisory for the separately emitted lazy HLS.js chunk (575.28 kB minified); it is not part of the initial main bundle. |
| Bundle budget comparison | Phase 4 baseline and Phase 5 main bundle both measure **91.72 kB gzip** (`index` chunk), a 0.00 kB increase. The player route and playback engines are emitted as separate lazy chunks. |
| Browser visual QA | Chromium screenshots for five player states at 375×812, 768×1024, and 1280×900. The successful run reported **no page or console errors**. API responses and the YouTube iframe SDK were mocked at the integration seams; no live provider stream was claimed. |
| `git diff --check` | Pass. |

Representative screenshots: [375px mobile playing](evidence/phase-5/player-375-playing.png), [768px tablet playing](evidence/phase-5/player-768-playing.png), and [1280px desktop playing](evidence/phase-5/player-1280-playing.png). The complete matrix follows `player-{375,768,1280}-{loading,playing,paused,error,up-next}.png`.

## Scope and limitations

The frontend validates engine contracts with mocked SDKs and API seams; it does not prove live playback against production HLS/raw storage, an enrolled account, or real YouTube/Vimeo/MP4 origins. The Phase 4 Google OAuth and upload acceptance remains a separate documented limitation. No backend files or production data were changed in Phase 5.

## Integration closeout

- Feature commit: `5f8f06b` on `Feature/PlayerSystem`.
- PR [#51](https://github.com/Khawarizm-Academy/Khawarizm-Academy/pull/51) was squash-merged into `Feature/AccessStudio` on 2026-11-02 as `a8f940cdfdb5d442de875b1c09ac7f73389a5398`.
- At merge, GitHub showed zero failing checks, one successful check, and six pending checks. Local frontend gates were green; following the owner's instruction to avoid unnecessary waits, integration proceeded without claiming the pending checks completed.
- The local `Feature/AccessStudio` branch is fast-forwarded to the merge commit.
- Production `main` remains unchanged.
