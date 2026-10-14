# Dashboard — لوحتي

The post-login learner workspace. It answers "what do I do next?" and keeps every action in place.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/dashboard` (`?view=` selects the view, `?state=live\|empty` are demo modes) |
| **Shell** | `immersive` — owns its own top bar, keeps the mobile bottom bar |
| **Skeleton variant** | `dashboard` |
| **Active tab** | `dashboard`, or `profile` via `tabsByQuery` |
| **Entry** | `pages/DashboardPage.tsx` |
| **State provider** | `context/DashboardProvider.tsx` |
| **Styles** | `dashboard.css` (concept classes `dash-*`) |

## Purpose

A single persistent shell — right sidebar (desktop) or pill strip (mobile) plus a main body — that hosts several learner views: enrolled courses, a prioritized continue/live card, saved scholarships & favorite courses, competitions & certificates, notifications, achievement stats, and the embedded profile. Actions never navigate the learner away; they resolve in in-place modal **chambers**.

## Views

`?view=` drives the active view through `getDashboardNavItem`; canonical ids and aliases live in `shared/json/dashboardNav.json`.

| View | Notes |
| :--- | :--- |
| `main` | Default landing: stats, priority cards, upcoming events, spotlight. |
| `enrolled` (alias `courses`) | Enrolled courses with filters + sort + empty state. |
| `saved` | Saved scholarships & favorite courses. **Icon-only** entry (bookmark); no sidebar item. |
| `achievements` | Competitions & certificates with toggle pills. |
| `notifications` | Notifications list; also available as a global drawer. |
| `profile` | The profile feature's `ProfileView` embedded here. Lights the `profile` tab. |
| `?state=live` | Swaps hero cards for the live session priority card. |
| `?state=empty` | Renders the empty dashboard state. |

`saved` and `notifications` intentionally resolve to `null` from `getDashboardNavItem` — they are icon-only entry points, not sidebar tabs.

## Structure

```text
dashboard/
├── pages/DashboardPage.tsx            provider + shell
├── components/
│   ├── layout/                        DashboardShell, DashboardMain
│   ├── chrome/                        DesktopDashboardSidebar, DashboardTopBar,
│   │                                  MobileDashboardTopBar, DashboardSubNavigation,
│   │                                  DashboardStatsHeader, DashboardStatsSidebar
│   ├── cards/                         PriorityContinueCard, LiveSessionPriorityCard,
│   │                                  RadialProgressRing, EnrolledCourseCard, EnrolledCourseRow,
│   │                                  NotificationListItem, ChallengeSpotlightCard
│   ├── views/                         EnrolledCoursesView, SavedScholarshipsView,
│   │                                  CompetitionsCertificatesView, NotificationsView
│   ├── overlays/                      CourseWorkspaceModal, LiveClassroomModal,
│   │                                  CompetitionArenaModal, ScholarshipApplicationModal,
│   │                                  CertificatePreviewModal, NotificationsDrawer
│   └── states/EmptyDashboardState.tsx
├── context/                           dashboardContext.ts + DashboardProvider.tsx
├── data/                              dashboardFetchers.ts, radialRingColors.ts
├── hooks/useLiveCountdown.ts          live-session countdown
├── types.ts
├── dashboard.css
└── README.md
```

## How it works

- `DashboardProvider` reads the shared dashboard content from `DashboardContentProvider` (`GET /dashboard/content` + `/dashboard/chambers`) and parses `?view=` / `?state=` at render (never copied into state). It owns:
  - header + stat chips (hydrated from the content view headers) and async `coursesData` with `isLoadingCourses`,
  - `unreadCount` derived from the notifications call,
  - five chamber states: `activeWorkspaceCourse`, `isLiveClassroomOpen`, `selectedScholarship`, `selectedCompetition`, `previewCertificateItem`,
  - all open/close/select actions and `handleNotificationAction`, which routes a notification type to the right chamber or course route.
- `dashboardContext.ts` keeps only pure UI constants (`SUB_NAV_VIEWS`) and the `buildViewHeaders` hydrator; `DashboardContentContext.ts` exposes `content` + `chambers` via `useDashboardContent()`.
- `DashboardMain` chooses full-page, single-column, or two-column layout from `content.views.fullPageViews` / `singleColumnViews`.

### RTL sidebar rule
`DesktopDashboardSidebar` is **Child #1** in the RTL flex row, so it renders on the far right. Reversing the order pushes it to the left.

### In-dashboard chambers
Every student action opens a chamber: `CourseWorkspaceModal` (resume learning), `LiveClassroomModal` (live session), `ScholarshipApplicationModal` (apply), `CompetitionArenaModal` (challenge arena), `CertificatePreviewModal`.

## Data

| Source | Provides |
| :--- | :--- |
| `data/dashboardContentFetcher.ts` | `GET /dashboard/content` (view headers, hero cards, filter chips, notification targets) + `GET /dashboard/chambers` |
| `@/shared/json/dashboardNav.json` | sidebar/sub-nav items via `@/shared/lib/navigation` |
| `data/dashboardFetchers.ts` | per-section fetchers under `['dashboard', '…']` calling the matching `/dashboard/*` endpoints |

Cache keys are namespace-prefixed, e.g. `['dashboard', 'stats']`, `['dashboard', 'courses-list']`, `['dashboard', 'notifications-view']`; invalidating `['dashboard']` marks them all stale.

## Reused components

| Component | Role |
| :--- | :--- |
| `Controls/SlidingSegmentedControl` | Sub-nav and in-view toggles |
| `Search/SmartSearchBox` | Top-bar quick search overlay |
| `Loading/DataSectionSkeleton` | Tier-2 section loading |
| `Banners/CountdownDigits` | Live/competition countdown |
| `useCachedData` | Section caching |

## Notes

- `NotificationsDrawer` is also mounted globally in `RootLayout`, so notifications are reachable from every page.
- The mobile pill strip (`.dash-subnav`) is `lg:hidden`; at `lg+` the sidebar owns navigation.
- The canvas stays transparent (`.dash-page`) so the global celestial washes show through; chrome matches `.glass-navbar`.

## Related

- Routing & dashboard views: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Design system (elevation, canvas): [`docs/01-design-system.md`](../../../../docs/01-design-system.md)
- Profile (embedded view): [`../profile/README.md`](../profile/README.md)
