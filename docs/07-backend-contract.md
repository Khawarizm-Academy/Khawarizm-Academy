# 07 · Backend Contract

The frontend is **fully API-driven** — there are no mocks. A Django + DRF +
SQLite service in `backend/` implements this contract, so this document is both
the specification and the reference for what is built. See
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
- Email login and social OAuth (Google, Facebook). Today the login is mocked and routes to `/dashboard`.
- Expected: session/token issuance, current-user fetch, and logout that calls `dataCacheManager.clear()`.

---

## 4. REST surface

A conventional resource layout that matches the frontend's reads and mutations.
Every path below is implemented by `backend/api/urls.py` under `/api/`.

**Response shapes.** Payloads use camelCase keys matching `entities.ts` and each
feature's `types.ts`. Empty/`None` fields are omitted (the backend `compact` helper).
Errors share one structured shape (`backend/api/errors.py`).

**Current user.** There is no auth yet: `backend/api/learners.py` resolves a
single seeded demo learner. The `auth/*` routes are stubs for a later flow.

### Auth

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Email + password login. |
| `POST` | `/auth/oauth/:provider` | Social login (google, facebook). |
| `POST` | `/auth/logout` | End the session. |
| `GET` | `/auth/me` | Current user profile. |

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
| `GET` | `/dashboard/chambers` | Action-chamber copy/counters. |
| `GET` | `/dashboard/content` | Dashboard view content blocks. |

### Content & profile

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/home` | Home rails: featured courses, scholarships, competition, events, quick links. |
| `GET` | `/events` | Events & seminars list. |
| `GET` | `/competitions` | Competitions list. |
| `GET` | `/profile` | Profile preferences. |
| `PATCH` | `/profile` | Update profile / preferences / reminders. |

---

## 5. Integration guidance

1. **Keep the fetcher seam.** Replace the body of a fetcher; do not rewire components.
2. **Keep cache keys deterministic.** Server pagination must map cleanly to the frontend's `['catalog-items', filters]` key.
3. **Match the entity types.** If a payload diverges from `entities.ts`, update the type at the boundary — not with `as` casts inside components.
4. **Preserve the SWR contract.** Responses should be cacheable client-side under the existing `staleTime` / `cacheTime` values; invalidate the right namespace after a mutation (`dataCacheManager.invalidate(...)`).
5. **Errors are data.** Return structured errors so the data-section error state can show a message and a retry — never an endless spinner.
6. **Auth clears the cache.** Logout invalidates and clears `dataCacheManager`.
