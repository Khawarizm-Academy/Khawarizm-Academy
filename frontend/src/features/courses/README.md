# Courses — الدورات التدريبية

The learner course journey: discover a course, study through a responsive player, and earn a certificate.

> Real playback is provided by [`../videohosting/README.md`](../videohosting/README.md). One `PlayerStage` owns the active media engine; there is no synthetic playback ticker or guessed video slug.

## At a glance

| | |
| :--- | :--- |
| **Routes** | `/courses/:slug`, `/courses/:slug/learn`, `/courses/:slug/certificate` |
| **Shell** | Standard |
| **Skeleton variant** | `detail` |
| **Active tab** | `courses` |
| **Entries** | `pages/CourseLandingPage.tsx`, `pages/CoursePlayerPage.tsx`, `pages/CourseCertificatePage.tsx` |
| **State providers** | `context/CourseDetailProvider.tsx`, `context/CoursePlayerProvider.tsx`, `context/videoPlayerStore.ts` |
| **Styles** | `courses.css` (concept classes `course-*` and `player-*`) |

## Purpose

- **Landing** — course overview, outcomes, curriculum, live sessions, exam callout, instructor cards, related courses, and enrollment/favorite actions.
- **Player** — a single responsive video stage, lesson/problems/live/exam tabs, progress-aware syllabus, completion, mobile syllabus drawer, and mini-player.
- **Certificate** — completion screen with a shareable/downloadable certificate.

Course detail shares the feature cache. The player disables `keepPreviousData` across route slugs so it never pairs a new course URL with a previous course's lesson ID.

## Structure

```text
courses/
├── pages/
│   ├── CourseLandingPage.tsx
│   ├── CoursePlayerPage.tsx
│   └── CourseCertificatePage.tsx
├── components/
│   ├── chrome/                       CourseBreadcrumb, CoursePathSidebar, LessonTabBar, PlayerTopBar
│   ├── controls/                     CourseActionPanel, CoursePrimaryCta, PlayerSettingsMenu
│   ├── layout/                       LessonPanel, PlayerStage, ProblemsPanel, LiveSessionPanel, ExamPanel
│   ├── overlays/                     CourseToast, PlayerMiniPlayer, PlayerSyllabusDrawer
│   ├── states/                       Landing/player skeletons and not-found state
│   ├── views/CoursePlayerView.tsx    One responsive view; exactly one PlayerStage
│   └── views/CourseLandingView/      Desktop/mobile landing composition
├── context/
│   ├── CoursePlayerProvider.tsx      Active lesson, completion, tabs, drawer, and course session
│   ├── coursePlayerContext.ts        `useCoursePlayer()` contract
│   └── videoPlayerStore.ts           Engine-backed external store via `useSyncExternalStore`
├── data/
│   ├── courseFetchers.ts             Course detail, related, problems, and progress
│   ├── courseCopy.ts                 Typed copy from `courseSystem.json`
│   ├── coursePath.ts                 Lesson flattening, unlock, and progress helpers
│   ├── playerTime.ts                 Duration and clock formatting
│   └── playerPanels.ts                Active-tab panel mapping
├── types.ts
├── courses.css
└── README.md
```

## Player lifecycle

- `CoursePlayerView.tsx` is the responsive shell and mounts one `PlayerStage`; desktop/mobile CSS never creates duplicate media elements or engines.
- `usePlayback` resolves the active lesson through the authenticated backend, chooses a lazy engine from the returned grant, and owns attach/retry/cleanup. The backend's `resumeAt`, captions, and `nextLessonId` are authoritative.
- `videoPlayerStore` mirrors normalized engine state and routes play, pause, seek, speed, quality, captions, volume, PiP, and AirPlay controls. It persists only non-secret per-user playback preferences in local storage.
- Progress is sent with bounded heartbeats and flushed on pause/end, visibility/page exit, and player cleanup. The next-lesson card does not autoplay; manual completion keeps its existing problems/toast behavior, while video completion can suppress those effects until the learner chooses what to do.
- `PlayerSettingsMenu` is capability-aware, keyboard-operable, and presents as a modal bottom sheet on small screens. Unsupported quality/caption/cast controls are not rendered.

## Course lifecycle payload

The public detail fetcher accepts additive lifecycle fields without removing legacy keys. `status`, `isPreview`, `enrollable`, `instructors[]`, and lesson kind/video metadata drive the landing notices and editor-safe learner UI. Published courses keep enrollment; archived courses show an Arabic unavailable notice and hide enrollment for new learners while preserving continuation for existing learners. Draft slugs retain the established not-found behavior. If the instructor list is absent, the instructor card falls back to legacy profile fields.

## Data and verification

| Source | Provides |
| :--- | :--- |
| `@/shared/types/entities` | `CourseDetail`, `CourseLesson`, curriculum DTOs |
| `data/courseFetchers.ts` | Course detail, problems, related courses and learner progress |
| `features/videohosting/data/videoHostingFetchers.ts` | Lesson playback grants and progress heartbeats |
| `@/shared/json/courseSystem.json` | Arabic landing/player/certificate copy and speed choices |

Run frontend checks from `frontend/`: `npm test`, `npm run lint`, and `npm run build`.

## Related

- Video player engines: [`../videohosting/README.md`](../videohosting/README.md)
- Caching: [`docs/04-loading-caching-and-motion.md`](../../../../docs/04-loading-caching-and-motion.md)
- Catalog: [`../catalog/README.md`](../catalog/README.md)
