# Access Upgrade — Phase 4: Video Platform Backend (result)

**Branch:** `Feature/VideoPlatform` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** provider-resolved playback, entitlement enforcement, resumable uploads, captions, progress, remote cleanup, and bounded raw streaming.

## What landed

| Area | Result |
| :--- | :--- |
| Provider registry and plan resolution | Added data-driven provider capabilities and hooks, a pure `resolve_playback_plan` decision function, packaging policy per provider, strict YouTube/Vimeo/HTTPS reference parsers, and provider-owned upload/download/delete hooks. New Telegram uploads are refused when the persistent packaging requirements are unavailable; Drive uses gated raw playback where HLS packaging is unavailable or disabled. |
| Additive schema and backfill | Added stored playback/protection/link metadata, captions, upload-session state, lesson progress, and remote-orphan audit action. Added idempotent legacy mode/link backfill migrations without guessing ambiguous lesson matches. |
| Entitlements and learner APIs | Added ordered admin/owner/staff/free-preview/enrollment access rules, server-resolved lesson playback with resume/next-lesson data, short preview grants, token-gated no-store WebVTT captions, and throttled monotonic lesson progress. Anonymous requests cannot match the staff/editor rule. |
| Instructor video APIs | Added paged Studio video/provider endpoints, link creation, validated captions, asset editing/deletion guards, Drive resumable session/chunk/status/complete/cancel routes, Telegram persistent-spool uploads, per-user quota checks, ownership enforcement, and server-only storage of Drive upload URIs. |
| Upload recovery and cleanup | Added provider-agnostic `package_pending` recovery for stale processing/legacy staged assets with source-download hooks, stale claims, a cross-process lock, temporary-file cleanup, and URI-safe failure reporting. Added best-effort Drive/Telegram remote deletion with orphan auditing. |
| Raw proxy and admin console | Added bounded Range windows, validated upstream 206/Content-Range, concurrency backpressure, safe no-store/referrer/content headers, and mode gating. Retrofitted video admin permissions, paged assets, packaging-policy API/UI, diagnostics, and localized provider availability reasons. |
| Documentation and spikes | Updated the project profile, API/architecture guides, backend and frontend feature guides, Drive guide, settings placeholders, and the three spike result notes. |

## Spike decisions

- **S-1 Telegram raw playback: no-go.** Hosted Bot API raw playback is not suitable for the required file sizes; no raw Telegram mode was added. See [spike 1 result](spike-1-result.md).
- **S-2 Drive HLS origin: no-go for v1.** Drive remains a private source behind authenticated, bounded raw Range playback rather than an HLS segment origin. See [spike 2 result](spike-2-result.md).
- **S-3 Drive resumable relay: protocol implemented and offline-tested; live acceptance remains outstanding.** No real Google OAuth account/folder/upload/resume/raw-playback run was available, so this is not claimed as passed. See [spike 3 result](spike-3-result.md).

## Verification

| Gate | Result |
| :--- | :--- |
| Backend `manage.py test --parallel 4` | **654 tests passed; 1 skipped** on a uniquely isolated temporary SQLite test database. |
| Backend `ruff check .` / `ruff format --check .` | Pass; 206 Python files checked/formatted. |
| `manage.py check` | Pass; no issues. |
| `manage.py makemigrations --check --dry-run` | Pass; no changes detected. |
| `manage.py spectacular --fail-on-warn` | Pass; zero schema warnings/errors, including binary chunk and `Content-Range` documentation. |
| `manage.py migrate --noinput` | Pass; all migrations applied, with no pending migrations on the final run. |
| Frontend `npm test` | **109 tests passed in 15 files.** |
| Frontend `npm run lint` / `npm run build` | Pass. Vite emitted a non-blocking large-chunk advisory (the course-player bundle exceeds 500 kB). |
| Focused Studio upload tests | **12 passed** with provider HTTP fully mocked; upload URIs remained server-side. |
| Focused recovery/provider tests | **6 package-recovery tests** and **22 provider/ingest/Drive regression tests** passed with isolated test databases. |
| Browser visual audit / live provider account | Not performed. The UI policy control has component coverage and the production build passes; real Drive OAuth/upload/resume acceptance remains a documented manual limitation. |

## Integration closeout

- Feature commit, integration PR, and remote check state will be recorded after the branch is pushed and merged into `Feature/AccessStudio`.
- Production `main` remains unchanged; Phase 4 targets the project integration branch.
