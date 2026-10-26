# 07 · Backend Contract

The frontend is **fully API-driven** — there are no mocks. A Django + DRF service
with a Postgres/SQLite database in `backend/` implements this contract, so this
document is both the specification and the reference for what is built. See
[`backend/README.md`](../backend/README.md) for how to run it.

This page describes the environment, the domain entities, the data flows the UI
expects, and the REST surface that serves them.

---

## 1. Environment

Both sides read their configuration from **profiles** (dev + production), so
origins change without editing code.

**Frontend** — Vite loads the profile by mode:

| File | Loaded by | Purpose |
| :--- | :--- | :--- |
| `frontend/.env.development` | `npm run dev` | `VITE_API_BASE_URL=http://localhost:8000/api` |
| `frontend/.env.production` | `npm run build` | Production API origin |
| `frontend/.env.local` (gitignored) | any | Machine-specific override |

`VITE_API_BASE_URL` is **required**: the app always reads the API at that origin
(no fallback), so a missing value throws at startup. The backend must be running.

**Backend** — `config/settings.py` loads the profile named by `DJANGO_ENV`
(default `development`) with `python-dotenv`:

| File | Loaded when | Purpose |
| :--- | :--- | :--- |
| `backend/.env.development` | `DJANGO_ENV` unset / `development` | Local dev |
| `backend/.env.production` | `DJANGO_ENV=production` | Production deploy |

```env
DJANGO_DEBUG=true
DJANGO_SECRET_KEY=dev-only-change-me
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Real environment variables always win over the profile file, so in deployment you
set these in the platform/host environment. `DJANGO_CORS_ALLOWED_ORIGINS` is a
comma-separated allow-list of the frontend origins, and a non-debug run **fails
loudly** while `DJANGO_SECRET_KEY` is still a placeholder.

**On Vercel**, the profile files are skipped (Vercel sets `VERCEL=1`); set the
values as Project Environment Variables instead. `DATABASE_URL` selects Postgres
and `.vercel.app` hosts/origins are allowed automatically. Without
`DATABASE_URL`, the build bundles an SQLite file that is read-only at runtime,
so writes do not persist.

The UI is written against the shapes below, so the two sides evolve independently.

**Fetcher seam.** Every feature exposes its data through a small fetcher module; components never call the network directly:

| Feature | Fetcher | Returns |
| :--- | :--- | :--- |
| Catalog | `features/catalog/data/catalogFetcher.ts` | `CatalogItem[]` (server-side filter/sort/paginate) |
| Courses | `features/courses/data/courseFetchers.ts` | `CourseDetail`, `CourseProblem[]`, related, certificate |
| Dashboard | `features/dashboard/data/dashboardFetchers.ts` | stats, enrolled courses, notifications, certificates, … |
| Scholarships | `features/scholarships/data/scholarshipFetchers.ts` | one `CatalogItem` (scholarship) |
| Home | `features/home/data/homeFetcher.ts` | featured courses/scholarships, competition, events, quick links |
| Profile | `features/profile/data/profileFetchers.ts` | `UserProfileData` (read + patch) |

The network seam is `frontend/src/shared/lib/apiClient.ts` (`apiGet` / `apiPost` / `apiPatch` / `buildQuery`, plus `ApiError`). Fetchers stay thin: the component and its cache key never change.

---

## 2. Domain entities

From `frontend/src/shared/types/entities.ts`:

| Entity | Represents |
| :--- | :--- |
| `Course` | A course summary (list/card level). |
| `Scholarship` | A scholarship summary (list/card level). |
| `CourseDetail` | The merged course record used by landing, player, and certificate. |
| `CourseModule` | A curriculum module grouping lessons. |
| `CourseLesson` | A single lesson (id, title, duration, status, media source). |
| `CourseProblem` / `CourseProblemOption` | A practice problem and its answer options. |
| `CourseLiveSession` | A scheduled live session for a course. |
| `CourseExam` | The comprehensive exam unlocked after completion. |
| `Competition` | A competition/challenge (used in the dashboard arena + banner). |
| `EventItem` | An event/workshop item. |

Type aliases: `CourseLessonStatus` (`locked` / `available` / `completed`, etc.) and `LiveSessionState` (`live` / `upcoming` / `ended`).

Catalog items are typed by `CatalogItem` (`frontend/src/shared/types/entities.ts`), a discriminated shape used by both courses and scholarships with a `type: 'course' | 'scholarship'` field.

Dashboard-specific projections live in `frontend/src/features/dashboard/types.ts` and cover: `EnrolledCourse`, `LiveSessionInfo`, `DashboardStats`, `UpcomingEvent`, `DashboardNotification`, `NotificationItemData`, `SavedScholarshipItem`, `FavoriteCourseItem`, `CompetitionItem`, `CertificateItem`.

---

## 3. Data flows the UI expects

### 3.1 Catalog
- **List:** filter by `type` / field / level / language / cost / country / status, sort, and paginate (6 per page). Expected to be paged server-side; the frontend keys the cache by the full filter object.
- **Detail:** fetch one item by slug. The frontend **prefetches on card hover** (`dataCacheManager.prefetch(['catalog-detail', id], …)`).

### 3.2 Courses
- `fetchCourseDetail(slug)` merges the catalog summary with modules, lessons, instructor, live sessions, and exam.
- `fetchCourseProblems()` returns the practice set.
- Progress and completion are tracked client-side today (seeded deterministically); a backend would persist `completedLessonIds` and progress per learner.

### 3.3 Dashboard
- Per-section reads under the `['dashboard', …]` cache namespace: stats, upcoming events, enrolled courses, competitions, certificates, saved scholarships, favorite courses, notifications (view + drawer).
- **Mutations** the chambers imply: enroll/unenroll, save/unsave a scholarship, toggle a favorite, submit a scholarship application, submit a competition solution, mark a notification read.

### 3.4 Auth
- Email login and social OAuth (Google, Facebook) — the browser verifies with Firebase, the server exchanges the ID token for a session. See [08 · Backend Architecture](08-backend-architecture.md) → Configuring Firebase.
- Flow: `GET /auth/config` (public web config) → `POST /auth/firebase` (identity → session) → `POST /auth/refresh` (rotation) → `GET /auth/me`; logout calls `dataCacheManager.clear()`.

---

## 4. REST surface

A conventional resource layout that matches the frontend's reads and mutations.
Each path is owned by a feature app and mounted in `backend/config/urls.py`
under `/api/`.

**Response shapes.** Payloads use camelCase keys matching `entities.ts` and each
feature's `types.ts`. Empty/`None` fields are omitted (the backend `compact` helper).
Errors share one structured shape (`backend/features/common/errors.py`).

**Current user.** The browser verifies identity with Firebase Auth; the server
exchanges the Firebase ID token for a `UserSession` (HS256 access token +
rotating refresh token). `GET /auth/config` ships the public web config to the
browser. See [08 · Backend Architecture](08-backend-architecture.md) for the
feature layout and the session model.

### Auth

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/auth/config` | The public Firebase web config (web-config trio; public by design). |
| `POST` | `/auth/firebase` | Firebase ID token → session (access + rotating refresh tokens). |
| `POST` | `/auth/refresh` | Rotate the refresh token, mint a fresh access token. |
| `GET` | `/auth/me` | Current user profile. |
| `POST` | `/auth/logout` | End the session. |
| `GET` / `POST` | `/auth/sessions` · `/auth/sessions/:id/revoke` | List live sessions / revoke one. |

### Catalog & courses

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/catalog` | Paged, filterable list (`type`, `q`, `field`, `level`, `language`, `cost`, `country`, `status`, `sort`, `page`, `ids`). |
| `GET` | `/catalog/:slug` | Single course or scholarship detail. |
| `GET` | `/courses/:slug` | Course detail (modules, lessons, sessions, exam). |
| `GET` | `/courses/:slug/problems` | Practice problems. |
| `GET` | `/problems` | The shared practice set. |
| `GET` | `/courses/:slug/related` | Related-course rail. |
| `POST` | `/courses/:slug/enroll` | Enroll the learner. |
| `POST` | `/courses/:slug/progress` | Sync completed lessons / progress. |
| `POST` | `/courses/:slug/favorite` | Toggle a course in favorites. |
| `GET` | `/courses/:slug/certificate` | Certificate metadata. |

### Scholarships

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/scholarships/:slug` | Scholarship detail. |
| `POST` | `/scholarships/:slug/apply` | Submit an application. |
| `POST` | `/scholarships/:slug/save` | Save / unsave. |

### Dashboard

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/dashboard` | Summary (stats, priority cards). |
| `GET` | `/dashboard/enrolled` | Enrolled courses. |
| `GET` | `/dashboard/saved` | Saved scholarships + favorite courses. |
| `GET` | `/dashboard/competitions` | Competitions + certificates. |
| `GET` | `/dashboard/notifications` | Notifications list. |
| `POST` | `/dashboard/notifications/:id/read` | Mark one read. |

### Content & profile

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/home` | Home rails: featured courses, scholarships, competition, events, quick links. |
| `GET` | `/events` | Events & seminars list. |
| `GET` | `/competitions` | Competitions list. |
| `GET` | `/profile` | Profile preferences. |
| `PATCH` | `/profile` | Update profile / preferences / reminders. |

### Admin

Staff-only (`IsAdminRole`), under `/admin`:

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/admin/overview` | Headline counts + content counts. |
| `GET` · `POST` | `/admin/users` | Paged accounts / create one. |
| `GET` · `PATCH` · `DELETE` | `/admin/users/:id` | One account: detail, edit a subset, delete. |
| `POST` | `/admin/users/:id/role` | Change role (keeps `is_staff` in sync). |
| `GET` | `/admin/sessions` | Device sessions fleet-wide. |
| `POST` | `/admin/sessions/:id/revoke` | Force-logout one device. |
| `GET` | `/admin/analytics/logins` · `/devices` | Login series, os/browser/device breakdown. |
| `GET` | `/admin/events` | Recent audit trail. |
| `GET` | `/admin/content/schema` | `{types, userFields}` — drives every admin form. |
| `GET` · `POST` | `/admin/content/:type` | Paged rows / create (`courses`, `scholarships`, `events`, `competitions`). |
| `PATCH` · `DELETE` | `/admin/content/:type/:id` | Edit / remove one content row. |
| `GET` | `/admin/video-providers` | Registry rows + `available`/`reason` from each provider's env checks. |
| `GET` · `POST` | `/admin/video-assets` | Asset rows (`progress`, `stage`, `error`, `qualities`, `createdAt`) / record one (refused with its reason if the provider's checks fail). |
| `POST` | `/admin/video-assets/upload` | Multipart file upload (`provider` query optional) → `202` + asset row; a worker thread then ingests via the **chosen** provider and the row's `progress`/`stage`/`status` follow it. Refused with its reason when the provider's env checks fail; unknown codes are refused, never defaulted. Real-server only (not ephemeral serverless). |
| `GET` · `DELETE` | `/admin/video-assets/:id` | The tracker's poll target / remove one asset. |
| `GET` | `/admin/video-diagnostics?deep=true` | Staged video validation — pipeline, Telegram env (+ Bot API on deep), Drive env (+ OAuth/folder on deep). |

### Video hosting

A hosting provider (Telegram channel or Google Drive) is the data plane
(unlimited storage); the backend is the control plane only and never proxies a
video byte. Providers are registered as one module each under
`features/videohosting/providers/` — adding one is a single file plus an env
block. Playback routes carry a minted token — hls.js cannot send an
`Authorization` header on a segment fetch, so the token **is** the grant
(IP-bound, expiring, stored hashed).

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/videos/providers` | The registry rows (enabled, capabilities, camelCase). |
| `GET` | `/videos/:slug` | Readiness, duration, and the rendition ladder. |
| `POST` | `/videos/:slug/token` | Mint a playback grant (auth required). |
| `GET` | `/stream/:token/master.m3u8` | Master playlist, `__TOKEN__` swapped for the caller's token. |
| `GET` | `/stream/:token/:quality/index.m3u8` | Rendition media playlist. |
| `GET` | `/stream/:token/key/:quality` | The 16-byte AES-128 key for one rendition (`no-store`). |
| `GET` | `/stream/:token/:quality/:index.ts` | **302** straight to Telegram's CDN (browser fetches the encrypted segment). |

The stored playlists keep `__TOKEN__` placeholders, so a database dump contains
no usable URL; only the SHA-256 of each grant is stored.

**Ingest & staging.** `manage.py ingest_video <file> --slug <slug> --package
auto|force|never` pushes the source into Telegram, then (when the host has
FFmpeg and is not Vercel) packages the AES-128 HLS ladder. `auto` follows the
host, `force` requires the packaging host, and `never` — or a missing FFmpeg —
**stages** the source (`status=staged`, renditions cleared, no master
playlist): the video is stored safely and can be packaged later by re-running
with `force` on a machine that has FFmpeg. A staged asset refuses playback
with a message that names the fix.

**Admin endpoints (under `/api/`).** The console reads the same modules:
`GET /admin/video-providers` (rows carry `available`/`reason` from the env
checks — the select gate; Telegram is selectable the moment its checks pass),
`GET/POST/DELETE /admin/video-assets` (asset rows carry `error`/`qualities`/
`createdAt`; POST refuses a provider whose checks fail, with its Arabic
reason), and `GET /admin/video-diagnostics?deep=true` — the staged validation:
one check per thing that can silently break playback (FFmpeg, the serverless
guard, each provider's env keys, and on deep runs the live Bot API / Google
OAuth + folder calls), each failing check naming WHY and its fix.

---

## 5. Integration guidance

1. **Keep the fetcher seam.** Replace the body of a fetcher; do not rewire components.
2. **Keep cache keys deterministic.** Server pagination must map cleanly to the frontend's `['catalog-items', filters]` key.
3. **Match the entity types.** If a payload diverges from `entities.ts`, update the type at the boundary — not with `as` casts inside components.
4. **Preserve the SWR contract.** Responses should be cacheable client-side under the existing `staleTime` / `cacheTime` values; invalidate the right namespace after a mutation (`dataCacheManager.invalidate(...)`).
5. **Errors are data.** Return structured errors so the data-section error state can show a message and a retry — never an endless spinner.
6. **Auth clears the cache.** Logout invalidates and clears `dataCacheManager`.
