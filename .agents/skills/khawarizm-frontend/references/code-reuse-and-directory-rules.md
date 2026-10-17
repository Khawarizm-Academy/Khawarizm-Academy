# Khawarizm Academy — Directory Placement & Code Reuse Matrix

> **Golden rule:** never write raw, one-off markup or styling for something that already exists. If a visual pattern shows up on **two or more** screens it belongs in `shared/`; if it is unique to one feature it lives inside that feature's directory.

---

## 1. Directory & file placement matrix

Use this decision table whenever you create, move, or import any file.

| File type | Exact directory | Naming | Placement logic |
| :--- | :--- | :--- | :--- |
| **Shared UI component** | `src/shared/components/<Category>/` | `PascalCase.tsx` (`Cards/CourseCard.tsx`, `Navbar/DesktopNavbar.tsx`) | Used across **2+ features**. |
| **Feature UI component** | `src/features/<feature>/components/<category>/` | `PascalCase.tsx` inside a purpose folder — `layout/`, `views/`, `chrome/`, `cards/`, `hero/`, `overlays/`, `controls/`, `states/`, `filters/`, `toolbar/` | Used **only** inside that feature. Taxonomy: [`khawarizm-organization-and-imports`](../../khawarizm-organization-and-imports/SKILL.md). |
| **Component with Desktop + Mobile views** | `src/features/<feature>/components/views/<Component>/` | `Desktop<Component>View.tsx` + `Mobile<Component>View.tsx` | One component-name folder per surface pair. See [`khawarizm-desktop-mobile-views`](../../khawarizm-desktop-mobile-views/SKILL.md). |
| **Page state shared per surface** | `src/features/<feature>/context/` | `<Area>Context.ts` + `<Area>Provider.tsx` | Hook in the `.ts`, provider component in the `.tsx` (fast-refresh rule). |
| **Page view** | `src/features/<feature>/pages/` | `<Feature>Page.tsx` | The top-level screen. Renders content only — never the shell. |
| **Domain entity types** | `src/shared/types/` | `entities.ts` | Shared data contracts (`Course`, `Scholarship`, `Event`). |
| **Feature view types** | `src/features/<feature>/` | `types.ts` | Feature-only state and prop types (`CatalogFiltersState`). |
| **Shared hook** | `src/shared/hooks/` | `use<CamelCase>.ts` | Cross-cutting logic (`useCachedData`, `useCountdown`, `useHorizontalScroll`). |
| **Feature hook** | `src/features/<feature>/hooks/` | `use<CamelCase>.ts` | Query / filter / timer logic for one feature. |
| **Feature data (non-JSON)** | `src/features/<feature>/data/` | `camelCase.ts` | Modules a JSON file cannot carry (e.g. `dashboardFetchers.ts`, `radialRingColors.ts`). |
| **Feature styles** | `src/features/<feature>/` | `<feature>.css` | Concept classes used by **one** feature (`auth.css`, `catalog.css`, `dashboard.css`, `courses.css`, `home.css`, `profile.css`). Imported by `globals.css` — never from a `.tsx`. |
| **Static data (any kind)** | `src/shared/json/` | `<camelCase>.json` | Every list, label, record and config map. A `.ts` beside it may only add types or hydrate names. |
| **Shared utility / lib** | `src/shared/lib/` | `camelCase.ts` | `localization.ts`, `navigation.ts`, `cacheManager.ts`, `apiClient.ts`, `authStorage.ts`. |
| **Design tokens & shared styles** | `src/styles/` | `tokens.css`, `globals.css` | Variables + concept classes shared by **2+ features**; `globals.css` imports every feature `*.css`. |
| **Master brand assets** | `src/assets/brand/source/` | `KhawarizmLogo.jpg` | Single source of truth. Output generated to `generated/` and `public/` via `npm run brand:generate`. |
| **App routing & shell** | `src/app/` | `router.tsx`, `routes.tsx`, `App.tsx`, `pageLoads.ts`, `layouts/RootLayout.tsx` | Root frame, route table and per-page lazy chunks. |

---

## 2. Placement flowchart

```
Is this a new component or file?
 │
 ├── Is it a Page view? ───────────────► src/features/<feature>/pages/<Feature>Page.tsx
 │
 ├── Is it UI markup & styling?
 │    ├── Used in 2+ features? ────────► src/shared/components/<Category>/<Component>.tsx
 │    └── Specific to ONE feature? ────► src/features/<feature>/components/<category>/<Component>.tsx
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

## 3. Strict anti-duplication rules

### Rule 1 — Never write raw utility soup for a standard button
❌ **Bad (duplicated, drifts):**
```tsx
<button className="px-5 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold shadow-lg text-sm flex items-center justify-center gap-2">
  سجل الآن
</button>
```
✅ **Good (one concept class):**
```tsx
<button className="btn-gold">سجل الآن</button>
```

### Rule 2 — Never recreate a card from scratch
❌ **Bad (a 60-line card nobody maintains):**
```tsx
<div className="bg-slate-900/50 border border-blue-900 rounded-xl p-4 flex flex-col ...">
  <img src={item.image} className="w-full h-32 rounded-lg" />
  <h3 className="text-white font-bold mt-2">{item.title}</h3>
  ...
</div>
```
✅ **Good (reusable, responsive built in):**
```tsx
<CourseCard course={course} layout="desktop" />
<ScholarshipCard scholarship={scholarship} layout="desktop" />
```

### Rule 3 — Never store Arabic strings in internal state
❌ **Bad (unmaintainable, breaks API syncing):**
```tsx
const [activeTab, setActiveTab] = useState<'دورات' | 'منح'>('دورات');
if (activeTab === 'دورات') { ... }
```
✅ **Good (English keys, Arabic at display time only):**
```tsx
const [activeTab, setActiveTab] = useState<'courses' | 'scholarships'>('courses');
<button>{toArabic('catalog_tabs', activeTab)}</button>
```

### Rule 4 — Never duplicate the app shell in a page view
`RootLayout.tsx` owns the frame (navbars, footer, bottom bar, atmosphere, the Tier-1 skeleton and the error boundary). A page renders **content only** and starts with `<main className="content-container">`:

```tsx
export const CatalogPage: React.FC = () => (
  <main className="content-container">
    {/* page content — no <DesktopNavbar>, <MobileHeader>, <MobileBottomBar> or <Footer> */}
  </main>
);
```

Rendering a navbar or footer inside a page produces two headers and breaks the single-chunk shell. Shell flags (`immersive`, `hideShell`) are declared in `routes.json`, never checked inside a page.

### Rule 5 — A class string you repeat is a missing concept class
Extract it into the owning CSS file inside `@layer components` (JSX utilities can still override it): `src/features/<feature>/<feature>.css` for one-feature classes, `src/styles/globals.css` for shared ones. Use `var(--shadow-elev-2)`, `var(--color-overlay-scrim)`, `var(--shadow-glow-gold)` instead of literals. Full rule: `khawarizm-frontend` §3.7.

---

## 4. Quick reuse cheat-sheet

| What you need | Don't build it — use this |
| :--- | :--- |
| **Primary action (gold)** | `<button className="btn-gold">تقدم الآن</button>` |
| **Secondary action (cyan outline)** | `<button className="btn-outline-blue">استكشف التفاصيل</button>` |
| **Filter chip / tag pill** | `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>…</button>` |
| **Squircle icon action (36×36)** | `<button className="btn-icon-box"><BookmarkIcon /></button>` |
| **Circular icon action (40×40)** | `<button className="btn-icon-circle"><ShareIcon /></button>` |
| **Course card** | `<CourseCard course={item} layout="desktop" />` |
| **Scholarship card** | `<ScholarshipCard scholarship={item} layout="desktop" />` |
| **Search bar** | `<SmartSearchBox variant="desktop" onSearch={…} />` |
| **Section header title** | `<div className="section-header-row"><h3 className="section-header-title">…</h3></div>` |
| **Blue / gold accent header** | `.section-accent-title-blue` / `.section-accent-title-gold` |
| **Badge (gold / cyan / tag)** | `.badge-gold` / `.badge-blue` / `.badge-gold-subtle` / `.tag-box` |
| **Empty & error state** | `<StatePanel title text icon tone="neutral" \| "danger" action? />` |
| **Under-construction page body** | `<FeaturePlaceholder title description … />` |
| **Detail page layout (course/scholarship)** | `<ItemDetailView … />` from `shared/components/Detail` |
| **Starfield background** | `<CelestialCanvas className="absolute inset-0 pointer-events-none opacity-60" />` |
| **Loader** | `<AstrolabeLoader message="جاري التحميل..." />` |
| **Countdown digits** | `<CountdownDigits … />` from `shared/components/Banners` |
| **Simple dropdown** | `<Dropdown … />` from `shared/components/Form` |
| **Side-by-side toggle switch** | `<SlidingSegmentedControl options value onChange tone="blue" \| "gold" />` |
| **Competition banner** | `<CompetitionBanner competition={data} />` |
| **Upcoming events section** | `<EventSection featuredEvent={e1} workshopEvent={e2} />` |
| **Login form (sign-in + register)** | `<LoginCard variant="desktop" \| "mobile" />` — reads `useLoginPage()` (screen + changeScreen); one component for both surfaces |
| **Google / Facebook sign-in** | `<AuthSocialButton provider="google" label={…} />` — `PROVIDERS` record, no branch |
| **Catalog filter pills (sidebar + drawer)** | `<CatalogFilterGroups surface tab filters onChangeFilter />` — pill rows written once |
| **Catalog result card / grid / states** | `<CatalogCard item={…} />` inside `.catalog-grid`; empty & error states share `StatePanel` + `.catalog-state` |
| **Dashboard priority card (continue / live)** | `<PriorityContinueCard />` / `<LiveSessionPriorityCard />` — shared `.dash-hero*` + `<RadialProgressRing />` |
| **Dashboard section toggle pills** | `ToggleFilter` + `.dash-toggle-active` / `.dash-toggle-idle` (one concept pair, both surfaces) |
| **In-dashboard chamber modals** | `.dash-modal-overlay` + `.dash-modal-shell` chrome shared by workspace / live / arena / scholarship / certificate |
| **The same class string twice** | Extract it into the owning CSS file (`@layer components`) — `khawarizm-frontend` §3.7 |

---

## 5. Project docs

Human-facing documentation mirrors these rules: [`docs/02-architecture.md`](../../../../docs/02-architecture.md) (three layers, placement, imports) and [`docs/01-design-system.md`](../../../../docs/01-design-system.md) (tokens, concept classes). The skills stay the canonical source for agents.
