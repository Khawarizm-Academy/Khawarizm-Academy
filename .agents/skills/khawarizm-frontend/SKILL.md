---
name: khawarizm-frontend
description: Master design, engineering, and architecture playbook for Khawarizm Academy frontend. Use whenever creating, styling, refactoring, or extending pages, features, UI components, animations, or state in Khawarizm Academy. Covers the observatory celestial design system, directory placement matrix, anti-duplication rules, component reuse, Tailwind v4 @apply semantic classes, extracting repeated class strings into concept classes, RTL localization, and page creation blueprints.
---

# Khawarizm Academy — Master Frontend Engineering & Design Skill

The **definitive operational guide and standard** for developing the Khawarizm Academy web platform. It tells you:
1. **How to use the design** (Observatory celestial theme, tokens, Tailwind v4 `@apply` concept classes).
2. **Where every file belongs** (directory & placement rules).
3. **How to avoid repeating code** (anti-duplication rules and component reuse).
4. **How to assemble any new page/feature in minutes** without redundant markup.

> Human-facing twins of this skill: [`docs/01-design-system.md`](../../../docs/01-design-system.md) and [`docs/02-architecture.md`](../../../docs/02-architecture.md). The skill stays the canonical source for agents.

---

## 1. Deep project analysis & mental model

### 1.1 The dual-pillar Observatory architecture
Two core educational pillars share one geometric design grammar:
- **Courses pillar (الدورات التدريبية):** cyber-cyan accents (`#167BDB` / `#29A9FF`), code brackets, technology tracks, practical skill verification.
- **Scholarships & opportunities pillar (المنح والفرص الدولية):** brass gold accents (`#C88A32` / `#E5B65C`), global academic opportunities, degree sponsorships, deadline countdowns.
- **The visual theme:** "Observatory & Cyber-Intelligence" (المرصد الفلكي الذكي) — dark space canvas (`#040F24`, `#061A3A`, `#092557`), glowing brass astrolabes, starlight elevation, clean typography.

### 1.2 Core technology stack
- **Framework:** React 19 + TypeScript (strict) + Vite.
- **Styling engine:** Tailwind CSS v4 (`@import "tailwindcss"`) + `@import "./tokens.css"` + concept-oriented `@apply` classes in `src/styles/globals.css`, which also imports each per-feature CSS file (`features/auth/auth.css`, `features/catalog/catalog.css`, `features/courses/courses.css`, `features/dashboard/dashboard.css`, `features/home/home.css`, `features/profile/profile.css`).
- **Localization engine:** English domain keys internally + `toArabic(category, key)` / `toArabicNav(key, isMobile?)` in `src/shared/lib/localization.ts`.
- **Master branding:** official logo `src/assets/brand/source/KhawarizmLogo.jpg`; run `npm run brand:generate` to regenerate app icons and favicons.
- **Routing & data:** a hand-rolled data-driven router (`routes.json` + `routes.tsx` + `router.tsx`) with an in-memory SWR cache (`useCachedData` + `dataCacheManager`).

---

## 2. Directory & file placement matrix

Always follow this mapping when creating or moving files.

| What are you adding? | Target directory | File pattern |
| :--- | :--- | :--- |
| **Shared component (2+ features)** | `src/shared/components/<Category>/` | `<Component>.tsx` (e.g. `Cards/CourseCard.tsx`, `Navbar/DesktopNavbar.tsx`) |
| **Feature component (1 feature)** | `src/features/<feature>/components/<category>/` | `<Component>.tsx` in a purpose folder — `layout/`, `views/`, `chrome/`, `cards/`, `hero/`, `overlays/`, `controls/`, `states/`, `filters/`, `toolbar/`. Taxonomy: [`khawarizm-organization-and-imports`](../khawarizm-organization-and-imports/SKILL.md) |
| **Component with Desktop + Mobile views** | `src/features/<feature>/components/views/<Component>/` | `Desktop<Component>View.tsx` + `Mobile<Component>View.tsx` |
| **Feature page state shared per surface** | `src/features/<feature>/context/` | `<Area>Context.ts` (context + hook) + `<Area>Provider.tsx` (state owner) |
| **Page view** | `src/features/<feature>/pages/` | `<Feature>Page.tsx` |
| **Shared domain entity types** | `src/shared/types/` | `entities.ts` (`Course`, `Scholarship`, `Event`) |
| **Feature view types** | `src/features/<feature>/` | `types.ts` |
| **Shared hook** | `src/shared/hooks/` | `use<Name>.ts` (`useCachedData.ts`, `useHorizontalScroll.ts`) |
| **Feature hook** | `src/features/<feature>/hooks/` | `use<FeatureHook>.ts` |
| **Feature data (non-JSON)** | `src/features/<feature>/data/` | `<name>.ts` (`dashboardFetchers.ts`, `radialRingColors.ts`) |
| **Feature styles (one feature)** | `src/features/<feature>/` | `<feature>.css` — imported by `globals.css` only |
| **Static data (any kind)** | `src/shared/json/` | `<name>.json` |
| **Hydrated mock modules** | `src/shared/mocks/` | `<name>.ts` + `index.ts` barrel |
| **Shared utility / helpers** | `src/shared/lib/` | `<name>.ts` (`localization.ts`, `navigation.ts`, `cacheManager.ts`) |
| **Shared styles & tokens (2+ features)** | `src/styles/` | `tokens.css`, `globals.css` |
| **Routes & root app** | `src/app/` | `router.tsx`, `routes.tsx`, `App.tsx`, `pageLoads.ts`, `layouts/` |

> 📖 **Routing & URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md).
> 📖 **Code style:** [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md).
> 📖 **Full directory rules & flowchart:** [`references/code-reuse-and-directory-rules.md`](references/code-reuse-and-directory-rules.md).

---

## 3. Strict anti-duplication rules & component reuse

### 3.1 Buttons
**Never write raw utility strings for buttons.** Reuse the concept classes:
- **Primary action (gold):** `<button className="btn-gold">تقدم الآن</button>` — one per section/screen.
- **Secondary action (cyan outline):** `<button className="btn-outline-blue">استكشف التفاصيل</button>`.
- **Filter chips / selector pills:** `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>…</button>`.
- **Squircle icon action (36×36):** `<button className="btn-icon-box"><BookmarkIcon /></button>`.
- **Circular icon action (40×40):** `<button className="btn-icon-circle"><ShareIcon /></button>`.
- **Search submit:** `<button className="btn-search-submit"><CompassIcon /></button>`.
- **Action link:** `<a className="link-action-blue">عرض الكل ←</a>`.

### 3.2 Cards
- **Course:** `<CourseCard course={course} layout="desktop" | "mobile" />`.
- **Scholarship:** `<ScholarshipCard scholarship={scholarship} layout="desktop" | "mobile" />`.
- **Custom cards:** wrap with `.card-interactive-blue` or `.card-interactive-gold`, nesting `.card-media-box`, `.card-title`, `.card-subtitle`, `.card-meta-row`.

### 3.3 Search & inputs
- **Smart search box:** `<SmartSearchBox variant="desktop" | "mobile" onSearch={(query, type) => …} />`.
- **Form containers:** `.search-form-desktop`, `.search-form-mobile`, `.search-pills-container`, `.btn-search-submit`.
- **Dropdown:** `<Dropdown />` (`src/shared/components/Form/Dropdown.tsx`).

### 3.4 States
- **Empty / error chamber:** `<StatePanel title text icon tone="neutral" | "danger" action? />` — the shared `.state-panel*` block. Prefer it over hand-rolled empty states.
- **Skeletons:** `<DataSectionSkeleton variant count />`, `<CatalogGridSkeleton count />`, `SkeletonPrimitives`. See [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md).

### 3.5 Banners & timers
- **Competition banner:** `<CompetitionBanner competition={data} />`.
- **Event keynote & workshop:** `<EventSection featuredEvent={e1} workshopEvent={e2} />`.
- **Countdown digits:** `<CountdownDigits … />` (driven by `useCountdown`), `.digit-box` / `.digit-box-active` / `.digit-text`, `.sliding-chamber-indicator`.

### 3.6 App shell & navigation
- Top navigation: `<DesktopNavbar />` (desktop) + `<MobileHeader />` (mobile).
- Bottom navigation: `<MobileBottomBar />`.
- Global footer: `<Footer />`.
- **These belong to `RootLayout` only.** A page renders content inside `<main className="content-container">` and never re-mounts the shell (`page-wrapper` is the RootLayout root, not a page wrapper).

### 3.7 Repeated class strings → concept class
**The same run of utilities twice for the same kind of element is a missing concept class, not styling.** Extract it and use the short name in JSX.

- **Used by one feature only** → that feature's CSS: `src/features/<feature>/<feature>.css` (`auth.css`, `catalog.css`, `courses.css`, `dashboard.css`, `home.css`, `profile.css`).
- **Used by 2+ features** → `src/styles/globals.css`.
- Each feature CSS is `@import`ed at the top of `globals.css` (`index.css → globals.css → features/*/*.css`), so there is still **one** stylesheet entry point — never import a feature CSS from a `.tsx`.

Rules:
1. **Declare new concept classes inside `@layer components`.** Tailwind utilities live in `@layer utilities`, so a utility in JSX still wins. An **unlayered** class (`.btn-gold`, `.link-action-blue`) beats every utility — leave a class unlayered only when JSX must never override it.
2. **Use the CSS variables, not literals:** `var(--shadow-elev-2)`, `var(--shadow-elev-1)`, `var(--shadow-glow-gold)`, `var(--shadow-glow-blue)`, `var(--color-overlay-scrim)`.
3. **`@apply` accepts real Tailwind utilities only.** It fails on plain custom classes (`.flex-center`), marker classes (`group`), and plain global helpers (`animate-fade-in`, `animate-fade-in-up`, `animation-delay-100`). Keep `group` and the global helpers in JSX, or mirror an animation with a raw `animation:` property inside the class. `animate-spin`, `animate-pulse`, `animate-bounce` are real utilities and may be `@apply`-ed.
4. **No ad-hoc hex or arbitrary fonts:** use token utilities (`bg-navy-950`, `text-gold-400`, `border-navy-600`, `text-slate-400`, `bg-success-500`, `text-danger-500`) and `font-display` / `font-body` / `font-mono`.
5. **Check the class exists.** Dead classes render nothing (`.animate-fade-in` used to be missing; `animate-spin-very-slow` never existed — use `.animate-orbit-slow`).

> 📖 **Full catalog & prop APIs:** [`references/component-catalog.md`](references/component-catalog.md).

### 3.8 Authentication (login & welcome-back)
- **Page:** `<LoginPage />` (`features/auth/pages/LoginPage.tsx`, `hideShell: true`) — thin orchestrator: provider → shell → toast → both views → terms modal.
- **Surfaces:** `components/views/LoginView/DesktopLoginView.tsx` + `MobileLoginView.tsx`; shared state from `useAuthLogin()` (`context/authLoginContext.ts`) owned by `AuthLoginProvider.tsx`. Surface-varying chrome is one component with a data record: `<AuthTopBar surface />`, `<AuthLegalNotice surface />`, `<ActiveAuthCard surface />` (`Record<AuthMode, …>`).
- **Controls:** `<AuthModeSwitch />` (one pill for desktop and mobile), `<AuthSocialButton provider="google" | "facebook" />` (`PROVIDERS` record).
- **Overlays:** `<AuthToast />`, `<AuthTermsModal />` (flat shared, `null` when hidden).
- **Styling:** every element sits on an `.auth-*` class in `src/features/auth/auth.css` (imported by `globals.css`).
- **Full layout pattern:** [`khawarizm-desktop-mobile-views`](../khawarizm-desktop-mobile-views/SKILL.md).

### 3.9 Catalog (explorer & filters)
- **Page:** `<CatalogPage />` (`features/catalog/pages/CatalogPage.tsx`). `type` and `q` are URL-derived; the two `<SmartSearchBox />` slots share one `searchProps`.
- **Filters:** `<CatalogFilterSidebar />` + `<CatalogMobileFilterDrawer />` both render `<CatalogFilterGroups surface tab … />`; `PILL_ACTIVE` / `PILL_IDLE` pick the `.catalog-pill*` classes.
- **Data boundary:** `<CatalogDataSection />` — the only section that re-renders on filter/data change; empty and error states use `<StatePanel />` + `.catalog-state`.
- **Card & chrome:** `<CatalogCard />`, `<CatalogToolbar />`, `<CatalogPagination />`, `<CatalogGridSkeleton />`.
- **Styling:** every element sits on a `.catalog-*` class in `src/features/catalog/catalog.css`.

### 3.10 Courses (landing & player)
- **Pages:** `CourseLandingPage`, `CoursePlayerPage`, `CourseCertificatePage` (`features/courses/pages/`).
- **Views:** `views/CourseLandingView/` and `views/CoursePlayerView/` are Desktop/Mobile pairs; `views/CertificateView.tsx`.
- **CTA:** `CoursePrimaryCta`, `CourseStickyCta`, `CourseActionPanel`; **player chrome:** `PlayerTopBar`, `LessonTabBar`, `CoursePathSidebar`, `PlayerStage`, `PlayerPanels`, `PlayerSyllabusDrawer`, `PlayerMiniPlayer`.
- **Data:** reads via `shared/mocks/courses.ts` + `useCachedData` (`['course-detail', slug]`, `['course-problems', slug]`).
- **Styling:** `.course-*` / `.player-*` / `.cert-*` classes in `src/features/courses/courses.css`.

### 3.11 Dashboard (learning workspace)
- **Page:** `<DashboardPage />` — self-contained layout: right sidebar + top bar, RTL grid with the sidebar as **Child #1** (§6.1). `?view=` drives the active view through `getDashboardNavItem`; `?state=live|empty` are demo modes.
- **Shell & stats:** `<DesktopDashboardSidebar />` (Child #1; its bottom row pairs the saved bookmark + notification bell), `<DashboardTopBar />`, `<MobileDashboardTopBar />`, `<DashboardStatsHeader />`, `<DashboardStatsSidebar />`, `<DashboardSubNavigation />` (mobile/tablet-only, `.dash-subnav` is `lg:hidden`).
- **Priority cards:** `<PriorityContinueCard />` (cyan) and `<LiveSessionPriorityCard />` (red live countdown) share `.dash-hero*` and `<RadialProgressRing />` (`RING_COLORS` in `features/dashboard/data/radialRingColors.ts`).
- **Views:** `<EnrolledCoursesView />`, `<CompetitionsCertificatesView />`, `<SavedScholarshipsView />`, `<NotificationsView />`, `<NotificationsDrawer />`, `<EmptyDashboardState />` — data-driven from `dashboardViews.json` / `dashboardChambers.json`.
- **Chambers (§6.2):** `<CourseWorkspaceModal />`, `<LiveClassroomModal />`, `<CompetitionArenaModal />`, `<ScholarshipApplicationModal />`, `<CertificatePreviewModal />` — all share `.dash-modal-*` chrome.
- **Styling:** every element sits on a `.dash-*` class in `src/features/dashboard/dashboard.css`. Canvas, elevation and accent rules live in §6.7.

---

## 4. Universal page creation blueprint (zero-from-scratch)

1. **Analyze the design:** identify what can be reused directly from the component catalog (usually 80%+).
2. **Types & localization:** English internal state; display labels in `localization.ts`.
3. **Assemble subcomponents** from existing concept classes — and if a utility run repeats, extract a concept class (§3.7).
4. **Compose the page body:** a thin `<main className="content-container">`; the shell stays in `RootLayout`.
5. **Verify:** `npm run build` and `npx eslint src` in `frontend/` — zero TypeScript, CSS and lint errors.

> 📖 **Full blueprint & catalog walkthrough:** [`references/page-creation-blueprint.md`](references/page-creation-blueprint.md), and the 10-step protocol in [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md).

---

## 5. Skills & reference quick-links

**Skills:**
- **Code style & quality:** [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md)
- **Desktop & mobile view split:** [`khawarizm-desktop-mobile-views`](../khawarizm-desktop-mobile-views/SKILL.md)
- **Component folders & imports:** [`khawarizm-organization-and-imports`](../khawarizm-organization-and-imports/SKILL.md)
- **Routing & URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md)
- **Loading, caching & transitions:** [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md)
- **Page & feature creation:** [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md)
- **Motion & animations:** [`khawarizm-motion`](../khawarizm-motion/SKILL.md)
- **Editing & fixing pages:** [`khawarizm-layout-edit`](../khawarizm-layout-edit/SKILL.md)

**References:**
- [Directory placement & anti-duplication](references/code-reuse-and-directory-rules.md)
- [Component & class catalog](references/component-catalog.md)
- [Page creation blueprint & case study](references/page-creation-blueprint.md)
- [Design tokens & CSS variables dictionary](references/design-tokens-and-classes.md)
- [Loading, caching & routing architecture](references/loading-caching-routing-guide.md)

---

## 6. Dashboard system & RTL engineering rules

### 6.1 RTL flex ordering for right-hand sidebars
- In a container with `dir="rtl"` and horizontal flex, **child #1 in the DOM renders on the far right**.
- Desktop sidebars on the right edge MUST be declared as **child #1** in JSX (`<DesktopDashboardSidebar />` first, `<MainBody />` second). Reversing pushes the sidebar left.
- Inside nav items use `inline-flex justify-start items-center gap-3` — icon first (right), label second (left). Avoid `justify-between`.

### 6.2 Self-contained workspace architecture
Students must never be bounced out of the dashboard for a student action. Every dashboard action resolves in an in-dashboard chamber:
- **Resume learning:** `CourseWorkspaceModal` (player simulation, curriculum drawer, progress).
- **Join live session:** `LiveClassroomModal` (Q&A chat, blackboard, audio/video controls).
- **Saved scholarship details & apply:** `ScholarshipApplicationModal` (qualification checklist, instant submission).
- **Competition challenge:** `CompetitionArenaModal` (live leaderboard, test-runner, code editor).
- **Certificates:** verified certificate preview modal.

### 6.3 Dedicated semantic icon library (`lucide-react`)
- **Never** use raw emojis (`📚`, `🎓`, `🏆`, `🔴`), random Unicode symbols, or ad-hoc SVGs for UI.
- Always import from `lucide-react` with consistent stroke widths (`1.8`–`2.2`): `Home`/`LayoutDashboard`, `BookOpen`, `GraduationCap`/`Award`, `LayoutGrid`/`Bookmark`, `Trophy`, `Bell`, `Search`, `Brain`/`Code2`/`Palette`, `Radio`, `Play`, `Pause`, `Download`, `CheckCircle2`, `X`.

### 6.4 Clean scroll & state management
- Never leave temporary debug tab switchers or browser-like scroll buttons.
- Mobile chip lists and cards use touch scrolling with `.no-scrollbar` (`scrollbar-width: none !important; -webkit-overflow-scrolling: touch;`).

### 6.5 Celestial observatory scrollbar standards
Configured in `globals.css`: width/height `7px`, track `#040F24`, thumb `#1B3F80` with a pill radius, hover `#29A9FF`, Firefox `scrollbar-width: thin; scrollbar-color: #1B3F80 #040F24;`. Never let unstyled OS scrollbars render across desktop viewports.

### 6.6 Dashboard tab architecture & prohibition of prototype tabs
- **Prohibited:** dashboard-wide ad-hoc view tabs (`overview / saved / achievements` with emoji state buttons).
- Primary dashboard navigation is governed by the **right sidebar** (desktop) and the **mobile pill strip** (`.dash-subnav`, `lg:hidden`) / URL queries.
- **Icon-only views:** the saved courses & opportunities view and the notifications view have **no sidebar nav item** — both open from the bookmark + bell pair in the chrome. Never re-add them as nav tabs; `getDashboardNavItem` resolving them to `null` is by design.
- The only valid in-dashboard tabs are section-level pill filters: **Saved Scholarships** `ToggleFilter` (`المنح المحفوظة` vs `الدورات المفضلة`) and **Competitions & Certificates** `ToggleFilter` (`أكمل المسابقة` vs `لم يحل المسابقة`), both using `.dash-toggle-active` / `.dash-toggle-idle`.

### 6.7 Dashboard canvas & elevation = the app design system
The dashboard is `immersive` (own sidebar + topbar) but must still look like the same product:
- **Never paint a page-level background.** `.dash-page` is transparent; every page sits on the navy-950 `.page-wrapper` with the global celestial washes glowing through. A solid `bg-navy-900` page is what made the dashboard feel like a different app.
- **Elevation direction:** cards are *lighter* than the canvas — translucent glass (`bg-navy-900/70–80 backdrop-blur-md border-navy-600/50`) for hero/rows/widgets/cards; darker inset wells (`bg-navy-950/50`) only *inside* a raised surface.
- **Chrome matches `.glass-navbar`:** `.dash-sidebar` / `.dash-topbar` are `bg-navy-950/90 backdrop-blur-md` with navy-600 borders; the topbar is sticky.
- **Panels over scrims stay solid** (`bg-navy-900`): modals, drawer, sort menus, search panels.
- **Active accents are translucent, never solid:** gold for the sidebar (`bg-gold-400/10 outline-gold-400/50 text-gold-400`), blue for subnav/filter pills (`bg-blue-400/15`), gold for toggles/sort (`bg-gold-400/15`).
- **Titles are white**, section titles carry the accent bar (`section-accent-title-blue|gold`), and hovers use real `border` utilities.
- **CTAs follow the app button idioms:** gold `btn-gold` for the one primary action, cyan gradient (`from-blue-400 to-blue-500 text-white`) for course-domain actions, `btn-outline-blue` for secondary blue CTAs.
- **Sticky chrome needs two things:** (1) no ancestor with `overflow-x-hidden` — the page shells use `overflow-x-clip`; (2) a parent taller than the sticky element. The sidebar is an isolated rail (`sticky top-0 h-screen overflow-y-auto`); the topbar is `sticky top-0` inside the tall `.dash-main`.
