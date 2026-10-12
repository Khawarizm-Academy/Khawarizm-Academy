# Courses — الدورات التدريبية

The full course lifecycle: discover a course, learn it in the browser, and earn a certificate.

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

- **Landing** — the marketing/enrollment view: header block, outcomes, curriculum, live sessions, an exam callout, the instructor, related courses, and an enroll/favorite action panel.
- **Player** — the in-browser study environment: a video stage, four tabs (lesson / problems / live / exam), a progress-tracked syllabus, a completion state that unlocks the exam, a mobile syllabus drawer, and a mini-player.
- **Certificate** — the completion screen with a shareable/downloadable certificate.

All three pages read one merged course record through the shared SWR cache.

## Structure

```text
courses/
├── pages/
│   ├── CourseLandingPage.tsx         provider + desktop/mobile landing views
│   ├── CoursePlayerPage.tsx          provider + desktop/mobile player views
│   └── CourseCertificatePage.tsx     fetches detail, renders CertificateView
├── components/
│   ├── cards/                        CertificatePreview, CurriculumModuleCard, ExamCalloutCard,
│   │                                 InstructorCard, LiveSessionCard, LiveSessionPlayerCard, PathLessonRow
│   ├── chrome/                       CourseBreadcrumb, CoursePathSidebar, LessonTabBar, PlayerTopBar
│   ├── controls/                     CourseActionPanel, CoursePrimaryCta, CourseStickyCta, PlayerSettingsMenu
│   ├── hero/                         CourseHeaderBlock
│   ├── layout/                       CourseAbout, CourseCurriculum, CourseOutcomes, CoursePathModules,
│   │                                 ExamPanel, LessonPanel, LiveSessionPanel, PlayerPanels,
│   │                                 PlayerStage, ProblemsPanel, RelatedCoursesRail
│   ├── overlays/                     CourseToast, PlayerMiniPlayer, PlayerSyllabusDrawer
│   ├── states/                       CourseLandingSkeleton, CourseNotFound, CoursePlayerSkeleton
│   └── views/
│       ├── CertificateView.tsx
│       ├── CourseLandingView/        DesktopCourseLandingView + MobileCourseLandingView
│       └── CoursePlayerView/         DesktopCoursePlayerView + MobileCoursePlayerView
├── context/
│   ├── courseDetailContext.ts        context + useCourseDetail()
│   ├── CourseDetailProvider.tsx      landing state (enroll, favorite, toast, progress)
│   ├── coursePlayerContext.ts        context + useCoursePlayer()
│   ├── CoursePlayerProvider.tsx      player state (tab, active lesson, completion, drawer)
│   └── videoPlayerStore.ts           module singleton + useSyncExternalStore (playback)
├── data/
│   ├── courseFetchers.ts             fetchCourseDetail / fetchRelatedCourses / fetchCourseProblems
│   ├── courseCopy.ts                 typed copy from courseSystem.json
│   ├── coursePath.ts                 path/progress helpers (flatten, status, unlock)
│   ├── courseCertificate.ts          training hours + deterministic serial
│   ├── playerPanels.ts               PANEL_BY_TAB: tab → panel component
│   ├── playerTime.ts                 duration / clock formatting
│   └── videoProviders.ts             provider capability registry
├── types.ts
├── courses.css
└── README.md
```

## How it works

### Landing (`CourseDetailProvider`)
- Owns `isEnrolled`, `isFavorite`, `toastMessage` (auto-dismiss 3.5s), derived `startedLessonId`, and seed-based `progress`.
- Actions: `enroll` (scrolls to `#curriculum` and toasts), `toggleFavorite`, `continueLearning` (→ `/courses/:slug/learn`), `hideToast`.
- Fetches `['course-detail', slug]` (stale 10 min, cache 30 min, `keepPreviousData`).

### Player (`CoursePlayerProvider` + `videoPlayerStore`)
- Owns `activeTab` (`lesson` / `problems` / `live` / `exam`), `activeLessonId`, `completedIds`, `isSyllabusOpen`, `toastMessage`; derives `activeLesson`, `progress`, `examUnlocked`.
- Actions: `selectLesson`, `selectTab`, `completeLesson` (marks id, jumps to the problems tab, toasts), `openSyllabus` / `closeSyllabus`. Resume state is seeded during render, guarded by `prevCourseId`.
- `videoPlayerStore` is a module singleton consumed via `useSyncExternalStore`. It owns simulated playback: `playState` (`idle` / `playing` / `buffering` / `error`), `speed`, `quality`, `captions`, `muted`, `currentMs` (250ms ticker), `durationMs`, `sourceKey`, and imperative actions (`play`, `pause`, `toggleMute`, `setSpeed`, `setQuality`, `skip`, `seekFraction`, `syncVideoSource`, …). `syncVideoSource` rebinds playback per lesson while preserving user preferences.
- `PANEL_BY_TAB` maps the active tab to its panel, so the player never branches on the tab.
- Completion: finishing the path sets `examUnlocked`, which enables `ExamPanel`.

### Certificate
- `CourseCertificatePage` fetches the detail directly, computes training hours and a deterministic serial, and renders `CertificateView` (local download/share state).

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/mocks/catalog` | catalog summaries merged into the detail |
| `@/shared/mocks/courses` | `mockCourseDetails`, `mockCourseProblems` |
| `@/shared/json/courseSystem.json` | landing / player / certificate copy |
| `@/shared/hooks/useCachedData`, `@/shared/lib/cacheManager` | cached detail & problems, related-rail prefetch |
| `@/shared/types/entities` | `CourseDetail`, `CourseLesson`, `CourseProblem`, … |

Cache keys: `['course-detail', slug]` and `['course-problems']`.

## Reused components

| Component | Role |
| :--- | :--- |
| `Loading/SkeletonPrimitives` | `SkeletonBox` inside both course skeletons |
| `State/StatePanel` | Not-found state |
| `shared/lib/navigation` | `NAV_TARGETS` in breadcrumb, certificate, not-found |

## Notes

- Landing and player each mount **two** views (`Desktop…` + `Mobile…`) and let CSS pick the surface; the page is a thin orchestrator.
- `PlayerSettingsMenu` renders through a portal; the syllabus drawer is mobile-only while `CoursePathSidebar` is the desktop chrome.
- `RelatedCoursesRail` reuses the catalog card grammar and prefetches on hover.

## Related

- Caching: [`docs/04-loading-caching-and-motion.md`](../../../../docs/04-loading-caching-and-motion.md)
- Desktop/mobile split: [`docs/02-architecture.md`](../../../../docs/02-architecture.md)
- Catalog (entry point): [`../catalog/README.md`](../catalog/README.md)
