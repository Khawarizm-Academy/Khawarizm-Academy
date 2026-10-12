# Khawarizm Academy — Master Component & Class Catalog

> **Rule:** inspect this catalog before writing anything new. If a component or styling already exists here, reuse it directly. Shared components live in `src/shared/components/`, feature components in `src/features/<feature>/components/<category>/`.

---

## 1. Buttons & interactive controls (concept classes)

All of these are declared in `src/styles/globals.css` with Tailwind v4 `@apply`.

### 1.1 Primary CTA — `.btn-gold`
- **Visual:** gold gradient (`#E5B65C` → `#F3CE7A`), dark text (`#040F24`), display font, gold elevation glow, active press scale.
- **Usage:** exactly **one** primary action per screen or major section ("سجل الآن", "ابدأ رحلتك", "تأكيد").
```tsx
<button className="btn-gold"><span>سجل الآن</span></button>
```

### 1.2 Secondary tech button — `.btn-outline-blue`
- **Visual:** 1px cyan border (`#29A9FF`), transparent → tinted background, cyan text, subtle hover glow.
- **Usage:** secondary actions, detail exploration ("استكشف التفاصيل", "عرض المسار").
```tsx
<button className="btn-outline-blue"><span>استكشف المسار</span></button>
```

### 1.3 Subtle pill — `.btn-pill-subtle`
- **Visual:** navy surface (`#061A3A`), slate border (`#1B3F80`), off-white text, subtle scale on hover.
- **Usage:** filter chips, secondary tags, category selectors.

### 1.4 Squircle icon action — `.btn-icon-box`
- **Visual:** 36×36 (`w-9 h-9`), `rounded-2xl`, navy surface + border, hover scale.
- **Usage:** bookmark, share, compact toolbar actions.

### 1.5 Circular icon action — `.btn-icon-circle`
- **Visual:** 40×40 (`w-10 h-10`), fully round, navy surface, cyan glow on hover.
- **Usage:** avatar button, navigation arrows, circular controls.

### 1.6 Inline action links — `.link-action-blue` / `.link-action-gold`
- **Visual:** compact inline flex link with subtle padding, arrow, and a colored hover state.
```tsx
<a href="/courses" className="link-action-blue"><span>عرض كافة الدورات</span><span>←</span></a>
```

### 1.7 Search submit — `.btn-search-submit`
- **Visual:** gradient submit button with a pulse; the astrolabe/compass glyph.

---

## 2. Card components

### 2.1 Course card — `<CourseCard />`
- **Path:** `src/shared/components/Cards/CourseCard.tsx`
```ts
interface CourseCardProps { course: Course; layout?: 'desktop' | 'mobile'; } // default 'desktop'
```
- **Desktop:** vertical card, 128px media, cyan accent bar (`.card-accent-blue`), instructor avatar, rating, lecture count, `.btn-gold` CTA.
- **Mobile:** horizontal compact card (media on the right in RTL) for one-thumb scanning.

### 2.2 Scholarship card — `<ScholarshipCard />`
- **Path:** `src/shared/components/Cards/ScholarshipCard.tsx`
```ts
interface ScholarshipCardProps { scholarship: Scholarship; layout?: 'desktop' | 'mobile'; } // default 'desktop'
```
- **Desktop:** vertical card, gold accent bar (`.card-accent-gold`), coverage badge (`badge-gold-subtle`), country flag/name, deadline countdown with urgency colors, `.btn-outline-blue` CTA.
- **Mobile:** horizontal compact card with thumbnail and deadline badge.

### 2.3 Custom cards
For a new card type assemble it from the shared card classes rather than a new shell:
```tsx
<div className="card-interactive-blue group">
  <div className="card-media-box">
    <img src="…" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
    <div className="card-accent-blue" />
  </div>
  <div className="p-4 flex flex-col gap-3">
    <span className="badge-blue">أمن سيبراني</span>
    <h4 className="card-title">تحدي اختراق الأنظمة المتقدم</h4>
    <p className="card-subtitle">اختبر مهاراتك في بيئة محاكاة واقعية</p>
    <div className="card-meta-row">
      <span>المستوى: متقدم</span>
      <button className="btn-gold py-1.5 px-3 text-xs">ابدأ التحدي</button>
    </div>
  </div>
</div>
```

---

## 3. Search, inputs & state

### 3.1 Smart search box — `<SmartSearchBox />`
- **Path:** `src/shared/components/Search/SmartSearchBox.tsx`
```ts
interface SmartSearchBoxProps {
  variant?: 'desktop' | 'mobile'; // default 'desktop'
  onSearch?: (query: string, type: 'all' | 'course' | 'scholarship') => void;
}
```
Pill-shaped glass container (`.search-form-desktop` / `.search-form-mobile`), a 3-way type toggle with the sliding chamber indicator, rotating placeholder examples, and the astrolabe submit button.

### 3.2 Dropdown — `<Dropdown />`
- **Path:** `src/shared/components/Form/Dropdown.tsx` — simple select-menu shell for form/sort controls.

### 3.3 Empty & error state — `<StatePanel />`
- **Path:** `src/shared/components/State/StatePanel.tsx`
```ts
interface StatePanelProps {
  title: string; text?: string; icon?: React.ReactNode;
  tone?: 'neutral' | 'danger'; action?: React.ReactNode;
}
```
The shared empty / error chamber — icon circle + title + message + optional action. `tone="danger"` swaps the icon circle to a red alert. Prefer it over hand-rolled empty states.

### 3.4 Placeholder page body — `<FeaturePlaceholder />`
- **Path:** `src/shared/components/Placeholder/FeaturePlaceholder.tsx` — the "under construction" body for routes whose page is not built yet. `<OrbitalEmblem />` in the same folder is the decorative emblem it can use.

---

## 4. Navigation & app shell

### 4.1 Desktop navbar — `<DesktopNavbar />`
- **Path:** `src/shared/components/Navbar/DesktopNavbar.tsx`
- Glassmorphism sticky header (`.glass-navbar`), `<BrandLogo />`, gold active underline, search shortcut, notifications bell, profile circle. Reads `NAV_TABS` (desktop set).

### 4.2 Mobile header — `<MobileHeader />`
- **Path:** `src/shared/components/Navbar/MobileHeader.tsx` — compact 64px header with brand, notifications and profile triggers.

### 4.3 Mobile bottom bar — `<MobileBottomBar />`
- **Path:** `src/shared/components/BottomNav/MobileBottomBar.tsx` — fixed bottom nav over the mobile tab set, gold active dot, safe-area padding.

### 4.4 Footer — `<Footer />`
- **Path:** `src/shared/components/Footer/Footer.tsx` — multi-column celestial footer (mission, pillar links, newsletter, copyright).

> **Never render any of the above inside a page view.** The shell is owned by `src/app/layouts/RootLayout.tsx`.

---

## 5. Badges & tags

| Class | Visual | Use |
| :--- | :--- | :--- |
| `.badge-gold` | gold tint, gold text, pill | achievement, "مميز", "الأعلى تقييمًا" |
| `.badge-blue` | cyan tint, cyan text, pill | category tags ("ذكاء اصطناعي", "برمجة") |
| `.badge-gold-subtle` | subtle amber tint + border | funding ("منحة ممولة بالكامل") |
| `.tag-box` | dark navy box + border | metadata ("مبتدئ", "6 أسابيع") |

---

## 6. Artwork, visuals & loaders

### 6.1 Brand logo — `<BrandLogo />`
- **Path:** `src/shared/components/Artwork/BrandVisuals.tsx` (`size?`, `showText?`, `textClass?`) — official mark framed in an illuminated brass ring, SVG fallback.

### 6.2 Celestial canvas — `<CelestialCanvas />`
- **Path:** `src/shared/components/Artwork/CelestialCanvas.tsx` (`className?`, `interactive?`) — HTML5 canvas star particles, twinkling stars, mouse-reactive constellation lines.

### 6.3 Astrolabe loader — `<AstrolabeLoader />`
- **Path:** `src/shared/components/Loading/AstrolabeLoader.tsx` (`fullScreen?`, `message?`) — rotating brass rings, cyan ellipse, pulsing core, academy loading logo.

---

## 7. Banners, timers & events

### 7.1 Competition banner — `<CompetitionBanner />`
- **Path:** `src/shared/components/Banners/CompetitionBanner.tsx` (`competition`, `variant?`, `onRegister?`) — double gold frame, glass chamber, live countdown with active digit glow (`.digit-box-active`), prize tag, register CTA.

### 7.2 Countdown digits — `<CountdownDigits />`
- **Path:** `src/shared/components/Banners/CountdownDigits.tsx` — the shared countdown chamber used by `CompetitionBanner` and `ChallengeSpotlightCard`. Driven by `useCountdown` (`shared/hooks/useCountdown.ts`).

### 7.3 Event section — `<EventSection />`
- **Path:** `src/shared/components/Events/EventSection.tsx` (`featuredEvent`, `workshopEvent`, `variant?`) — spotlight keynote banner + seminar calendar cards with speaker credentials and register buttons.

---

## 8. Shared page patterns

### 8.1 Item detail view — `<ItemDetailView />`
- **Path:** `src/shared/components/Detail/ItemDetailView.tsx` — the shared course/scholarship detail layout (hero, meta, body columns).

### 8.2 Side-by-side switch — `<SlidingSegmentedControl />`
- **Path:** `src/shared/components/Controls/SlidingSegmentedControl.tsx`
```ts
options: { id: string; label: string }[]; value: string;
onChange: (id: string) => void; tone?: 'blue' | 'gold';
className?: string; 'aria-label'?: string;
```
The one shared spring-glide puck switch (same motion as the home search bar). Use it for **every** side-by-side toggle — see [`khawarizm-motion`](../../khawarizm-motion/SKILL.md) §7. `.seg-*` styling lives in `globals.css`.

---

## 9. Authentication (`src/features/auth/`)

`hideShell: true` login route. All styling lives on the `.auth-*` concept classes in **`src/features/auth/auth.css`** (imported by `globals.css`) — see the Authentication index in `design-tokens-and-classes.md`.

- **Page:** `src/features/auth/pages/LoginPage.tsx` — thin orchestrator: provider → shell → toast → both views → terms modal. `mode: 'login' | 'welcome-back'` is derived from `?mode=` (`AUTH_MODE_OPTIONS`, labels in `shared/json/auth.json`).
- **Views:** `components/views/LoginView/DesktopLoginView.tsx` + `MobileLoginView.tsx`; shared state via `useAuthLogin()` (`context/authLoginContext.ts`) owned by `AuthLoginProvider.tsx`.
- **Cards:** `components/cards/ActiveAuthCard.tsx` (picks the card by a `Record<AuthMode, …>`), `DefaultLoginCard.tsx`, `WelcomeBackCard.tsx`.
- **Hero:** `components/hero/AuthHeroPanel.tsx` (desktop split pane, `.auth-orbit-*`), `BrandSeal.tsx` (shared by hero header + mobile brand).
- **Chrome:** `components/chrome/AuthTopBar.tsx`, `AuthLegalNotice.tsx` — one component each, with a `Record<AuthSurface, …>` for surface-varying labels/classes. Import like `@/features/auth/components/chrome/AuthTopBar`.
- **Controls:** `components/controls/AuthModeSwitch.tsx` (one pill for desktop **and** mobile; `lg:` breakpoints + short/long labels from `auth.json`; active class from a record), `AuthSocialButton.tsx` (`PROVIDERS` record holds surface class + brand mark — no provider branch).
- **Overlays:** `components/overlays/AuthTermsModal.tsx`, `AuthToast.tsx` — flat shared components that return `null` when hidden.

---

## 10. Catalog explorer (`src/features/catalog/`)

`/catalog` route. Styling lives on `.catalog-*` classes in **`src/features/catalog/catalog.css`** (imported by `globals.css`).

- **Page:** `pages/CatalogPage.tsx` — `type` and `q` are URL-derived; other filters live in local state. Renders `.catalog-hero` with two `<SmartSearchBox />` slots sharing one `searchProps` object, `<CatalogToolbar />`, `<CatalogDataSection />`, `<CatalogFilterSidebar />`, `<CatalogMobileFilterDrawer />`.
- **Layout:** `components/layout/CatalogResults.tsx` (composition root) and `components/layout/CatalogDataSection.tsx` (the only section that re-renders on filter/data change; cache key includes every filter; cold miss → `<CatalogGridSkeleton count={6} />`; empty & error use `<StatePanel />` + `.catalog-state`; background revalidation shows `.catalog-revalidation-line`).
- **Hero:** `components/hero/CatalogHero.tsx`.
- **Filters (written once):** `components/filters/CatalogFilterSidebar.tsx` (desktop `.catalog-sidebar`), `components/filters/CatalogMobileFilterDrawer.tsx` (mobile sheet) — both render `components/filters/CatalogFilterGroups.tsx`; `PILL_ACTIVE` / `PILL_IDLE` records map tone + surface to `.catalog-pill*` classes.
- **Card:** `components/cards/CatalogCard.tsx` — shell `group card-interactive-blue | card-interactive-gold`; `pillarStyle(item)` and `DEADLINE_ACCENT` records replace branches.
- **Toolbar & pagination:** `components/toolbar/CatalogToolbar.tsx` (+ `components/toolbar/CatalogPagination.tsx`).
- **Skeleton:** `components/states/CatalogGridSkeleton.tsx` — reuses `.catalog-grid`, `.catalog-card-media`, `.catalog-card-body` so it is pixel-parallel to the real grid.

---

## 11. Courses (`src/features/courses/`)

Course landing + player + certificate. Styling lives on `.course-*` / player classes in **`src/features/courses/courses.css`**. Static content lives in `shared/json/mockCourses.json` / `courseSystem.json` (`mockCourseProblems.json` for the problems panel).

- **Pages:** `pages/CourseLandingPage.tsx`, `pages/CoursePlayerPage.tsx`, `pages/CourseCertificatePage.tsx`.
- **Views (Desktop/Mobile pairs):** `components/views/CourseLandingView/` (`DesktopCourseLandingView` + `MobileCourseLandingView`), `components/views/CoursePlayerView/` (`DesktopCoursePlayerView` + `MobileCoursePlayerView`), and `components/views/CertificateView.tsx`.
- **Hero & breadcrumb:** `components/hero/CourseHeaderBlock.tsx`, `components/chrome/CourseBreadcrumb.tsx`.
- **Landing body:** `components/layout/CourseAbout.tsx`, `CourseOutcomes.tsx`, `CourseCurriculum.tsx`, `CoursePathModules.tsx`, `RelatedCoursesRail.tsx`.
- **CTA & conversion:** `components/controls/CourseActionPanel.tsx`, `CoursePrimaryCta.tsx`, `CourseStickyCta.tsx`.
- **Player chrome:** `components/chrome/PlayerTopBar.tsx`, `LessonTabBar.tsx`, `CoursePathSidebar.tsx`; `components/layout/PlayerStage.tsx`, `PlayerPanels.tsx` (`LessonPanel`, `LiveSessionPanel`, `ExamPanel`, `ProblemsPanel`); `components/overlays/PlayerMiniPlayer.tsx`, `PlayerSyllabusDrawer.tsx`, `CourseToast.tsx`; `components/controls/PlayerSettingsMenu.tsx`.
- **Cards:** `components/cards/CurriculumModuleCard.tsx`, `PathLessonRow.tsx`, `InstructorCard.tsx`, `LiveSessionCard.tsx`, `LiveSessionPlayerCard.tsx`, `ExamCalloutCard.tsx`, `CertificatePreview.tsx`.
- **States:** `components/states/CourseLandingSkeleton.tsx`, `CoursePlayerSkeleton.tsx`, `CourseNotFound.tsx`.
- **Data:** `data/` holds the non-JSON modules; reads go through `shared/mocks/courses.ts` + `@/shared/hooks/useCachedData` with keys such as `['course-detail', slug]` and `['course-problems', slug]`.

---

## 12. Dashboard workspace (`src/features/dashboard/`)

`/dashboard` learning workspace. Styling lives on `.dash-*` classes in **`src/features/dashboard/dashboard.css`** (imported by `globals.css`). Static content: `shared/json/dashboardViews.json` / `dashboardChambers.json` / `dashboardNav.json` / `dashboardNotifications.json`; `RING_COLORS` in `features/dashboard/data/radialRingColors.ts` (hex required for the `$(color)80` glow alpha); fetchers in `features/dashboard/data/dashboardFetchers.ts`.

- **Page:** `pages/DashboardPage.tsx` — `?view=` from the URL (`getDashboardNavItem`, aliases resolve); `?state=live|empty` demo modes. RTL grid `.dash-grid` with `<DesktopDashboardSidebar />` as Child #1.
- **Layout:** `components/layout/DashboardShell.tsx`, `DashboardMain.tsx`.
- **Chrome:** `components/chrome/DesktopDashboardSidebar.tsx` (isolated rail `sticky top-0 h-screen overflow-y-auto`; bottom row pairs the saved bookmark + notification bell), `DashboardTopBar.tsx` (sticky glass, search overlay), `MobileDashboardTopBar.tsx` (same bookmark + bell pair), `DashboardStatsHeader.tsx`, `DashboardStatsSidebar.tsx`, `DashboardSubNavigation.tsx` (mobile/tablet-only pill strip — `.dash-subnav` is `lg:hidden`).
- **Hero cards:** `components/cards/PriorityContinueCard.tsx` (cyan) / `LiveSessionPriorityCard.tsx` (red live countdown) — share `.dash-hero*`, `.dash-progress*`, `RadialProgressRing.tsx`.
- **Views:** `components/views/EnrolledCoursesView.tsx`, `CompetitionsCertificatesView.tsx`, `SavedScholarshipsView.tsx`, `NotificationsView.tsx`; `components/cards/EnrolledCourseCard.tsx`, `EnrolledCourseRow.tsx`, `NotificationListItem.tsx`, `ChallengeSpotlightCard.tsx`.
- **States:** `components/states/EmptyDashboardState.tsx` (brand-new account hero, `.dash-compass` + `.animate-orbit-slow`).
- **Overlays (chambers):** `components/overlays/CourseWorkspaceModal.tsx`, `LiveClassroomModal.tsx`, `CompetitionArenaModal.tsx`, `ScholarshipApplicationModal.tsx`, `CertificatePreviewModal.tsx`, `NotificationsDrawer.tsx` — all share `.dash-modal-overlay` + `.dash-modal-shell`; internals driven by `dashboardChambers.json`.
- **Notifications** is a `fullPageViews` entry: the page-level stats header hides and `<NotificationsView />` renders its own header + `btn-pill-subtle` mark-all-read action.
