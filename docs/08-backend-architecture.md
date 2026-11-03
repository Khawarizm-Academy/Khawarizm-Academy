# 08 · Backend Architecture

How the Django service is organised and how the provider-backed video control plane fits the feature-first backend. Read this with [07 · Backend Contract](07-backend-contract.md); the source of truth for video routes is `backend/features/videohosting/urls.py`.

## 1. One feature = one app = one folder

The backend mirrors `frontend/src/features/`. Each feature owns its models, serializers, views, routes, admin, migrations, tests, and README. `studio` owns private instructor-student notes and exposes course authoring, roster, and analytics views over the `courses`, `access`, `dashboard`, `quizzes`, and `videohosting` domains.

The video feature owns `VideoProvider`, `VideoAsset`, `VideoCaption`, `VideoRendition`, `VideoSegment`, `StreamToken`, `DriveGrant`, `DriveAuthState`, `VideoSystemConfig`, `ProviderAsset`, and `UploadSession`. `ProviderAsset` and the original `UploadSession` shape remain historical compatibility tables; the live Studio upload path uses the current provider hooks and `UploadSession` fields.

## 2. Video control-plane/data-plane split

`videohosting` never treats a provider URL as a public application contract. It stores provider-neutral metadata and provider handles, then delegates transport mechanics to one `ProviderSpec` per provider in `providers/`:

```text
backend/features/videohosting/
├── urls.py                 public meta/token/raw + stream routes
├── views.py                entitlement, grants, playlists, keys, ranges
├── studio_uploads.py       provider-neutral resumable Studio protocol
├── studio_assets.py        owned metadata and WebVTT mutations
├── console/                admin providers/assets/policy/diagnostics/OAuth
├── providers/base.py       ProviderSpec, checks, upload protocol
├── providers/telegram.py  Telegram ingest, HLS segment publishing, redirects
├── providers/google_drive.py OAuth-backed upload and bounded raw stream
├── playback_plan.py       package/raw/refuse decision table
├── ingest.py               source → package → publish pipeline and tracker
├── packaging.py            FFmpeg AES-128 HLS ladder
├── tokens.py               hash-only, IP-bound, expiring grants
└── migrations/             schema and legacy source/mode backfill
```

The provider spec supplies capabilities, environment/deep checks, `store_source`, optional `store_package`, raw streaming, file-path refresh, segment redirect, OAuth/cleanup, and Studio upload hooks. Adding a provider is a module plus one registry entry; views and diagnostics do not grow a provider-code branch ladder.

## 3. Plan before bytes

`playback_plan.resolve_playback_plan()` applies request choice (`auto|always|never`, with CLI `force` alias), provider policy, global `VideoSystemConfig.use_ffmpeg`, and host capabilities. The result is `hls`, `raw`, or `refused` with a reason. Unsupported plans are rejected before provider storage.

- Telegram has no supported raw hook. Hosted Bot API raw download limits make the S-1 general raw fallback NO-GO. A Studio Telegram source is spooled only on a persistent writable `VIDEO_SPOOL_DIR`, then a background ingest requires a persistent FFmpeg-capable host to publish encrypted HLS. Missing prerequisites return `provider_requires_packaging`; new Telegram uploads are not intentionally left staged.
- Drive is a private source store with OAuth-backed raw reads. The S-2 spike rejects Drive as the v1 HLS origin. The Drive provider therefore has `store_source` and `raw_stream`, not a Drive HLS package target. Raw mode is `ready` with `protection=gated`; HLS mode is not claimed for Drive.
- Link providers are separate: validated YouTube/Vimeo links use `embed` with an allow-listed host; other validated external links use `external`. Their grants intentionally carry no bearer token.

The migration backfill is conservative: existing master playlists become `hls/encrypted`; Drive source IDs become `raw/gated`; only one matching `<course>--<lesson>` row is linked, and ambiguous lesson links are logged/skipped. `manage.py package_pending` is the bounded recovery command for stale `processing`/legacy `staged` rows: it requires a persistent spool, downloads a retained provider source when supported, forces HLS packaging, locks concurrent runs, skips rows without a source/package target, and redacts provider URIs from errors. It is not a reason to stage new unsupported Telegram uploads.

## 4. Upload pipeline and secrecy

The admin multipart upload is a real-server worker path; the Studio path is resumable and provider-neutral:

1. authenticate and check `videos.upload`/ownership/configuration;
2. resolve the provider and plan, validate extension, MIME, size/quota, and first-chunk magic;
3. create a provider session, but return only `sessionId`, `chunkSize`, `offset`;
4. accept raw binary chunks with strict inclusive `Content-Range`, probe authoritative provider offsets, and make duplicate ranges idempotent;
5. complete the provider session and persist only source identifiers and mode/protection;
6. run provider-specific packaging/publishing and update asset/session progress.

`VIDEO_UPLOAD_CHUNK_BYTES` defaults to 4 MiB for the relay. This is `16 × 256 KiB`, satisfying Drive’s resumable alignment while staying under the documented Vercel body cap when sent as raw binary. Provider session URIs, Drive bearer tokens, Telegram upload credentials, and secrets never enter a response or log. The Studio response is `private, no-store`.

`ingest.py` uses a weighted progress tracker (source upload, FFmpeg packaging, segment publishing). Errors land on the asset row as `status=error` with a bounded message. The worker is a thread, not Celery; persistent hosts are required for long-lived Telegram spool/FFmpeg work.

## 5. Playback and entitlement boundary

`playback_access()` is the shared policy for both direct asset token minting and lesson playback. It evaluates, in order, video admin/watch-any, asset owner, course staff/editor, free-preview lesson, and enrolled learner with `lessons.watch`. Direct metadata hides non-entitled assets as 404; token minting returns `not_entitled` for authenticated callers. A lesson playback request resolves the linked `CourseLesson`, so the client cannot invent a slug.

For HLS/raw, `tokens.mint()` stores only a SHA-256 hash, binds the grant to the client IP, and applies the normal or preview TTL. Manifests retain `__TOKEN__` placeholders at rest; request-time rewrite injects the grant into playlist/caption URIs. Master/media/key/caption responses are `no-store`; the AES key is server-only and segment requests redirect to the provider rather than proxying bytes.

Drive raw serving is the exceptional byte path. `raw_video_view` accepts the token in the query because media element/segment requests cannot rely on an Authorization header, calls Drive with the backend OAuth bearer, normalizes one range to `VIDEO_RAW_RANGE_CAP_BYTES` (default 8 MiB), bounds concurrent streams at four by default, verifies the upstream `206` window, and emits `private, no-store`. Provider URLs and OAuth credentials are never forwarded to the browser.

## 6. Console and diagnostics

The admin video console is owned by `videohosting.console`, although its URL prefix remains `/api/admin/`. `videos.manage_any` governs global asset operations; `videos.configure` governs provider policy, `useFfmpeg`, diagnostics, and Drive OAuth. `videos.manage_own`, `videos.upload`, `videos.use_embed`, `videos.package`, and `videos.watch_any` remain distinct catalog permissions. The provider listing is a registry projection with `available`/`reason`; the policy endpoint persists `auto|always|never`; the diagnostics endpoint is shallow/offline by default and deep only when the admin asks for live Telegram/Drive probes.

Drive OAuth is authorization-code/offline access with `drive.file`. `DriveGrant` stores the refresh token server-side; the browser sees only `authUrl`, account email/status, or neutral callback HTML. The deep Drive check can mint a bearer and perform a disposable 1-byte write probe, but no real test account was used for the Phase 4 spike; live OAuth/upload/raw playback acceptance is therefore still outstanding.

## 7. Typed configuration

`config/settings.py` parses booleans, integers, and lists with typed helpers. Relevant video defaults are:

| Setting | Default / purpose |
| :--- | :--- |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | `google_drive` |
| `VIDEO_HOSTING_USE_FFMPEG` | `true`; copied into the singleton on first creation |
| `VIDEO_UPLOAD_MAX_BYTES` | 2 GiB source cap |
| `VIDEO_UPLOAD_CHUNK_BYTES` | 4 MiB relay chunk |
| `VIDEO_USER_QUOTA_BYTES` | 20 GiB per user; managers are exempt |
| `VIDEO_SPOOL_DIR` | empty; must be an absolute persistent writable directory for Telegram Studio uploads |
| `VIDEO_RAW_RANGE_CAP_BYTES` | 8 MiB per raw request |
| `VIDEO_RAW_MAX_CONCURRENT` | 4 raw streams per process |
| `STREAM_TOKEN_TTL_HOURS` | 6 hours |
| `VIDEO_GRANT_TTL_PREVIEW_MINUTES` | 30 minutes |
| `VIDEO_EMBED_ALLOWED_HOSTS` | `youtube-nocookie.com,vimeo.com` |
| `LIVE_ALLOWED_HOSTS` | `meet.google.com,zoom.us,teams.microsoft.com,teams.live.com,whereby.com` |

Provider credentials and Google OAuth client values are backend-only. A real Drive account acceptance remains an external gate, not a passed implementation claim.

## 8. Quizzes and server-authoritative grading

`features/quizzes` owns quiz/question/option/attempt/answer/grant tables and mounts both learner routes and Studio authoring routes under `/api/`. `quizzes.services` validates enrollment, progress unlocks, attempt limits, option ownership, deadlines, grading, and reveal policy; views do not decide correctness. Per-attempt question and option order is persisted so reloads are stable. Active-attempt serializers exclude answer keys and feedback, and the result serializer is the only path that may expose correctness.

The retained legacy problem URLs are served by the quizzes feature too. Their list serializers strip correct IDs, explanations, and hints; explicit check endpoints grade on the server. The shared cleanup service lazily imports `quizzes.services.expire_overdue()` to finalize abandoned timed attempts without making the low-level common app import feature models at module load.

## 9. Phase 10 teaching-tool boundaries

`courses` remains the owner of live-session rows. Start times are stored as
timezone-aware instants with an IANA display timezone; labels/state are derived
at serialization, while cleanup only synchronizes compatibility state. Legacy
labels are backfilled only for an exact seeded date/time pattern; ambiguous DST
wall times and all unrecognized labels stay unresolved rather than guessed.
Meeting hosts are validated against `LIVE_ALLOWED_HOSTS` without server-side
fetches. Learner course detail reveals meeting, replay, and session-note fields
only to enrolled learners or authorized course staff and marks that response
`private, no-store`.

`announcements` owns sanitized Markdown posts, a database-backed daily quota
(three per course/day), and a single-pinned-post constraint; it emits an
after-commit signal for the Phase 11 notification service rather than writing
notifications itself. `studio` owns private learner notes, while roster email
masking and CSV formula escaping happen on the server. Analytics groups and
aggregates enrollments, progress, watch percent, and quiz results in SQL; an
unavailable rating metric is represented explicitly instead of fabricated.

## 10. Phase 11 learning-loop ownership

Progress is derived, never reported. The learner's heartbeat
(`PUT /api/courses/<slug>/lessons/<lesson_id>/progress`) moves a server-side model
that is **monotonic per lesson** — a client cannot un-complete a lesson by sending
zero — and carries `curriculum_revision` so an edit to the curriculum after a
learner watched something is detected instead of silently re-marking them.

Ownership stays where the data lives:

| Concern | Owner | Why it is not in `studio` |
| :--- | :--- | :--- |
| Lesson progress, completion, milestone signals | `courses` + `dashboard` | The curriculum and enrollment rows are `courses`/`dashboard` state |
| Certificate issue / revoke + serials + snapshots | `courses/certificate_services.py` | Issuance needs the whole course view (all published lessons + required exam) |
| Reviews (eligibility, one-per-course, aggregate) | `reviews` | `Course.rating` is recomputed under `select_for_update`, so it cannot be a client field |
| Discussions (threads, posts, accepted answer) | `discussions` | Sanitizing and quotas belong to the writer, not the tab component |
| Notification delivery | `dashboard` receivers/hooks | Preference checks, dedupe and unread-count caching happen once, for every feature |

The rule between them: a feature emits an **after-commit signal** and never writes
another feature's rows. `announcements`, `reviews`, `discussions` and certificate
issuance all hand off to the central notification delivery rather than building
inbox rows themselves.

## 11. Structural access enforcement (Phases 12–13)

Three artifacts turn "did we remember to guard it" into a build result:

1. **`config/route_access.py` — the manifest.** Generated from `get_resolver()`
   introspection by `python -m scripts.gen_route_access` (format-stable, so
   regenerate → `ruff format` → diff is empty). Every `/api/` URL name lands in
   exactly one of four buckets: public, authenticated-only, permissioned, or
   method-scoped. `config/tests.py::RouteAccessManifestTests` fails when a route is
   missing or names a key outside the catalog.
2. **`config/test_denial_matrix.py`.** Table-driven *from that manifest*, so the
   test surface cannot drift from the route surface: each guarded route is called
   anonymously (401), as a student (403), and as a granted role (anything but
   401/403). Adding an endpoint without a gate fails here, not in production.
3. **Observability.** `features/common/observability.py` emits structured events
   (`log_event`) and a throttled permission-denial counter keyed by resolved URL
   name; every non-2xx body carries a `requestId` that matches the log line and the
   `X-Request-ID` header. Features import `observability`, never `config.logging`.

Phase 12 also removed the last structural shortcut — the `IsAdminRole` class, the
single-role endpoint and the `isAdmin` UI fallback — so there is exactly one path
from "what may I do" to the catalog. See [09 · Access Control](09-access-control.md).

## 12. Budgets as code

Performance claims are executable, in-repo, and offline:

| Gate | What it proves |
| :--- | :--- |
| `backend/scripts/p95_latency.py` | p95 per sampled route inside rolled-back transactions with real fixtures, capped at each route's own throttle (0.6–9.2 ms measured against 50/150/250 ms budgets) |
| `backend/scripts/query_pins.py` → `plan/query-pins.md` | Every `assertNumQueries` pin indexed, so a query regression names the feature that caused it |
| `frontend/scripts/bundle-budget.mjs` | Walks the initial import graph of `dist/`, gzips it (shell 89.4 KB), and fails if a lazy engine — hls.js — is pulled into the shell |
| `frontend/scripts/audit-gate.mjs` | Dependency audit against a **dated** waiver list; an expired waiver fails the build |
| `frontend/scripts/i18n-gate.sh`, `grep-gate.sh` | No raw Arabic literals in gated feature folders; no `isAdmin` reads in components |

The p95 harness is the one to remember when writing new fixtures: sampling a route
above its scoped throttle measures the throttle, not the endpoint.

## Related

- API surface and exact endpoints: [07 · Backend Contract](07-backend-contract.md)
- Permissions, roles, route manifest: [09 · Access Control](09-access-control.md)
- The authoring surface on top of these apps: [10 · Studio](10-studio.md)
- Providers, plans, entitlement, uploads: [11 · Video Platform](11-video-platform.md)
- Operating it: [13 · Operations Runbook](13-operations-runbook.md)
- Feature map: [`backend/features/README.md`](../backend/features/README.md)
- Video feature runbook: [`backend/features/videohosting/README.md`](../backend/features/videohosting/README.md)
