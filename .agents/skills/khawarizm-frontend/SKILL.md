---
name: khawarizm-frontend
description: Master design, engineering, and architecture playbook for Khawarizm Academy frontend. Use whenever creating, styling, refactoring, or extending pages, features, UI components, animations, or state in Khawarizm Academy. Covers the observatory celestial design system, directory placement matrix, anti-duplication rules, component reuse, Tailwind v4 @apply semantic classes, extracting repeated class strings into concept classes, RTL localization, and page creation blueprints.
---

# Khawarizm Academy — Master Frontend Engineering & Design Skill

This skill is the **definitive operational guide and standard** for developing the Khawarizm Academy web platform. It ensures you know:
1. **How to use everything in the design** (Observatory celestial theme, tokens, and Tailwind v4 `@apply` concept classes).
2. **Where every file belongs** (Directory & placement rules).
3. **How to avoid repeating code** (Strict anti-duplication rules and component reuse).
4. **How to assemble any new page/feature in minutes** without writing redundant markup.

---

## 1. Deep Project Analysis & Mental Model

### 1.1 The Dual-Pillar Observatory Architecture
The Khawarizm Academy platform is built on two core educational pillars sharing an identical geometric design grammar:
- **Courses Pillar (الدورات التدريبية):** Identified by Cyber-Cyan accents (`#167BDB` / `#29A9FF`), code brackets, technology tracks, and practical skill verification.
- **Scholarships & Opportunities Pillar (المنح والفرص الدولية):** Identified by Brass Gold accents (`#C88A32` / `#E5B65C`), global academic opportunities, prestigious degree sponsorships, and deadline countdowns.
- **The Visual Theme:** "Observatory & Cyber-Intelligence" (المرصد الفلكي الذكي) — dark space canvas (`#040F24`, `#061A3A`, `#092557`), glowing brass astrolabes, starlight elevation, and clean typography.

### 1.2 Core Technology Stack
- **Framework:** React 19 + TypeScript (Strict mode) + Vite.
- **Styling Engine:** Tailwind CSS v4 (`@import "tailwindcss"`) augmented with `@import "./tokens.css"` and concept-oriented `@apply` classes in `src/styles/globals.css`, which also imports per-feature CSS files (e.g. `src/features/auth/auth.css`, `src/features/catalog/catalog.css`, `src/features/dashboard/dashboard.css`).
- **Localization Engine:** English domain keys internally + `toArabic(category, key)` / `toArabicNav(key)` in `src/shared/lib/localization.ts`.
- **Master Branding:** Official logo `src/assets/brand/source/KhawarizmLogo.jpg`. Run `npm run brand:generate` to regenerate all app icons and favicons.

---

## 2. Directory & File Placement Matrix

Always follow this exact mapping when creating or moving files:

| What are you adding? | Target Directory | File Pattern |
| :--- | :--- | :--- |
| **Shared Component (2+ features)** | `src/shared/components/<Category>/` | `<Component>.tsx` (e.g. `Navbar/DesktopNavbar.tsx`, `Cards/CourseCard.tsx`) |
| **Feature Component (1 feature only)**| `src/features/<feature>/components/` | `<Component>.tsx` (e.g. `CatalogFilterSidebar.tsx`) |
| **Page View** | `src/features/<feature>/pages/` | `<Feature>Page.tsx` (e.g. `CatalogPage.tsx`, `HomePage.tsx`) |
| **Shared Domain Entity Types** | `src/shared/types/` | `entities.ts` (e.g. `Course`, `Scholarship`, `Event`) |
| **Feature View Types** | `src/features/<feature>/` | `types.ts` (e.g. `CatalogTab`, `FilterDomain`) |
| **Shared Hook** | `src/shared/hooks/` | `use<Name>.ts` (e.g. `useHorizontalScroll.ts`) |
| **Feature Hook** | `src/features/<feature>/hooks/` | `use<FeatureHook>.ts` |
| **Feature Styles (one feature only)** | `src/features/<feature>/` | `<feature>.css` (e.g. `auth.css`, `catalog.css`, `dashboard.css`) — imported by `src/styles/globals.css` |
| **Static Data (any kind)** | `src/shared/json/` | `<name>.json` (e.g. `routes.json`, `catalog.json`, `mockDashboard.json`) |
| **Shared Utility / Helpers** | `src/shared/lib/` | `<name>.ts` (e.g. `localization.ts`, `navigation.ts`) |
| **Shared Styles & Tokens (2+ features)** | `src/styles/` | `tokens.css` (variables), `globals.css` (shared concept classes; imports every feature `*.css`) |
| **Routes & Root App** | `src/app/` | `router.tsx`, `routes.tsx`, `App.tsx` |

> 📖 **Routing & URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) — route table, redirects, tabs, query params.
> 📖 **Code style:** [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) — comments, no if-chains, JSON data, no duplication.

> 📖 **Full Directory Rules & Flowchart:** Read `references/code-reuse-and-directory-rules.md`.

---

## 3. Strict Anti-Duplication Rules & Component Reuse

### 3.1 Buttons
**Never write raw utility strings for buttons.** Reuse the standard semantic classes:
- **Primary Action (Gold):** `<button className="btn-gold">تقدم الآن</button>` (One per section/screen).
- **Secondary Action (Cyan Outline):** `<button className="btn-outline-blue">استكشف التفاصيل</button>`.
- **Filter Chips / Selector Pills:** `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>...</button>`.
- **Squircle Icon Action (36x36):** `<button className="btn-icon-box"><BookmarkIcon /></button>`.
- **Circular Icon Action (40x40):** `<button className="btn-icon-circle"><ShareIcon /></button>`.
- **Search Submit Button:** `<button className="btn-search-submit"><CompassIcon /></button>`.
- **Action Link:** `<a className="link-action-blue">عرض الكل ←</a>`.

### 3.2 Cards
- **Course Card:** `<CourseCard course={course} layout="desktop" | "mobile" />`
- **Scholarship Card:** `<ScholarshipCard scholarship={scholarship} layout="desktop" | "mobile" />`
- **Custom Cards:** If assembling a custom card (e.g., Problem Set or Quiz), wrap with `.card-interactive-blue` or `.card-interactive-gold`, nesting `.card-media-box`, `.card-title`, `.card-subtitle`, and `.card-meta-row`.

### 3.3 Search & Inputs
- **Smart Search Box:** `<SmartSearchBox variant="desktop" | "mobile" onSearch={(query, type) => ...} />`.
- **Form Containers:** `.search-form-desktop`, `.search-form-mobile`, `.search-pills-container`.

### 3.4 Banners & Countdown Timers
- **Competition Banner:** `<CompetitionBanner competition={data} />`.
- **Event Keynote & Workshop:** `<EventSection featuredEvent={e1} workshopEvent={e2} />`.
- **Timer Digits:** `.digit-box`, `.digit-box-active`, `.digit-text`, `.sliding-chamber-indicator`.

### 3.5 App Shell & Navigation
- Top navigation: `<DesktopNavbar />` (desktop) + `<MobileHeader />` (mobile).
- Bottom navigation: `<MobileBottomBar />`.
- Page wrapper: `.page-wrapper`.
- Main content: `.content-container`.
- Global footer: `<Footer />`.

### 3.6 Authentication (Login & Welcome-Back)
- **Page:** `<LoginPage />` (`features/auth/pages/LoginPage.tsx`, `hideShell: true`).
- **Mode pill (demo switcher):** `<AuthModeSwitch mode={mode} onChange={setMode} />` — one component for desktop and mobile; `lg:` breakpoints and short/long labels pick the size. Never render two copies.
- **Social providers:** `<AuthSocialButton provider="google" | "facebook" label={…} />` — one `PROVIDERS` record holds surface class + brand mark, so there is no provider if-chain.
- **Cards & hero:** `<DefaultLoginCard />`, `<WelcomeBackCard />`, `<AuthHeroPanel />`.
- **Styling:** every auth element sits on an `.auth-*` concept class (`.auth-shell`, `.auth-split-screen`, `.auth-chamber`, `.auth-card`, `.auth-field`, `.auth-hero`, `.auth-mode-switch`, `.auth-terms-scrim`, …), all declared in **`src/features/auth/auth.css`** and imported by `globals.css`. JSX only layers one-off utilities on top — never a 10-class string.

### 3.7 Repeated Class Strings → Concept Class
**The same run of utilities twice for the same kind of element is a missing concept class, not styling.** Extract it and use the short name in JSX.

**Where it goes — the same placement rule as components (2+ features → shared):**
- **Used by one feature only** → that feature's own CSS file: `src/features/<feature>/<feature>.css` (e.g. `features/auth/auth.css`). Feature-owned, edited next to the components that use it.
- **Used by 2+ features** → `src/styles/globals.css`.
- Every feature CSS is `@import`ed at the top of `globals.css` (`index.css → globals.css → features/*/*.css`), so there is still **one stylesheet entry point** — never import a feature CSS from a `.tsx`.

1. **Declare new concept classes inside `@layer components`.** Tailwind utilities live in `@layer utilities`, so a utility in JSX still wins over the class. An **unlayered** class (`.btn-gold`, `.link-action-blue`) beats every utility — leave a class unlayered only when JSX must never override it.
2. **Use the CSS variables, not literals:** `var(--shadow-elev-2)`, `var(--shadow-elev-1)`, `var(--shadow-glow-gold)`, `var(--shadow-glow-blue)`, `var(--color-overlay-scrim)`. Elevation, scrim, and glow then stay editable in one place (`tokens.css`).
3. **`@apply` accepts real Tailwind utilities only.** It fails on plain custom classes (`.flex-center`), marker classes (`group`), and plain global helpers (`animate-fade-in`, `animate-fade-in-up`, `animation-delay-100`) — write raw utilities inside the class, keep `group` in the JSX `className`, and either keep global animation helpers inline in JSX or mirror them with a raw `animation:` property inside the class (the `fadeIn` / `fadeInUp` keyframes stay global). `animate-spin`, `animate-pulse`, `animate-bounce` ARE real utilities and may be `@apply`-ed.
4. **No ad-hoc hex or arbitrary fonts:** use token utilities (`bg-navy-950`, `text-gold-400`, `border-navy-600`, `text-slate-400`, `bg-success-500`, `text-danger-500`) and `font-display` / `font-body` instead of `font-['IBM_Plex_Sans_Arabic']` / `font-['Tajawal',sans-serif]`.
5. **Check the class exists.** Dead classes render nothing: `.animate-fade-in` is now defined (it was used in 15+ files while missing), and `animate-spin-very-slow` never existed — use `.animate-orbit-slow`.

> 📖 **Full Catalog & Prop APIs:** Read `references/component-catalog.md`.

### 3.8 Catalog (Explorer & Filters)
- **Page:** `<CatalogPage />` (`features/catalog/pages/CatalogPage.tsx`, standard shell). `type` and `q` are URL-derived; the two `<SmartSearchBox />` slots share one `searchProps` object — only the wrapper differs (`hidden md:flex` / `md:hidden`).
- **Filter panels:** `<CatalogFilterSidebar />` (desktop) and `<CatalogMobileFilterDrawer />` (mobile sheet) both render `<CatalogFilterGroups surface tab … />` — pill rows are written once; `PILL_ACTIVE` / `PILL_IDLE` records pick the `.catalog-pill*` classes.
- **Data boundary:** `<CatalogDataSection />` — the only section that re-renders on filter/data changes; error and empty states share `glass-panel` + `.catalog-state`.
- **Card & chrome:** `<CatalogCard />` (shell from `card-interactive-blue|gold`, `pillarStyle()` + `DEADLINE_ACCENT` records instead of branches), `<CatalogToolbar />`, `<CatalogPagination />`, `<CatalogGridSkeleton />`.
- **Styling:** every catalog element sits on a `.catalog-*` concept class (`.catalog-hero`, `.catalog-toolbar`, `.catalog-card-media`, `.catalog-pill*`, `.catalog-drawer*`, `.catalog-page*`, …) declared in **`src/features/catalog/catalog.css`** and imported by `globals.css` — the same feature-CSS pattern as `auth.css`.

### 3.9 Dashboard (Learning Workspace)
- **Page:** `<DashboardPage />` (`features/dashboard/pages/DashboardPage.tsx`) — self-contained layout: right sidebar + top bar, RTL grid declared with the sidebar as **Child #1** (§6.1). `?view=` drives the active view through `getDashboardNavItem` (aliases resolve too); `?state=live|empty` are demo modes.
- **Shell & stats:** `<DesktopDashboardSidebar />` (Child #1) — its bottom row pairs the **saved bookmark + notification bell** icons (both `.dash-bell` tone family; saved opens `?view=saved`, which has no sidebar nav item), `<DashboardTopBar />` (search overlay), `<MobileDashboardTopBar />` (bookmark + bell pair on mobile), `<DashboardStatsHeader />`, `<DashboardStatsSidebar />` (widgets + stat rows), `<DashboardSubNavigation />` (mobile/tablet-only pill strip — `.dash-subnav` is `lg:hidden`; at `lg+` the sidebar owns navigation).
- **Priority cards:** `<PriorityContinueCard />` (cyan) and `<LiveSessionPriorityCard />` (red live countdown) share the `.dash-hero*` family and `<RadialProgressRing />` (its `RING_COLORS` live in `features/dashboard/data/radialRingColors.ts` — hex is required for the `$(color)80` glow alpha).
- **Views:** `<EnrolledCoursesView />` (filters + sort dropdown + empty state), `<CompetitionsCertificatesView />` (toggle pills + rows + cert cards), `<SavedScholarshipsView />` (rows, deadline tags, undo toast), `<NotificationsView />` + `<NotificationsDrawer />`, `<EmptyDashboardState />` — every view is data-driven from `src/shared/json/dashboardViews.json` / `dashboardChambers.json`.
- **In-dashboard chambers (§6.2):** `<CourseWorkspaceModal />`, `<LiveClassroomModal />`, `<CompetitionArenaModal />`, `<ScholarshipApplicationModal />`, `<CertificatePreviewModal />` — all share the `.dash-modal-*` chrome.
- **Styling:** every dashboard element sits on a `.dash-*` concept class (`.dash-hero*`, `.dash-side-row`, `.dash-nav-item`, `.dash-tab`, `.dash-stat*`, `.dash-row`, `.dash-modal*`, `.dash-toast`, `.dash-notif*`, `.dash-cert-*`, …) declared in **`src/features/dashboard/dashboard.css`** and imported by `globals.css` — the same feature-CSS pattern as `auth.css` / `catalog.css`. The canvas, elevation, and accent rules live in §6.7.

---

## 4. Universal Page Creation Blueprint (Zero-From-Scratch)

Whenever asked to create any new page:
1. **Analyze Design:** Identify what can be reused directly from the Component Catalog (usually 80%+ of the page!).
2. **Setup Types & Localization:** Keep internal state in English; register display labels in `localization.ts`.
3. **Assemble Subcomponents:** Build any unique feature sidebar or toolbar using existing concept classes — and if you catch yourself repeating the same utility run, extract it into a concept class (`khawarizm-frontend` §3.7).
4. **Compose Page Shell:** Use the standard 5-layer layout template (Atmosphere → Top Nav → Content Container → Bottom Nav → Footer).
5. **Verify:** Run `npm run build` and `npx eslint src` inside `frontend/` to confirm zero TypeScript, CSS, and lint errors.

> 📖 **Full Page Blueprint & Catalog Walkthrough:** Read `references/page-creation-blueprint.md`.

---

## 5. Skills & Reference Quick-Links

**Skills:**
- **Code style & quality:** [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) — one-line comments, no if-chains, static data in JSON, no desktop/mobile duplication.
- **Routing & URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) — routes.json, redirects, nav tabs, query params, URL debugging.
- **Loading, caching & transitions:** [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md) — dual-tier skeletons, SWR, scroll memory.
- **Page & feature creation:** [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md) — the full 10-step flow.
- **Motion & animations:** [`khawarizm-motion`](../khawarizm-motion/SKILL.md) — the Celestial Motion System: primitives, cascades, sliding-puck switches, shine/halo, countdowns.
- **Editing & fixing pages:** [`khawarizm-layout-edit`](../khawarizm-layout-edit/SKILL.md) — alignment/centering fixes, two-column grids, desktop-vs-mobile action rows, sticky offsets, CTA hierarchy.

**References:**
- **Directory Placement & Anti-Duplication:** [`references/code-reuse-and-directory-rules.md`](references/code-reuse-and-directory-rules.md)
- **Component & Class Catalog:** [`references/component-catalog.md`](references/component-catalog.md)
- **Page Creation Blueprint & Real Case Study:** [`references/page-creation-blueprint.md`](references/page-creation-blueprint.md)
- **Design Tokens & CSS Variables Dictionary:** [`references/design-tokens-and-classes.md`](references/design-tokens-and-classes.md)
- **Loading, Caching & Routing Architecture:** [`references/loading-caching-routing-guide.md`](references/loading-caching-routing-guide.md)

---

## 6. Dashboard System & RTL Engineering Rules

### 6.1 RTL Flex Ordering for Right-Hand Sidebars
- In any container with `dir="rtl"` and horizontal flex (`display: flex; flex-direction: row`), **Child #1 in the DOM is rendered on the FAR RIGHT**.
- **Crucial Layout Rule:** Desktop navigation sidebars located on the right edge MUST be declared as **Child #1** in the JSX structure (`<DesktopDashboardSidebar />` first, then `<MainBody />` second). Reversing this pushes the sidebar to the left.
- **Internal Item Alignment:** Inside sidebar navigation items, use `inline-flex justify-start items-center gap-3`. Child #1 is the icon (renders on right), Child #2 is the label (renders on left). Do not use `justify-between` which scatters the icon to the opposite edge.

### 6.2 Self-Contained Workspace Architecture
- Students must never be forced out of the dashboard or bounce to external pages to perform student actions.
- Any action originating from the dashboard must resolve in an in-dashboard interactive chamber:
  - **Resume Learning / Continue:** In-dashboard lesson workspace modal (`CourseWorkspaceModal.tsx`) with player simulation, curriculum drawer, and progress tracking.
  - **Join Live Session:** In-dashboard interactive classroom chamber (`LiveClassroomModal.tsx`) with real-time Q&A chat, teacher blackboard, and audio/video controls.
  - **Saved Scholarship Details & Apply:** In-dashboard application modal (`ScholarshipApplicationModal.tsx`) with qualification checklist and instant submission.
  - **Competition Challenge:** In-dashboard coding challenge arena (`CompetitionArenaModal.tsx`) with live leaderboard, test-runner, and code editor.
  - **Certificates:** In-dashboard verified certificate preview modal.

### 6.3 Dedicated Semantic Icon Library (`lucide-react`)
- **Strict Rule:** Never use raw emojis (`📚`, `🎓`, `🏆`, `🔴`), random Unicode symbols, or inconsistent ad-hoc SVGs for UI elements.
- Always import from `lucide-react` with semantic naming and consistent stroke widths (`1.8` - `2.2`):
  - Dashboard: `Home` / `LayoutDashboard`
  - Courses: `BookOpen`
  - Scholarships: `GraduationCap` / `Award`
  - Saved: `LayoutGrid` / `Bookmark`
  - Competitions: `Trophy`
  - Notifications: `Bell`
  - Search: `Search`
  - Technical Tracks: `Brain` (AI), `Code2` (Programming), `Palette` (Design)
  - Interactive Actions: `Radio`, `Play`, `Pause`, `Download`, `CheckCircle2`, `X`.

### 6.4 Clean Scroll & State Management
- Never leave temporary debug tab switchers or browser-like scroll buttons.
- For horizontal chip lists and cards on mobile, use touch scrolling with `.no-scrollbar` (`scrollbar-width: none !important; -webkit-overflow-scrolling: touch;`).

### 6.5 Celestial Observatory Scrollbar Standards
- The platform uses a curated dark celestial scrollbar system configured in `globals.css`:
  - Width/Height: `7px`
  - Track: `#040F24` (Deep navy void)
  - Thumb: `#1B3F80` (Navy border) with rounded pill radius (`rounded-full`)
  - Hover: `#29A9FF` (Electric blue celestial glow)
  - Firefox support: `scrollbar-width: thin; scrollbar-color: #1B3F80 #040F24;`
- Never let unstyled browser OS scrollbars render across desktop viewports.

### 6.6 Dashboard Tab Architecture & Prohibition of Prototype Tabs
- **Prohibited:** Never inject dashboard-wide ad-hoc view tabs (e.g. `DashboardTabFilter` with `overview / saved / achievements` and emoji state buttons).
- Primary dashboard navigation is strictly governed by the **Right Sidebar** (Desktop) and the **mobile pill strip** (`.dash-subnav`, mobile/tablet-only — `lg:hidden`) / URL queries.
- **Icon-only views:** the saved courses & opportunities view and the notifications view have **no sidebar nav item** — both open from icons beside each other in the chrome (bookmark + bell in the desktop sidebar bottom row and in every mobile top bar). Never re-add them as nav tabs; `getDashboardNavItem` resolving them to `null` is by design.
- The ONLY valid tabs inside the dashboard are section-level pill toggle filters:
  - **Saved Scholarships:** `ToggleFilter` (`المنح المحفوظة` vs `الدورات المفضلة`) using `.dash-toggle-active` (`bg-gold-400/15 text-gold-400 font-bold`) vs `.dash-toggle-idle`.
  - **Competitions & Certificates:** `ToggleFilter` (`أكمل المسابقة` vs `لم يحل المسابقة`) using the same `.dash-toggle-*` classes — one concept pair, two surfaces.

### 6.7 Dashboard Canvas & Elevation = The App Design System
The dashboard is an `immersive` page (own sidebar + topbar) but it must still look like the same product:
- **Never paint a page-level background.** `.dash-page` is transparent; every page sits on the navy-950 `.page-wrapper` with the global celestial washes glowing through. A solid `bg-navy-900` page is what made the dashboard feel like a different app — do not reintroduce it.
- **Elevation direction:** cards are *lighter* than the canvas — translucent glass (`bg-navy-900/70–80 backdrop-blur-md border-navy-600/50`) for hero, rows, widgets, chips and cards; darker inset wells (`bg-navy-950/50`) only *inside* a raised surface. Dark cards on the void read as holes.
- **Chrome matches `.glass-navbar`:** `.dash-sidebar` / `.dash-topbar` are `bg-navy-950/90 backdrop-blur-md` with navy-600 borders; the topbar is sticky.
- **Panels over scrims stay solid** (`bg-navy-900`): modals, drawer, sort menus, search panels — readability beats ambience there (same as `.auth-terms-panel`).
- **Active accents are translucent, never solid fills:** gold for the sidebar (`bg-gold-400/10 outline-gold-400/50 text-gold-400`), blue for subnav/filter pills (`bg-blue-400/15`), gold for toggles/sort (`bg-gold-400/15`).
- **Titles are white** (`text-white`), section titles carry the app's accent bar (`section-accent-title-blue|gold`), and hovers must use real `border` utilities (an `outline`-based card has a dead `hover:border-*`).
- **CTAs follow the app button idioms:** gold `btn-gold` for the one primary action, cyan gradient (`from-blue-400 to-blue-500 text-white`) for course-domain actions, `btn-outline-blue` styling for secondary blue CTAs.
- **Sticky chrome needs two things:** (1) no ancestor with `overflow-x-hidden` — that creates a scroll container and swallows sticky; page shells use `overflow-x-clip`; (2) a parent taller than the sticky element to travel in. The sidebar is an isolated rail: `sticky top-0 h-screen overflow-y-auto` — pinned on every view, scrolling internally if long. The topbar is `sticky top-0` inside the tall `.dash-main`.

