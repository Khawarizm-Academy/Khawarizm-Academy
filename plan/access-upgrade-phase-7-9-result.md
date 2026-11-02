# Access Upgrade — Phases 7–9: Studio workspace, editor, and video library (result)

**Branch:** `Feature/StudioVideos`
**Date:** 2026-11-02
**Scope:** Studio workspace/dashboard, course editor and curriculum authoring, learner-safe article preview, video library, resumable uploads, and the combined regression suite for Phases 7–9.

## What landed

| Area | Result |
| :--- | :--- |
| Phase 7 — Studio workspace | Added permission-aware Studio navigation and course workspace surfaces, actionable overview/review inbox, course search/sort/bulk actions, onboarding state, and owner-scoped team candidate discovery/removal. Read-only Studio access is routed to learner preview rather than edit controls. |
| Phase 8 — Course editor | Added the course/curriculum editor with module and lesson authoring/reordering, draft settings and slug save, related-course selection, team management, learner preview, Markdown authoring/rendering through a sanitizer, HTTPS-only resources, and protected lesson article retrieval. Autosave tracks server versions, reports offline/stale conflicts, and supports field-level reconciliation. |
| Phase 9 — Video library/uploader | Added the Studio video library, provider/packaging capability display, resumable chunk queue with persisted first-chunk fingerprint and file re-selection after reload, retry/backoff handling, shared hostile/valid URL vectors, lesson-picker integration, typed deletion and published-usage guards, captions, metadata/poster editing, and a real staff-entitled preview using the existing playback engine. Playback grants and private detail responses are no-store. |
| Access and data safety | Added owner-scoped staff search/removal, permission-aware action gating, account-scoped course caches, private course/article responses, HTTPS validation for resource/poster URLs, and server-side checks for destructive or entitlement-sensitive actions. |
| Documentation and regression coverage | Updated Studio/video feature READMEs and the backend contract. Added combined Phase 7–9 backend and frontend tests, including the shared video URL vector corpus and resume-fingerprint, editor, team-permission, cache, and playback-header cases. |

## Verification

| Gate | Result |
| :--- | :--- |
| Backend Ruff | `ruff check .` and `ruff format --check .` passed. |
| Django/schema/migrations | `manage.py check` passed; strict OpenAPI generation with `--fail-on-warn` passed; `makemigrations --check --dry-run` found no drift; all migrations applied to a fresh isolated SQLite database. |
| Production-mode Django check | `check --deploy` completed successfully with one advisory: `security.W021` because `SECURE_HSTS_PRELOAD` is not enabled. |
| Full backend suite | **697 tests ran; 1 skipped; all remaining tests passed** on an isolated SQLite test database, sequentially (`422.983s`). |
| Frontend `npm test` | **194 tests passed across 25 files.** |
| Frontend `npm run lint` | Passed with no reported findings. |
| Frontend `npm run build` | Passed. Vite emitted its non-blocking chunk-size advisory for the separately loaded HLS engine chunk (575.70 kB minified); the application bundle still builds successfully. |
| `git diff --check` | Passed. |

## Scope and limitations

Same-asset source replacement is intentionally unavailable. Current provider/upload/packaging contracts do not guarantee an atomic swap or rollback that preserves the old working source if upload, packaging, or background ingest fails. The detail drawer explains this limitation rather than exposing an unsafe replacement action. A future implementation should use a shadow asset and promote it only after the new source is fully ready, then schedule old-source cleanup.

Verification used local isolated SQLite databases and the existing mocked frontend/API test seams. No production learner account, production database, or live provider upload was used for end-to-end testing. The one skipped backend test and the two non-blocking advisories above are retained as reported by the tools.
