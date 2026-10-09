# Khawarizm Academy — Master Shared Component & Class Catalog

> **Directory:** `src/shared/components/`  
> **Rule:** Always inspect this catalog before writing any new component. If a component or styling already exists here, reuse it directly.

---

## 1. Buttons & Interactive Controls (Semantic Classes)

All buttons are defined as concept classes in `src/styles/globals.css` using Tailwind v4 `@apply`.

### 1.1 Primary CTA Button (`.btn-gold`)
- **Visual:** Radiant gold gradient (`#E5B65C` to `#F3CE7A`), dark text (`#040F24`), bold `IBM Plex Sans Arabic`, gold elevation glow, active press scale (`0.98`).
- **Usage:** Exactly **one primary action per screen or major section** (e.g. "سجل الآن", "ابدأ رحلتك", "تأكيد").
- **Code:**
```tsx
<button className="btn-gold">
  <span>سجل الآن</span>
</button>
```

### 1.2 Secondary Tech Button (`.btn-outline-blue`)
- **Visual:** 1px cyan border (`#29A9FF`), transparent-to-tinted background, cyan text, subtle hover glow.
- **Usage:** Secondary actions, details exploration, filters (e.g. "استكشف التفاصيل", "عرض المسار").
- **Code:**
```tsx
<button className="btn-outline-blue">
  <span>استكشف المسار</span>
</button>
```

### 1.3 Subtle Pill Button (`.btn-pill-subtle`)
- **Visual:** Navy background (`#061A3A`), slate border (`#1B3F80`), off-white text, subtle scale on hover.
- **Usage:** Filter chips, secondary tags, category selectors.
- **Code:**
```tsx
<button className="btn-pill-subtle">
  <span>ذكاء اصطناعي</span>
</button>
```

### 1.4 Squircle Action Icon Button (`.btn-icon-box`)
- **Visual:** 36x36px (`w-9 h-9`), rounded-2xl (`rounded-2xl`), navy surface with border, hover scale.
- **Usage:** Bookmark, share, search trigger, compact toolbar actions.
- **Code:**
```tsx
<button className="btn-icon-box" title="حفظ">
  <BookmarkIcon className="w-4 h-4" />
</button>
```

### 1.5 Circular Action Icon Button (`.btn-icon-circle`)
- **Visual:** 40x40px (`w-10 h-10`), fully rounded circle, navy surface with cyan glow on hover.
- **Usage:** User avatar button, navigation arrow buttons, circular controls.
- **Code:**
```tsx
<button className="btn-icon-circle" title="الملف الشخصي">
  <UserIcon className="w-4 h-4 text-[#8299B5]" />
</button>
```

### 1.6 Inline Action Links (`.link-action-blue` / `.link-action-gold`)
- **Visual:** Compact inline flex link with subtle padding, arrow, and colored hover state.
- **Code:**
```tsx
<a href="/courses" className="link-action-blue">
  <span>عرض كافة الدورات</span>
  <span>←</span>
</a>
```

---

## 2. Card Components

### 2.1 Course Card (`<CourseCard />`)
- **Path:** `src/shared/components/Cards/CourseCard.tsx`
- **Props:**
  ```ts
  interface CourseCardProps {
    course: Course;
    layout?: 'desktop' | 'mobile'; // default: 'desktop'
  }
  ```
- **Features:**
  - **Desktop layout:** Vertical 3-row card with 128px media thumbnail, cyber-cyan accent bar (`.card-accent-blue`), instructor avatar, rating with star, total lectures count, and `.btn-gold` CTA.
  - **Mobile layout:** Horizontal compact card with media on the right (in RTL), optimized for one-thumb scanning.
- **Usage:**
```tsx
import { CourseCard } from '@/shared/components/Cards/CourseCard';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {courses.map(course => (
    <CourseCard key={course.id} course={course} layout="desktop" />
  ))}
</div>
```

### 2.2 Scholarship Card (`<ScholarshipCard />`)
- **Path:** `src/shared/components/Cards/ScholarshipCard.tsx`
- **Props:**
  ```ts
  interface ScholarshipCardProps {
    scholarship: Scholarship;
    layout?: 'desktop' | 'mobile'; // default: 'desktop'
  }
  ```
- **Features:**
  - **Desktop layout:** Vertical card with brass gold accent bar (`.card-accent-gold`), coverage badge (`badge-gold-subtle`), country flag with name, remaining deadline countdown days with urgency colors, and `.btn-outline-blue` CTA.
  - **Mobile layout:** Horizontal compact card with thumbnail and deadline badge.
- **Usage:**
```tsx
import { ScholarshipCard } from '@/shared/components/Cards/ScholarshipCard';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {scholarships.map(scholarship => (
    <ScholarshipCard key={scholarship.id} scholarship={scholarship} layout="desktop" />
  ))}
</div>
```

### 2.3 Custom Card Construction (If building a specialized card)
If you need a new card type (e.g. Exam Card, Problem Set Card, Competition Card), assemble it using the existing card concept classes:
```tsx
<div className="card-interactive-blue group">
  {/* 1. Media Area */}
  <div className="card-media-box">
    <img src="..." className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
    <div className="card-accent-blue" />
  </div>

  {/* 2. Body Content */}
  <div className="p-4 flex flex-col gap-3">
    <span className="badge-blue">أمن سيبراني</span>
    <h4 className="card-title">تحدي اختراق الأنظمة المتقدم</h4>
    <p className="card-subtitle">اختبر مهاراتك في بيئة محاكاة واقعية</p>
    
    {/* 3. Meta Row */}
    <div className="card-meta-row">
      <span>المستوى: متقدم</span>
      <button className="btn-gold py-1.5 px-3 text-xs">ابدأ التحدي</button>
    </div>
  </div>
</div>
```

---

## 3. Search & Input Controls

### 3.1 Smart Search Box (`<SmartSearchBox />`)
- **Path:** `src/shared/components/Search/SmartSearchBox.tsx`
- **Props:**
  ```ts
  interface SmartSearchBoxProps {
    variant?: 'desktop' | 'mobile'; // default: 'desktop'
    onSearch?: (query: string, type: 'all' | 'course' | 'scholarship') => void;
  }
  ```
- **Features:**
  - Pill-shaped glass container (`.search-form-desktop` / `.search-form-mobile`).
  - Integrated 3-way toggle pill (`الكل`, `دورات`, `منح`) with animated sliding chamber indicator.
  - Rotating animated placeholder examples.
  - Stylized astrolabe/compass submit button (`.btn-search-submit`).
- **Usage:**
```tsx
import { SmartSearchBox } from '@/shared/components/Search/SmartSearchBox';

<SmartSearchBox 
  variant="desktop" 
  onSearch={(query, type) => handleCatalogSearch(query, type)} 
/>
```

---

## 4. Navigation & App Shell

### 4.1 Desktop Top Navigation (`<DesktopNavbar />`)
- **Path:** `src/shared/components/Navbar/DesktopNavbar.tsx`
- **Props:**
  ```ts
  interface DesktopNavbarProps {
    activeTab?: NavTabKey; // 'home' | 'courses' | 'scholarships' | 'catalog' | 'events' | 'profile'
    onSelectTab?: (tab: NavTabKey) => void;
  }
  ```
- **Features:** Glassmorphism sticky header (`.glass-navbar`), `<BrandLogo />`, gold glow active indicator underline, search shortcut, notifications bell with red dot, user profile circle.

### 4.2 Mobile Header (`<MobileHeader />`)
- **Path:** `src/shared/components/Navbar/MobileHeader.tsx`
- **Features:** Compact 64px mobile header with BrandLogo, notifications, and profile triggers.

### 4.3 Mobile Bottom Bar (`<MobileBottomBar />`)
- **Path:** `src/shared/components/BottomNav/MobileBottomBar.tsx`
- **Props:** `activeTab`, `onSelectTab`
- **Features:** Fixed bottom mobile navigation with 5 key tabs, gold active dot, safe-area inset support.

### 4.4 Global Footer (`<Footer />`)
- **Path:** `src/shared/components/Footer/Footer.tsx`
- **Features:** Multi-column celestial footer with academy mission, pillars links, newsletter subscription box, and copyright disclaimer.

---

## 5. Badges & Tags

| Semantic Class | Visual | Ideal Use Case |
| :--- | :--- | :--- |
| `.badge-gold` | Gold background tint, gold text, pill radius | Achievement, "مميز", "الأعلى تقييمًا" |
| `.badge-blue` | Cyan background tint, cyan text, pill radius | Category tags ("ذكاء اصطناعي", "برمجة") |
| `.badge-gold-subtle` | Subtle amber tint with border | Scholarship funding ("منحة ممولة بالكامل") |
| `.tag-box` | Rectangular dark navy box with border | Metadata items ("مبتدئ", "6 أسابيع") |

---

## 6. Artwork, Visuals & Loaders

### 6.1 Master Brand Logo (`<BrandLogo />`)
- **Path:** `src/shared/components/Artwork/BrandVisuals.tsx`
- **Props:**
  ```ts
  interface BrandLogoProps {
    size?: number;        // default: 42
    showText?: boolean;   // default: true
    textClass?: string;   // default: 'text-xl font-bold text-[#E5B65C]'
  }
  ```
- **Features:** Uses the official master brand asset (`icon-192.png`) framed in an illuminated brass ring with automatic SVG fallback.

### 6.2 Celestial Canvas (`<CelestialCanvas />`)
- **Path:** `src/shared/components/Artwork/CelestialCanvas.tsx`
- **Props:** `className?: string`, `interactive?: boolean`
- **Features:** HTML5 Canvas rendering interactive cosmic star particles, twinkling stars, and mouse-reactive constellation lines.

### 6.3 Astrolabe Loader (`<AstrolabeLoader />`)
- **Path:** `src/shared/components/Loading/AstrolabeLoader.tsx`
- **Props:** `fullScreen?: boolean`, `message?: string`
- **Features:** Rotating brass gear astrolabe rings, cyber-cyan ellipse, central pulsing core, and official academy `loading-logo.png`.

---

## 7. Banners & Timers

### 7.1 Competition Banner (`<CompetitionBanner />`)
- **Path:** `src/shared/components/Banners/CompetitionBanner.tsx`
- **Props:** `competition: CompetitionBannerData`, `variant?: 'desktop' | 'mobile'`, `onRegister?: () => void`
- **Features:** Double-bordered gold frame (`.banner-frame-gold`), glass inner chamber, live countdown with active digit glow boxes (`.digit-box-active`), prize pool tag, and register CTA.

### 7.2 Event Section (`<EventSection />`)
- **Path:** `src/shared/components/Events/EventSection.tsx`
- **Props:** `featuredEvent: FeaturedEvent`, `workshopEvent: WorkshopEvent`, `variant?: 'desktop' | 'mobile'`
- **Features:** Spotlight keynote banner + seminar calendar cards with speaker credentials and registration buttons.

---

## 8. Authentication (`src/features/auth/`)

Feature-scoped components for the `hideShell: true` login route. All styling lives on the
`.auth-*` concept classes in **`src/features/auth/auth.css`** (imported by `globals.css`) —
see the Authentication index in `design-tokens-and-classes.md`.

### 8.1 Page (`<LoginPage />`)
- **Path:** `src/features/auth/pages/LoginPage.tsx`
- **State:** `mode: 'login' | 'welcome-back'` derived from `?mode=` (`AUTH_MODE_OPTIONS` in `types.ts`, labels in `shared/json/auth.json`).
- **Renders:** toast (`.auth-toast`), terms modal (`.auth-terms-scrim`), `<AuthModeSwitch />`, `<AuthHeroPanel />`, and either `<DefaultLoginCard />` or `<WelcomeBackCard />`.

### 8.2 Mode Switcher (`<AuthModeSwitch />`)
- **Path:** `src/features/auth/components/AuthModeSwitch.tsx`
- **Props:** `mode: AuthMode`, `onChange: (mode: AuthMode) => void`
- **Features:** One pill for desktop **and** mobile — `lg:` breakpoints plus short/long labels from `auth.json` pick label and size. Active color comes from the `ACTIVE_CLASS` record, not a branch.

### 8.3 Social Button (`<AuthSocialButton />`)
- **Path:** `src/features/auth/components/AuthSocialButton.tsx`
- **Props:** `provider: 'google' | 'facebook'`, `label`, `onClick?`, `disabled?`
- **Features:** `.auth-social-google` / `.auth-social-facebook` surface and the official brand mark come from the single `PROVIDERS` record (raw SVG allowed only for brand logos).

### 8.4 Cards & Hero
- `<DefaultLoginCard />` — email/password form on `.auth-field` / `.auth-input-wrap`, remember-me, gold submit.
- `<WelcomeBackCard />` — avatar (`.auth-avatar`), user name/badge, stats bar (`.auth-stats-bar`), returning CTA.
- `<AuthHeroPanel />` — split-screen right pane: brand seal, orbit stage (`.auth-orbit-ring-outer` + `.animate-orbit-slow`), hero title/text, trust row, hero stats.

---

## 9. Catalog Explorer (`src/features/catalog/`)

Feature-scoped components for the `/catalog` route. All styling lives on the
`.catalog-*` concept classes in **`src/features/catalog/catalog.css`** (imported by `globals.css`) —
see the Catalog index in `design-tokens-and-classes.md`.

### 9.1 Page (`<CatalogPage />`)
- **Path:** `src/features/catalog/pages/CatalogPage.tsx`
- **State:** `type` and `q` are URL-derived; every other filter lives in local `PersistentFilters` state.
- **Renders:** `.catalog-hero` with two `<SmartSearchBox />` slots sharing one `searchProps` object, `<CatalogToolbar />`, `<CatalogDataSection />`, `<CatalogFilterSidebar />`, `<CatalogMobileFilterDrawer />`.

### 9.2 Data Boundary (`<CatalogDataSection />`)
- **Path:** `src/features/catalog/components/CatalogDataSection.tsx`
- **Features:** the only section that re-renders on filter/data changes (cache key includes every filter). Cold miss shows `<CatalogGridSkeleton count={6} />`; error and empty states share `glass-panel` + `.catalog-state`; background revalidation shows `.catalog-revalidation-line`.

### 9.3 Filter Panels (written once)
- `<CatalogFilterSidebar />` — desktop `w-72` panel on `.catalog-sidebar`.
- `<CatalogMobileFilterDrawer />` — mobile bottom sheet on `.catalog-drawer` / `.catalog-drawer-panel`.
- Both render **`<CatalogFilterGroups surface tab filters onChangeFilter />`** — the pill rows exist in one place; `PILL_ACTIVE` / `PILL_IDLE` records map tone + surface to `.catalog-pill*` classes. Never copy pill markup between the two surfaces.

### 9.4 Result Card (`<CatalogCard />`)
- **Path:** `src/features/catalog/components/CatalogCard.tsx`
- **Shell:** `group card-interactive-blue | card-interactive-gold` — the shared class supplies the whole card shell; JSX only adds `group`.
- **Records, not branches:** `pillarStyle(item)` picks accent, strip, and meta line per pillar; `DEADLINE_ACCENT` picks the badge accent per urgency (critical pulses).

### 9.5 Toolbar, Pagination & Skeleton
- `<CatalogToolbar />` — count chip (`.catalog-toolbar-count`), mobile filter trigger + sort dropdown (`.catalog-chip-btn`, `.catalog-sort-menu`); sort labels come from `shared/json/catalog.json`.
- `<CatalogPagination />` — `.catalog-page-nav` arrows + `.catalog-page` numbers (`.catalog-page-active` / `.catalog-page-idle`).
- `<CatalogGridSkeleton />` — Tier 2 skeleton that reuses `.catalog-grid`, `.catalog-card-media`, `.catalog-card-body`, so the skeleton is pixel-parallel to the real grid.

---

## 10. Dashboard Workspace (`src/features/dashboard/`)

Components for the `/dashboard` learning workspace. All styling lives on the
`.dash-*` concept classes in **`src/features/dashboard/dashboard.css`** (imported by `globals.css`) —
see the Dashboard index in `design-tokens-and-classes.md`. Static content lives in
`src/shared/json/dashboardViews.json` / `dashboardChambers.json`; `RING_COLORS` lives in
`features/dashboard/data/radialRingColors.ts` (hex required for the `$(color)80` glow alpha).

### 10.1 Page (`<DashboardPage />`)
- **Path:** `src/features/dashboard/pages/DashboardPage.tsx`
- **State:** `#view`/'?view=' from the URL (`getDashboardNavItem`, aliases resolve); `?state=live|empty` demo modes.
- **Layout rules (§6.1):** RTL grid `.dash-grid` — `<DesktopDashboardSidebar />` is Child #1 (renders far right), main column second.

### 10.2 Shell & Stats
- `<DesktopDashboardSidebar />` — **isolated rail**: `.dash-sidebar` (`sticky top-0 h-screen overflow-y-auto`, glass navy-950/90 + blur) stays pinned to the viewport on every view and scrolls internally if long; `.dash-side-row` rows (add `group` in JSX for `group-hover:*`), `.dash-nav-item-active` (translucent gold) / `-idle` from `dashboardNav.json`. The bottom row pairs the **saved bookmark + notification bell** (`.dash-bell-active/-idle`; saved has no nav item — `?view=saved` is icon-only).
- `<DashboardTopBar />` — sticky glass topbar (`.dash-topbar`, mirrors `.glass-navbar`); search overlay (`.dash-search-overlay` + `.dash-search-panel`), `NAV_TARGETS[tab.key]` route links.
- `<MobileDashboardTopBar />` — mobile-only top row with the same **bookmark + bell** pair (`onSavedClick` / `onNotificationsClick`); no desktop/mobile duplication.
- `<DashboardStatsHeader />` — desktop greet row (white `.dash-greet-title`) + mobile row with the bookmark + bell pair (`onSavedClick`, `isSavedActive`); `<DashboardStatsSidebar />` — glass `workspace-card` widgets, inset stat rows, upcoming events.
- `<DashboardSubNavigation />` — **mobile/tablet-only** pill strip (`.dash-subnav` is `lg:hidden`): below `lg` it is the only in-dashboard nav (`DASHBOARD_SUB_NAV`: main, enrolled, profile); at `lg+` the sidebar owns navigation and it disappears.
- `notifications` is a `fullPageViews` entry: the page-level stats header is hidden and `<NotificationsView />` renders its own single header + `btn-pill-subtle` mark-all-read action.

### 10.3 Priority Hero Cards
- `<PriorityContinueCard />` (cyan) / `<LiveSessionPriorityCard />` (red live countdown) — share `.dash-hero*`, `.dash-progress*`, `<RadialProgressRing />`; records `STAT_ROWS` / `EVENT_TAG_TONE` replace per-card branches; the countdown uses `var(--color-danger)`.

### 10.4 Views
- `<EnrolledCoursesView />` — `.dash-filter-pill` pair, `.dash-sort-menu` (pair with inline `animate-fade-in-up`), `<EnrolledCourseCard />` + `<EnrolledCourseRow />` share `.dash-course-card-details`, empty state uses `.dash-empty-btn-primary`.
- `<CompetitionsCertificatesView />` — `ToggleFilter` (`.dash-toggle-active` / `-idle`), `<CompetitionRow />` (`dash-row`), `.dash-cert-card` certs + `CertificatePreviewModal`.
- `<SavedScholarshipsView />` — rows + `.dash-deadline-tag` tones (`DEADLINE_TONE`), undo toast (`.dash-toast`).
- `<NotificationsView />` / `<NotificationsDrawer />` — `<NotificationListItem />` (`.dash-notif-unread/-read`, `NOTIF_TYPES` tone record), `.dash-drawer-*`.
- `<EmptyDashboardState />` — brand-new account hero (`.dash-empty-hero`, `.dash-compass` + `.animate-orbit-slow`), CTAs route to catalog.

### 10.5 In-Dashboard Chambers (modals)
- `<CourseWorkspaceModal />` — lessons (`.dash-stage-*`), `<LiveClassroomModal />` — chat (`.dash-chat-*`) + `CHAT_TONE` record, `<CompetitionArenaModal />` — leaderboard/langs/editor (`.dash-arena-*`, `.dash-lead-*`, `.dash-code-*`), `<ScholarshipApplicationModal />` — qualification checks (`.dash-check-*`), `<CertificatePreviewModal />`.
- All use the shared `.dash-modal-overlay` (scrim `bg-navy-950/85 backdrop-blur-md`) + `.dash-modal-shell` chrome; internals driven by JSON in `dashboardChambers.json`.
