# Khawarizm Academy — Directory Placement & Code Reuse Matrix

> **Golden Rule:** Never write raw, one-off markup or styling for elements that already exist. If a visual pattern appears across two or more screens, it belongs in `shared/`. If it is unique to one feature, it lives inside that feature's directory.

---

## 1. Directory & File Placement Matrix

Use this decision table whenever you create, move, or import any file:

| File Type | Exact Directory | Naming Convention | Placement Rule & Logic |
| :--- | :--- | :--- | :--- |
| **Shared UI Component** | `src/shared/components/<Category>/` | `PascalCase.tsx` (e.g. `DesktopNavbar.tsx`, `CourseCard.tsx`) | Used across **2+ features** (e.g. Home, Catalog, Dashboard). |
| **Feature UI Component** | `src/features/<feature>/components/<category>/` | `PascalCase.tsx` inside a purpose folder — `layout/`, `views/`, `chrome/`, `cards/`, `hero/`, `overlays/`, `controls/`, `states/`, `filters/`, `toolbar/` (e.g. `CatalogFilterSidebar.tsx` → `filters/CatalogFilterSidebar.tsx`) | Used **only within this single feature**. See [`khawarizm-organization-and-imports`](../../khawarizm-organization-and-imports/SKILL.md). |
| **Page View** | `src/features/<feature>/pages/` | `<Feature>Page.tsx` (e.g. `HomePage.tsx`, `CatalogPage.tsx`) | The top-level screen assembled with navbar, content, and footer. |
| **Domain Entity Types** | `src/shared/types/` | `entities.ts` or `<entity>.ts` | Represents shared data contracts (e.g. `Course`, `Scholarship`, `User`). |
| **Feature View Types** | `src/features/<feature>/` | `types.ts` | State and props specific to this feature (e.g. `CatalogFiltersState`). |
| **Shared Hook** | `src/shared/hooks/` | `use<CamelCase>.ts` (e.g. `useHorizontalScroll.ts`) | Reusable logic across multiple features (e.g. timers, scroll, media queries). |
| **Feature Hook** | `src/features/<feature>/hooks/` | `use<CamelCase>.ts` (e.g. `useCatalogFilters.ts`) | Logic and queries specific to this feature. |
| **Feature Styles** | `src/features/<feature>/` | `<feature>.css` (e.g. `auth.css`) | Concept classes used by **one feature only**. Imported by `src/styles/globals.css` — never from a `.tsx`. |
| **Shared Utility / Lib** | `src/shared/lib/` | `camelCase.ts` (e.g. `localization.ts`, `apiClient.ts`) | Global helpers, API wrappers, translation helpers. |
| **Static Data (ANY kind)** | `src/shared/json/` | `<camelCase>.json` (e.g. `routes.json`, `catalog.json`, `mockDashboard.json`) | Every list, label, record, and config map. A `.ts` next to it may only add types or hydrate icon names. |
| **Hydrated mock modules** | `src/shared/mocks/` | `<name>.ts` (e.g. `catalog.ts`, `dashboard.ts`, `homepage.ts`) + `index.ts` barrel | Mock assemblies: raw JSON casts + the types JSON cannot carry. Used by 3+ features (catalog, dashboard, home, courses, scholarships). |
| **Design Tokens & Shared Styles** | `src/styles/` | `tokens.css`, `globals.css` | Global CSS variables and concept classes shared by **2+ features**; imports every feature `*.css`. |
| **Master Brand Assets** | `src/assets/brand/source/` | `KhawarizmLogo.jpg` | Single source of truth for branding. Output generated to `src/assets/brand/generated/` and `public/`. |
| **App Routing & Shell** | `src/app/` | `router.tsx`, `App.tsx` | Root providers, route tree, and layout frames. |

---

## 2. Directory Placement Flowchart

```
Is this a new component or file?
 │
 ├── Is it a Page view? ───────────────► src/features/<feature>/pages/<Feature>Page.tsx
 │
 ├── Is it UI markup & styling?
 │    ├── Used in 2+ features? ────────► src/shared/components/<Category>/<Component>.tsx
 │    └── Specific to ONE feature? ────► src/features/<feature>/components/<Component>.tsx
 │
 ├── Is it TypeScript types?
 │    ├── Shared backend entity? ──────► src/shared/types/entities.ts
 │    └── Feature-only UI state? ──────► src/features/<feature>/types.ts
 │
 ├── Is it React logic / Hook?
 │    ├── Cross-cutting (scroll/timer)? ► src/shared/hooks/use<Hook>.ts
 │    └── Feature data/filter logic? ──► src/features/<feature>/hooks/use<FeatureHook>.ts
 │
 └── Is it data or utilities?
      ├── Static data (lists/labels/records)? ► src/shared/json/<name>.json
      └── Translation / API / icon helper? ──► src/shared/lib/<helper>.ts
```

---

## 3. Strict Anti-Duplication Rules

### Rule 1: Never write raw utility soup for standard buttons
❌ **BAD (Duplicated, fragile):**
```tsx
<button className="px-5 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold shadow-lg text-sm flex items-center justify-center gap-2">
  سجل الآن
</button>
```
✅ **GOOD (Clean, reusable, theme-consistent):**
```tsx
<button className="btn-gold">
  سجل الآن
</button>
```

### Rule 2: Never recreate cards from scratch
❌ **BAD (Redundant 60-line card structure):**
```tsx
<div className="bg-slate-900/50 border border-blue-900 rounded-xl p-4 flex flex-col ...">
  <img src={item.image} className="w-full h-32 rounded-lg" />
  <h3 className="text-white font-bold mt-2">{item.title}</h3>
  ...
</div>
```
✅ **GOOD (Reusable component with built-in responsive variants):**
```tsx
<CourseCard course={course} layout="desktop" />
{/* OR */}
<ScholarshipCard scholarship={scholarship} layout="desktop" />
```

### Rule 3: Never store Arabic strings in internal state
❌ **BAD (Hard to maintain, breaks API syncing):**
```tsx
const [activeTab, setActiveTab] = useState<'دورات' | 'منح'>('دورات');
if (activeTab === 'دورات') { ... }
```
✅ **GOOD (English state keys with localization presentation):**
```tsx
const [activeTab, setActiveTab] = useState<'courses' | 'scholarships'>('courses');
// Rendered as:
<button>{toArabic('catalog_tabs', activeTab)}</button>
```

### Rule 4: Never duplicate the App Shell
Every page view must reuse the global layout primitives:
```tsx
<div className="page-wrapper">
  {/* Sticky Top Navs */}
  <div className="hidden md:block"><DesktopNavbar activeTab="catalog" onSelectTab={...} /></div>
  <div className="block md:hidden"><MobileHeader /></div>

  {/* Standard Centered Content */}
  <main className="content-container">
    {/* Page content here */}
  </main>

  {/* Footer & Mobile Bottom Navigation */}
  <Footer />
  <MobileBottomBar activeTab="catalog" onSelectTab={...} />
</div>
```

---

## 4. Quick Reuse Cheat-Sheet

| What you need to build | DO NOT build it. Use this instead: |
| :--- | :--- |
| **Primary Action Button (Gold)** | `<button className="btn-gold">تقدم الآن</button>` |
| **Secondary Action Button (Cyan Outline)** | `<button className="btn-outline-blue">استكشف التفاصيل</button>` |
| **Filter Chip / Tag Pill** | `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>...</button>` |
| **Squircle Action Icon (36x36)** | `<button className="btn-icon-box"><BookmarkIcon /></button>` |
| **Circle Action Icon (40x40)** | `<button className="btn-icon-circle"><ShareIcon /></button>` |
| **Course Listing Card** | `<CourseCard course={item} layout="desktop" />` |
| **Scholarship Listing Card** | `<ScholarshipCard scholarship={item} layout="desktop" />` |
| **Search Input Bar** | `<SmartSearchBox variant="desktop" onSearch={...} />` |
| **Section Header Title** | `<div className="section-header-row"><h3 className="section-header-title">...</h3></div>` |
| **Blue Accent Header** | `<div className="section-accent-title-blue"><h3>الدورات المميزة</h3></div>` |
| **Gold Accent Header** | `<div className="section-accent-title-gold"><h3>المنح المتاحة</h3></div>` |
| **Badge (Gold / Cyan / Tag)** | `<span className="badge-gold">مميز</span>` / `<span className="badge-blue">تقني</span>` / `<span className="tag-box">مبتدئ</span>` |
| **Starfield Background** | `<CelestialCanvas className="absolute inset-0 pointer-events-none opacity-60" />` |
| **Loading Spinner** | `<AstrolabeLoader message="جاري التحميل..." />` |
| **Competition Banner** | `<CompetitionBanner competition={data} />` |
| **Upcoming Events Section** | `<EventSection featuredEvent={e1} workshopEvent={e2} />` |
| **Login mode pill (desktop + mobile)** | `<AuthModeSwitch mode={mode} onChange={setMode} />` — one pill, `lg:` breakpoints pick label/size |
| **Google / Facebook sign-in** | `<AuthSocialButton provider="google" label={…} />` — `PROVIDERS` record, no provider branch |
| **Catalog filter pills (sidebar + drawer)** | `<CatalogFilterGroups surface tab filters onChangeFilter />` — pill rows written once |
| **Catalog result card / grid / states** | `<CatalogCard item={…} />` inside `.catalog-grid`; empty & error states share `.catalog-state` + `glass-panel` |
| **Dashboard priority card (continue / live)** | `<PriorityContinueCard />` / `<LiveSessionPriorityCard />` — shared `.dash-hero*` family + `<RadialProgressRing />` |
| **Dashboard section toggle pills** | `ToggleFilter` with `.dash-toggle-active` / `.dash-toggle-idle` (one concept pair, both surfaces) |
| **Dashboard sort dropdown** | `isSortDropdownOpen && <div className="dash-sort-menu">…` — one `.dash-sort-option` pair (`-idle` / `-active`) |
| **Dashboard notifications list item** | `<NotificationListItem data={…} />` — `.dash-notif-unread` / `.dash-notif-read`, tone record `NOTIF_TYPES`, no branch |
| **In-dashboard chamber modals** | `.dash-modal-overlay` + `.dash-modal-shell` chrome shared by workspace / live / arena / scholarship / certificate |
| **The same class string twice** | Extract it into the owning CSS file — `features/<feature>/<feature>.css` or `globals.css` (`@layer components`) — skill §3.7 |
