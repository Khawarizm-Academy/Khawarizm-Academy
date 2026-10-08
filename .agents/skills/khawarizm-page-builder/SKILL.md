---
name: khawarizm-page-builder
description: Comprehensive end-to-end engineering and design guide for creating and adding any new page or feature from start to finish in Khawarizm Academy. Covers design ingestion from Figma/code, directory placement, anti-duplication, RTL layout, state management, dual-tier skeletons, routing, shell control, and verification.
---

# Khawarizm Academy — Master Page & Feature Creation Blueprint

This skill is the **authoritative, self-contained operational workflow** for adding any new page or feature to Khawarizm Academy from start to finish. Follow this exact 10-step protocol whenever creating, refactoring, or extending pages.

---

## 1. Quick Decision Matrix: What Kind of Page Are You Building?

| Page Category | Shell Mode | Layout Container | Skeleton Variant | Example Pages |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Platform Hub** | Standard Shell (`hideShell: false`) | `<main className="content-container">` | `'home'` or `'default'` | `HomePage`, `EventsPage`, `CompetitionsPage`, `DashboardPage`, `ProfilePage` |
| **Data-Rich Catalog / Explorer** | Standard Shell (`hideShell: false`) | `<main className="content-container">` | `'catalog'` | `CatalogPage` |
| **Detail / Landing View** | Standard Shell (`hideShell: false`) | `<main className="content-container">` | `'detail'` | `CourseDetailPage`, `ScholarshipDetailPage` |
| **Immersive / Full-Screen Studio** | Full-Screen (`hideShell: true`) | `min-h-screen w-full` (custom shell) | `'default'` | `LoginPage`, `CoursePlayerPage`, `ExamExecutionPage` |

---

## 2. The 10-Step Universal Page Creation Protocol

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      KHAWARIZM PAGE CREATION PROTOCOL                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Ingest Design (Figma Code + Reference PNGs + docs/SCREEN_MAP.md)              │
│ 2. Audit Reuse (src/shared/components/ & concept classes in globals.css /        │
│    the feature's own <feature>.css)                                              │
│ 3. Setup File Structure (src/features/<feature>/pages, components, types.ts)     │
│ 4. Define Types & RTL Localization (English internal keys + Arabic dictionary)   │
│ 5. Choose Shell Mode (Standard Shell vs hideShell: true in RouteMeta)            │
│ 6. Wire State & URL Single Source of Truth (Derive from useSearchParams/Params)  │
│ 7. Assemble Page & Data Sections (Modular components + useCachedData SWR)        │
│ 8. Register Route & Lazy Chunk (pageLoads.ts + routes.json + PAGE_BY_PATH)       │
│ 9. Polish Polish Polish (RTL alignment, hover glows, micro-press scales, mobile) │
│ 10. Run Verification Gates (npm run build -> tsc -b + npm run lint)              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Design & Requirements Ingestion
1. **Locate source assets:**
   - Visual mockups: `Khawarizm Academy Platfrom Design/<XX-feature>/` (high-res PNGs).
   - Figma-to-code HTML: `Design Code/<XX-feature>/` (note: treat as rough structure, not final code).
   - UX documentation: `docs/SCREEN_INVENTORY.md` and `docs/<XX-feature>-ux.md`.
2. **Identify color pillar:**
   - **Courses Pillar:** Cyber-cyan (`#167BDB` / `#29A9FF`), code syntax, tech badges.
   - **Scholarships Pillar:** Brass gold (`#C88A32` / `#E5B65C`), funding badges, countdown timers.
   - **Cosmic Observatory Canvas:** Deep navy space (`#040F24`, `#061A3A`, `#092557`), astrolabe motifs.
3. **Identify viewport requirements:**
   - **Desktop (>= 1024px / 1280px):** Multi-column, split-screens, full grid rails.
   - **Mobile (< 1024px):** Single column, touch targets >= 44px, bottom nav clearance, horizontal scroll rows.

---

### Step 2: Anti-Duplication & Component Reuse Audit
**Rule: Never write raw utility strings or reinvent existing UI elements.**

| If you need... | DO NOT create it. Use this instead: |
| :--- | :--- |
| **Primary CTA (Gold)** | `<button className="btn-gold">تقدم الآن</button>` |
| **Secondary CTA (Cyan Outline)** | `<button className="btn-outline-blue">استكشف التفاصيل</button>` |
| **Filter Chip / Pill** | `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>...</button>` |
| **Squircle Action Icon (36x36)**| `<button className="btn-icon-box" title="حفظ"><BookmarkIcon /></button>` |
| **Circular Action Icon (40x40)**| `<button className="btn-icon-circle" title="الملف"><UserIcon /></button>` |
| **Course Listing Card** | `<CourseCard course={course} layout="desktop" \| "mobile" />` |
| **Scholarship Card** | `<ScholarshipCard scholarship={scholarship} layout="desktop" \| "mobile" />` |
| **Search Input** | `<SmartSearchBox variant="desktop" \| "mobile" onSearch={...} />` |
| **Academy Brand Seal** | `<BrandLogo size={42} showText={true} onClick={...} />` |
| **Astrolabe Spinner Loader** | `<AstrolabeLoader message="جاري تجهيز البيانات..." />` |
| **Starfield Particles** | `<CelestialCanvas className="absolute inset-0 pointer-events-none opacity-60" />` |
| **Horizontal Swipe Row** | `<div className="horizontal-scroll-row">...</div>` |
| **A class string you have typed twice** | Extract it into the owning CSS file (`@layer components`) — see below. |

**Class-extraction rule:** when the same utility run repeats for the same kind of element, it is a missing concept class, not styling. Put it in the owning CSS file — **`src/features/<feature>/<feature>.css`** when only that feature uses it, **`src/styles/globals.css`** when 2+ features do (globals imports every feature CSS, so there is one entry point) — **inside `@layer components`** so JSX utilities can still override it. Use `var(--shadow-elev-2)` / `var(--color-overlay-scrim)` / `var(--shadow-glow-gold)` instead of literals, and keep `group` in the JSX (`@apply` cannot target it). Full rule: `khawarizm-frontend` §3.7.

---

### Step 3: Directory & File Placement
Create all files strictly according to this matrix:

```
frontend/src/features/<feature>/
├── components/               # UI components unique to this feature ONLY
│   ├── FeatureSidebar.tsx
│   └── FeatureCard.tsx
├── pages/                    # The top-level Page View
│   └── <Feature>Page.tsx
├── types.ts                  # Feature view state & prop types
├── hooks/                    # (Optional) Feature query or filter hook
│   └── use<Feature>.ts
├── <feature>.css             # (Optional) Concept classes used only by this feature,
│                             #   imported by src/styles/globals.css (never by a .tsx)
└── data/                     # (Optional) Feature mock data
    └── mock<Feature>Data.ts
```

*Note: If a component is used across 2 or more features, move it to `src/shared/components/<Category>/`.*

---

### Step 4: Types & RTL Localization Architecture
1. **Enforce TypeScript strict mode & verbatim imports:**
   ```ts
   import type { MyFeatureState, MyFilterType } from '../types';
   ```
2. **Never store Arabic strings in internal state:**
   ```ts
   // BAD:
   const [tab, setTab] = useState<'دورات' | 'منح'>('دورات');

   // GOOD:
   const [tab, setTab] = useState<'courses' | 'scholarships'>('courses');
   // Rendered via localization dictionary:
   <span>{toArabic('catalog_tabs', tab)}</span>
   ```
3. **Strict RTL Layout Guidelines:**
   - The document flows Right-to-Left (`dir="rtl"`).
   - **Start edge = Right**. **End edge = Left**.
   - For form inputs with leading icons:
     ```tsx
     <div className="flex items-center gap-3 ...">
       {/* 1. Icon sits on the RIGHT (start in RTL) */}
       <div className="text-[#8299B5] shrink-0 pointer-events-none"><MailIcon /></div>
       {/* 2. Input text aligns to the RIGHT */}
       <input dir="auto" className="flex-1 text-right bg-transparent outline-none ..." />
     </div>
     ```
   - For breadcrumbs and action links, directional arrows point backward to reading flow (`←` for next/proceed, `→` for return/back).

---

### Step 5: Shell Layout Determination (`routes.json`)
Declare the shell mode in the route entry. `RootLayout` reads it — never check it inside a page.

```json
// src/shared/json/routes.json
{ "path": "/my-page",    "title": "…", "skeletonVariant": "default" }
{ "path": "/dashboard",  "title": "…", "immersive": true, "skeletonVariant": "dashboard" }
{ "path": "/login",      "title": "…", "hideShell": true, "skeletonVariant": "default" }
```

| Flags | navbar | footer | bottom bar | Use for |
| :--- | :--- | :--- | :--- | :--- |
| neither | ✅ | ✅ | ✅ | Normal pages |
| `immersive: true` | ❌ | ❌ | ✅ | Pages that own their own nav (dashboard) |
| `hideShell: true` | ❌ | ❌ | ❌ | Login, full-screen player, exam |

- **Standard (no flags):** `RootLayout` keeps the whole shell mounted. Page renders centered content only:
  ```tsx
  export const MyPage: React.FC = () => (
    <main className="content-container">
      {/* Page Content */}
    </main>
  );
  ```
- **`hideShell: true`:** page takes the full window:
  ```tsx
  export const MyImmersivePage: React.FC = () => (
    <div className="min-h-screen w-full bg-[#040F24] flex items-center justify-center">
      {/* Full-screen content + Exit/Home Link */}
    </div>
  );
  ```

> 📖 **Route fields, redirects, and `tabsByQuery`:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md)

---

### Step 6: URL As Single Source of Truth
**Rule: Never duplicate URL query parameters (`?type=`, `?page=`, `?q=`) into `useState` + `useEffect`.**
Derive them dynamically during render:

```tsx
import { useSearchParams, useNavigate } from '../../../app/routerContext';

export const MyFeaturePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Derive from URL
  const activeTab = searchParams.get('tab') || 'all';
  const searchQuery = searchParams.get('q') || '';

  // 2. Only local interactive UI state lives in useState
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 3. Updates push to URL cleanly (preserving scroll position)
  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };
  ...
};
```

---

### Step 7: Dual-Tier Skeletons & SWR Caching
Khawarizm uses a strict dual-tier skeleton strategy:

1. **Tier 1 (Cold Chunk / Page Suspense):** Handled automatically by `RootLayout` via `skeletonVariant` in `routes.tsx` (`'home' | 'catalog' | 'detail' | 'default'`). **Never** render `<PageSkeleton />` manually inside a page view.
2. **Tier 2 (Dynamic Data Section Loading):** Use `useCachedData` in isolated subcomponents with `keepPreviousData: true`:

```tsx
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { CatalogGridSkeleton } from '../../../shared/components/Loading/CatalogGridSkeleton';
import { CourseCard } from '../../../shared/components/Cards/CourseCard';

export const MyDataGrid: React.FC<{ category: string }> = ({ category }) => {
  const { data, isLoading, isError, refetch } = useCachedData(
    ['my-feature-items', category], // Deterministic cache key
    async () => fetchItemsByCategory(category),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      keepPreviousData: true, // Prevents skeleton flash on category change
    }
  );

  if (isLoading) return <CatalogGridSkeleton count={6} />;
  if (isError) return <ErrorRetryBlock onRetry={refetch} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map(item => (
        <CourseCard key={item.id} course={item} layout="desktop" />
      ))}
    </div>
  );
};
```

---

### Step 8: Route Chunk & Registry Wiring
Every new page requires wiring in exactly 3 places:

#### 1. Add the Lazy Chunk in `src/app/pageLoads.ts`:
```ts
export const MyNewPage = lazy(() =>
  import('../features/my-feature/pages/MyNewPage').then((m) => ({ default: m.MyNewPage }))
);
```

#### 2. Add the route entry in `src/shared/json/routes.json`:
```json
{
  "path": "/my-feature",
  "title": "عنوان الصفحة — أكاديمية خوارزم",
  "description": "وصف الصفحة لمحركات البحث والتنقل الأكاديمي.",
  "activeTab": "home",
  "skeletonVariant": "default"
}
```

#### 3. Map the path to the component in `src/app/routes.tsx`:
```ts
const PAGE_BY_PATH: Record<string, ComponentType> = {
  // ...
  '/my-feature': MyNewPage,
};
```

That is all. `skeletonVariant` drives the Tier 1 skeleton, `title` drives `document.title`, and `RootLayout` picks the shell — no JSX registration.

#### If it is a top-level nav tab:
Add the target and the tab row to `src/shared/json/shellNav.json`, register the `NavTabKey` in `localization.ts`, and add the Arabic label to `localization.json`. The navbar, the mobile bottom bar, and the dashboard top bar all read that one list — **do not** edit those components.

> 📖 **Full routing walkthrough:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md)

---

### Step 9: Responsive Layout & Aesthetic Polish
Follow the **Observatory Design Grammar**:
1. **Glassmorphism:** Use `.glass-panel` (`bg-[#061A3A]/40 backdrop-blur-md border border-[#1B3F80]/40`).
2. **Cards:** Wrap custom cards with `.card-interactive-blue` or `.card-interactive-gold`.
3. **Elevation & Glows:** use the variables, not literals — `box-shadow: var(--shadow-elev-2)` for cards/panels and `var(--shadow-glow-gold)` / `var(--shadow-glow-blue)` for active glows (these live in `:root`, so there is no `shadow-elev-2` utility). A raw `shadow-[0_8px_24px_rgba(0,0,0,0.35)]` is a token waiting to happen.
4. **Interactive press states:** Buttons must have `active:scale-[0.98]` and smooth transitions (`transition-all duration-200`).
5. **Mobile safe area:** Always ensure mobile views have adequate bottom clearance (`pb-28` or `pb-[max(env(safe-area-inset-bottom),16px)]`).

---

### Step 10: Strict Verification & Quality Gates
Before declaring any page or feature complete, run the verification commands in `frontend/`:

```bash
# 1. Type check & production build (Strict TypeScript)
npm run build

# 2. Linting audit (ESLint rules)
npm run lint
```

**Quality Checklist:**
- [ ] `npm run build` exits with code 0 (zero TypeScript errors).
- [ ] `npm run lint` exits with code 0 (zero warnings, no unused variables).
- [ ] No class string repeated across components — repetitions live as concept classes in the owning CSS file.
- [ ] Desktop viewport (1280px) renders without layout overflow.
- [ ] Mobile viewport (390px) renders with readable fonts and >= 44px tap targets.
- [ ] All inputs have proper RTL layout (icon on right, text aligned right).
- [ ] Navigating back/forward restores scroll position properly.

---

## 3. Standard Page Template (Copy-Paste Starter)

Use this starter blueprint when assembling any standard content page:

```tsx
import React from 'react';
import { useSearchParams } from '../../../app/routerContext';

export const MyFeaturePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <main className="content-container animate-page-enter">
      {/* 1. Header Row */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B3F80]/50 pb-6">
        <div>
          <span className="badge-gold mb-2 inline-block">مسار معتمد</span>
          <h1 className="text-3xl font-bold text-white font-display">
            عنوان الميزة أو الصفحة
          </h1>
          <p className="text-sm text-slate-400 font-body mt-1">
            وصف تفصيلي يشرح هدف الصفحة والخيارات المتاحة للطلاب.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-gold py-2 px-5 text-sm">
            إجراء رئيسي
          </button>
        </div>
      </section>

      {/* 2. Main Content Body */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Dynamic Content or Data Section */}
        </div>

        <aside className="flex flex-col gap-6">
          {/* Sidebar / Quick Stats */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gold-400 font-display">
              معلومات إضافية
            </h3>
            <p className="text-sm text-slate-400 font-body">
              تفاصيل جانبية مكملة للمحتوى الرئيسي.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
};
```

---

## 4. Common Pitfalls & How to Prevent Them

| Pitfall | Problem | Solution |
| :--- | :--- | :--- |
| **Raw utility button soup** | Inconsistent button padding, font, and active states | Always use `.btn-gold`, `.btn-outline-blue`, or `.btn-pill-subtle`. |
| **Retyped utility runs** | The same 8-class string pasted in two files, drifting apart | Extract it into a `.concept-class` in the owning CSS file (`@layer components`) and use the short name. |
| **Feature classes dumped in `globals.css`** | The shared stylesheet bloats; every feature edit touches the same file | Feature-scoped classes go in `src/features/<feature>/<feature>.css` (e.g. `auth.css`, `catalog.css`, `dashboard.css`); `globals.css` imports it and keeps only classes shared by 2+ features. |
| **New concept class in the wrong layer** | Class declared unlayered beats every utility, so JSX overrides silently do nothing | Declare new classes in `@layer components`; only legacy classes (`.btn-gold`) are unlayered on purpose. |
| **`@apply` on a custom class** | Build fails — `@apply` accepts only real Tailwind utilities | Write raw utilities inside the class; keep `group` markers and plain global helpers (`animate-fade-in-*`, `animation-delay-*`) in the JSX `className`. |
| **Losing icon position in RTL** | Putting `<input>` first and `<icon>` second places the icon on the far left | In RTL flex, the first child is on the RIGHT. Put the icon first, `<input>` second. |
| **`dir="ltr"` on Arabic email input** | Causes placeholder and cursor to jump to the left edge | Use `text-right` and `dir="auto"` on the input. |
| **Duplicating shell in page view** | Rendering `<DesktopNavbar>` inside a page causes duplicate headers | Never render headers/footers in page views; let `RootLayout` manage the frame. |
| **Fake `setTimeout` loading timers** | Clutters components with unneeded state and causes layout shifts | Let Suspense handle Tier 1 cold load, and `useCachedData` handle Tier 2 data queries. |
| **Missing `verbatimModuleSyntax`** | TypeScript build fails with error `TS1484` | Always use `import type { ... }` when importing types and interfaces. |
| **Inverted RTL Right Sidebar** | Placing MainBody before DesktopSidebar in `dir="rtl"` flex renders sidebar on the left | In `dir="rtl" flex-row`, child #1 is on the far right. Put `<DesktopDashboardSidebar />` first, `<MainBody />` second. |
| **Non-Self-Contained Workspace** | Bouncing users out of dashboard to Home or external pages for basic actions | Implement in-dashboard modal chambers (`CourseWorkspaceModal`, `LiveClassroomModal`, `ScholarshipApplicationModal`, `CompetitionArenaModal`). |
| **Emoji / Raw SVG Icon Soup** | Inconsistent stroke weights, mismatched aesthetics, and emoji rendering discrepancies | Use `lucide-react` icons exclusively with standard size and stroke weights (`1.8` - `2.2`). |
