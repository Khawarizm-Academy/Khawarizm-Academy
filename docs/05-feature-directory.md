# 05 · Feature Directory

Every product feature lives in its own folder under `frontend/src/features/` and owns a README. This page is the index: what each feature does, which routes it serves, and where to read more.

| Feature | Routes | Maturity | README |
| :--- | :--- | :--- | :--- |
| **Home** | `/` | Complete | [`home/README.md`](../frontend/src/features/home/README.md) |
| **Catalog** | `/catalog` | Complete | [`catalog/README.md`](../frontend/src/features/catalog/README.md) |
| **Courses** | `/courses/:slug`, `/courses/:slug/learn`, `/courses/:slug/certificate` | Complete | [`courses/README.md`](../frontend/src/features/courses/README.md) |
| **Dashboard** | `/dashboard` | Complete | [`dashboard/README.md`](../frontend/src/features/dashboard/README.md) |
| **Auth** | `/login` | Complete | [`auth/README.md`](../frontend/src/features/auth/README.md) |
| **Profile** | `/profile` → `/dashboard?view=profile` | Complete | [`profile/README.md`](../frontend/src/features/profile/README.md) |
| **Scholarships** | `/scholarships/:slug` | Functional | [`scholarships/README.md`](../frontend/src/features/scholarships/README.md) |
| **Events** | `/events` | Complete | [`events/README.md`](../frontend/src/features/events/README.md) |
| **Competitions** | `/competitions` | Complete | [`competitions/README.md`](../frontend/src/features/competitions/README.md) |
| **Admin** | `/admin` | Complete | [`admin/README.md`](../frontend/src/features/admin/README.md) |
| **Studio** | `/studio`, `/studio/courses*`, `/studio/videos`, `/studio/quizzes*`, `/studio/live-sessions`, `/studio/announcements`, `/studio/students`, `/studio/analytics*`, `/studio/profile` | Complete (Phases 7–10) — see [10 · Studio](10-studio.md) | [`studio/README.md`](../frontend/src/features/studio/README.md) |
| **Video hosting** | — (consumed by the courses player and Studio's library) | Complete — see [11 · Video Platform](11-video-platform.md) | [`videohosting/README.md`](../frontend/src/features/videohosting/README.md) |
| **Certificates** | `/verify/:serial` | Complete (print + public verify) | [`certificates/README.md`](../frontend/src/features/certificates/README.md) |
| **Discussions** | — (lesson tab inside `/courses/:slug/learn`) | Learner tab mounted in `PlayerPanels`; `StudioDiscussionInbox` is exported but not routed (open item) | [`discussions/README.md`](../frontend/src/features/discussions/README.md) |
| **Reviews** | — (`/api/courses/:slug/reviews*`) | **API complete, UI not mounted** — the components exist but no route or course page imports them (open item) | [`reviews/README.md`](../frontend/src/features/reviews/README.md) |

---

## Home — `features/home/`

The public landing page. Presents the two pillars equally, drives discovery through a smart search box that routes into the catalog, and surfaces a quick-access rail, a competition banner, twin course/scholarship rails, and events.

- **Entry:** `pages/HomePage.tsx` → `HomeProvider` + `HomeContent`.
- **Shape:** surface-split sections via `SurfaceSlot` (desktop + mobile variants shown per breakpoint).
- Read more: [`home/README.md`](../frontend/src/features/home/README.md).

## Catalog — `features/catalog/`

The unified, filterable, sortable, paginated explorer for both pillars. Tabs (`all` / `courses` / `scholarships`) and the search query live in the URL (`?type=`, `?q=`); filtering, sorting, and pagination are cached.

- **Entry:** `pages/CatalogPage.tsx` → `CatalogProvider` + `CatalogHero` + `CatalogResults` + the mobile filter drawer.
- **Data boundary:** `components/layout/CatalogDataSection.tsx` is the only re-rendering island.
- Read more: [`catalog/README.md`](../frontend/src/features/catalog/README.md).

## Courses — `features/courses/`

The full course lifecycle: a marketing/enrollment **landing** page, an in-browser **player** (video stage, lesson/problems/live/exam panels, progress, syllabus drawer, mini-player), and a **certificate** completion page. All three read one merged course record through the shared SWR cache.

- **Entries:** `pages/CourseLandingPage.tsx`, `pages/CoursePlayerPage.tsx`, `pages/CourseCertificatePage.tsx`.
- **Surface split:** `components/views/CourseLandingView/` and `components/views/CoursePlayerView/` each ship a desktop + mobile view.
- Read more: [`courses/README.md`](../frontend/src/features/courses/README.md).

## Dashboard — `features/dashboard/`

The post-login learner workspace: enrolled courses, saved scholarships, competitions & certificates, notifications, and an embedded profile — inside one persistent right sidebar (desktop) and pill strip (mobile). All actions resolve in-place in modal **chambers**, and each section shows an empty state when the backend has no data.

- **Entry:** `pages/DashboardPage.tsx` (immersive shell) → `DashboardProvider` + `DashboardShell`.
- **View state:** `?view=` and `?state=` (`live` / `empty`).
- Read more: [`dashboard/README.md`](../frontend/src/features/dashboard/README.md).

## Auth — `features/auth/`

The login entry point with two modes (fresh login / welcome-back), email + social providers, a terms modal, and a success toast. Ships one desktop split-screen view and one mobile view over a shared context.

- **Entry:** `pages/LoginPage.tsx` (`hideShell`) → `AuthLoginProvider` + both views + overlays.
- **URL mode:** `?mode=welcome-back` reopens the returning-user flow.
- Read more: [`auth/README.md`](../frontend/src/features/auth/README.md).

## Profile — `features/profile/`

The editable account surface: identity/avatar, personal info, learning preferences, notification reminders, language/timezone, and an account summary — rendered as the dashboard's `?view=profile`.

- **Entry:** `pages/ProfilePage.tsx` redirects into `/dashboard?view=profile`; the UI is `components/layout/ProfileView.tsx`, mounted by the dashboard.
- Read more: [`profile/README.md`](../frontend/src/features/profile/README.md).

## Scholarships — `features/scholarships/`

The scholarship detail view, loaded by URL slug, with an application CTA and loading / not-found / deadline-closed states. The browse side lives in the catalog.

- **Entry:** `pages/ScholarshipDetailPage.tsx`; `/scholarships` redirects to `/catalog?type=scholarships`.
- Read more: [`scholarships/README.md`](../frontend/src/features/scholarships/README.md).

## Events — `features/events/`

The events & seminars destination: a featured keynote plus a grid of every
upcoming event, served by `GET /events` and wrapped in a data section with
skeleton / empty / error states.

- **Entry:** `pages/EventsPage.tsx` → `EventsHero` + `EventsDataSection`.
- Read more: [`events/README.md`](../frontend/src/features/events/README.md).

## Competitions — `features/competitions/`

The competitions & challenges destination: a hero, a competition banner, and a
card grid served by `GET /competitions`, with the same data-section states. The
arena itself still opens inside the dashboard's competition chamber.

- **Entry:** `pages/CompetitionsPage.tsx` → `CompetitionsHero` + `CompetitionsDataSection`.
- Read more: [`competitions/README.md`](../frontend/src/features/competitions/README.md).

## Admin — `features/admin/`

The permission-gated console at a single responsive surface (no desktop/mobile
split). Section tabs (`?tab=`) cover the overview, users, content, sessions,
analytics, activity, roles, and access audit. User list/detail and account
mutation permissions are separate: creating an account as the default student
uses `users.create`, while assigning any non-default role requires
`users.assign_roles` plus hierarchy and grant checks. The four content types are
edited through schema-driven forms with per-type permissions.

- **Entry:** `pages/AdminPage.tsx` → `AdminProvider` + `AdminShell`.
- Read more: [`admin/README.md`](../frontend/src/features/admin/README.md).

---

## Studio — `features/studio/`

The instructor workspace: an immersive shell with a permission-filtered rail, the
course editor with a curriculum tree and lesson drawer, the video library with the
resumable uploader, the quiz builder, live sessions, announcements, the learner
roster and course analytics. Thirteen routes, one data-driven nav table
(`data/studioSections.json`), and one autosave implementation for every editable
surface.

- **Entry:** `pages/StudioHomePage.tsx` (overview) and
  `pages/StudioCourseEditorPage.tsx` (the editor).
- **Writes:** `hooks/useAutosave.ts` — 700 ms debounce, one in-flight save, offline
  queue, and a 409 conflict dialog that never drops the draft.
- Read more: [`studio/README.md`](../frontend/src/features/studio/README.md) and
  [10 · Studio](10-studio.md).

## Video hosting (player) — `features/videohosting/`

Not a page: the playback engine layer. `hooks/usePlayback.ts` fetches an
entitlement-checked grant for the current lesson and `engines/registry.ts` picks a
lazy loader from the grant's mode (native HLS, hls.js, raw file, YouTube, Vimeo),
so the player never knows which provider hosts the bytes.

- **State:** `videoPlayerStore` mirrors real engine state — no synthetic ticker.
- Read more: [`videohosting/README.md`](../frontend/src/features/videohosting/README.md)
  and [11 · Video Platform](11-video-platform.md).

## Certificates — `features/certificates/`

`/verify/:serial`, the printable certificate card, and a client-side QR of the
serial. Unauthenticated read, snapshot fields only, revoked certificates stay
resolvable.

- Read more: [`certificates/README.md`](../frontend/src/features/certificates/README.md).

## Discussions — `features/discussions/`

Lesson-scoped Q&A inside the player: sanitized Markdown, accepted answers,
moderation, quotas, and a jump-to-timestamp callback that seeks the existing
player. `features/courses/components/layout/PlayerPanels.tsx` imports
`DiscussionTab`, so the learner side is live; the tab registry itself is owned by
`features/courses` and this feature registers no routes.

`StudioDiscussionInbox` (the staff view of the same data) is built and exported
but has no mount yet — same open-item class as Reviews.

- Read more: [`discussions/README.md`](../frontend/src/features/discussions/README.md).

## Reviews — `features/reviews/`

Learner ratings with an instructor reply and a staff inbox. The backend app is
complete, classified, tested and seeded; the frontend components exist and are
exported, but **nothing outside the folder imports them yet** — no `/studio/reviews`
route and no review section on the course landing page. Treat it as an API feature
with an unwired UI until the mount task lands.

- Read more: [`reviews/README.md`](../frontend/src/features/reviews/README.md).

## Shared building blocks

Features compose a shared layer. The components, hooks, and config used most often:

| Building block | Path | Used by |
| :--- | :--- | :--- |
| Smart search box | `shared/components/Search/SmartSearchBox.tsx` | home, catalog, dashboard |
| Course / scholarship cards | `shared/components/Cards/{CourseCard,ScholarshipCard}.tsx` | home, catalog |
| Sliding segmented control | `shared/components/Controls/SlidingSegmentedControl.tsx` | dashboard, profile |
| Workspace chrome | `shared/components/Workspace/` | dashboard, Studio |
| Page / data skeletons | `shared/components/Loading/{PageSkeleton,DataSectionSkeleton}.tsx` | app shell, all data sections |
| State panel | `shared/components/State/StatePanel.tsx` | scholarships, courses, error boundary |
| Detail view | `shared/components/Detail/ItemDetailView.tsx` | scholarships (pattern reused by courses) |
| Navbar / bottom bar | `shared/components/Navbar/*`, `shared/components/BottomNav/MobileBottomBar.tsx` | app shell |
| Brand visuals / canvas | `shared/components/Artwork/*` | navbar, footer, cards, home |
| Banners / events | `shared/components/Banners/*`, `shared/components/Events/EventSection.tsx` | home, dashboard |
| `useCachedData` / cache | `shared/hooks/useCachedData.ts`, `shared/lib/cacheManager.ts` | every data section |
| `useCountdown` / digits | `shared/hooks/useCountdown.ts`, `shared/components/Banners/CountdownDigits.tsx` | home, dashboard |
| Navigation / localization | `shared/lib/navigation.ts`, `shared/lib/localization.ts` | everywhere |

---

## Backend twins

Each frontend feature has a matching backend app under `backend/features/`. The
names line up one-for-one, so a feature's data lives in the app of the same name.

| Feature | Backend app | Backend README |
| :--- | :--- | :--- |
| Home | `features/home` | [`home/README.md`](../../backend/features/home/README.md) |
| Catalog | `features/catalog` | [`catalog/README.md`](../../backend/features/catalog/README.md) |
| Courses | `features/courses` | [`courses/README.md`](../../backend/features/courses/README.md) |
| Scholarships | `features/scholarships` | [`scholarships/README.md`](../../backend/features/scholarships/README.md) |
| Dashboard | `features/dashboard` (certificates, progress, notifications) | [`dashboard/README.md`](../../backend/features/dashboard/README.md) |
| Auth | `features/auth` (label `accounts`) | [`auth/README.md`](../../backend/features/auth/README.md) |
| Profile | `features/profile` | [`profile/README.md`](../../backend/features/profile/README.md) |
| Events | `features/events` | [`events/README.md`](../../backend/features/events/README.md) |
| Competitions | `features/competitions` | [`competitions/README.md`](../../backend/features/competitions/README.md) |
| Admin | `features/adminconsole` (label `adminconsole`) | [`adminconsole/README.md`](../../backend/features/adminconsole/README.md) |
| Video hosting | `features/videohosting` | [`videohosting/README.md`](../../backend/features/videohosting/README.md) |
| Studio | `features/studio` (model-less authoring APIs over `courses`) | [`studio/README.md`](../../backend/features/studio/README.md) |
| Quizzes & exams | `features/quizzes` | [`quizzes/README.md`](../../backend/features/quizzes/README.md) |
| Announcements | `features/announcements` | [`announcements/README.md`](../../backend/features/announcements/README.md) |
| Discussions | `features/discussions` | [`discussions/README.md`](../../backend/features/discussions/README.md) |
| Reviews | `features/reviews` | [`reviews/README.md`](../../backend/features/reviews/README.md) |
| *(no frontend twin)* | `features/access` — permission catalog, roles, hierarchy | [`access/README.md`](../../backend/features/access/README.md) |
| *(no frontend twin)* | `features/common` — shared helpers, maintenance, observability | [`common/README.md`](../../backend/features/common/README.md) |

The full backend feature map and folder contract live in
[`backend/features/README.md`](../../backend/features/README.md); the internal
architecture is documented in [08 · Backend Architecture](08-backend-architecture.md).
