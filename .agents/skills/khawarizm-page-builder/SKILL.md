---
name: khawarizm-page-builder
description: Comprehensive end-to-end engineering and design guide for creating and adding any new page or feature from start to finish in Khawarizm Academy. Covers design ingestion from Figma/code, directory placement, anti-duplication, RTL layout, state management, dual-tier skeletons, routing, shell control, and verification.
---

# Khawarizm Academy — Master Page & Feature Creation Blueprint

The **authoritative, self-contained workflow** for adding any new page or feature to Khawarizm Academy from start to finish. Follow this 10-step protocol whenever creating, refactoring or extending pages.

> Human-facing twin: [`docs/06-development-guide.md`](../../../docs/06-development-guide.md). Design system: [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md). URLs: [`khawarizm-routing`](../khawarizm-routing/SKILL.md).

---

## 1. Quick decision matrix — what kind of page are you building?

| Page category | Shell mode | Layout container | Skeleton variant | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **Standard platform hub** | Standard shell | `<main className="content-container">` | `'home'` or `'default'` | `HomePage`, `EventsPage`, `CompetitionsPage`, `ProfilePage` |
| **Data-rich catalog / explorer** | Standard shell | `<main className="content-container">` | `'catalog'` | `CatalogPage` |
| **Detail / landing view** | Standard shell | `<main className="content-container">` | `'detail'` | `CourseLandingPage`, `ScholarshipDetailPage` |
| **Immersive / full-screen studio** | `immersive` or `hideShell` | `min-h-screen w-full` (custom) | `'default'` | `DashboardPage` (`immersive`), `LoginPage` / `CoursePlayerPage` (`hideShell`) |

---

## 2. The 10-step universal page creation protocol

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     KHAWARIZM PAGE CREATION PROTOCOL                       │
├────────────────────────────────────────────────────────────────────────────┤
│  1. Ingest design (Designs/… PNGs + Design Code HTML + docs/)              │
│  2. Audit reuse (src/shared/components + concept classes)                  │
│  3. Scaffold the feature folder (pages, components, context, data, CSS)    │
│  4. Define types & RTL localization (English keys + Arabic dictionary)     │
│  5. Choose the shell mode (routes.json flags — never in the page)          │
│  6. Wire state to the URL (derive from useSearchParams / useParams)        │
│  7. Assemble page + data sections (useCachedData SWR + StatePanel)         │
│  8. Register the route & lazy chunk (pageLoads + routes.json + PAGE_BY_PATH)│
│  9. Polish (RTL alignment, hover glows, press scales, mobile safe area)    │
│ 10. Run verification gates (npm run build → npx eslint src)                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 — Design & requirements ingestion
1. **Locate source assets:**
   - Visual mockups: `Designs/Khawarizm Academy Platfrom Design/<NN-feature>/` (high-res PNGs).
   - Figma-to-code HTML: `Designs/Design Code/<NN-feature>/` — treat as rough structure, not final code.
   - Written specs: the feature README (`frontend/src/features/<feature>/README.md`) and `docs/`.
2. **Identify the color pillar:**
   - **Courses pillar:** cyber-cyan (`#167BDB` / `#29A9FF`), code syntax, tech badges.
   - **Scholarships pillar:** brass gold (`#C88A32` / `#E5B65C`), funding badges, countdown timers.
   - **Cosmic observatory canvas:** deep navy (`#040F24`, `#061A3A`, `#092557`), astrolabe motifs.
3. **Identify viewport requirements:**
   - **Desktop (≥ 1024px / 1280px):** multi-column, split-screens, full grid rails.
   - **Mobile (< 1024px):** single column, touch targets ≥ 44px, bottom-nav clearance, horizontal scroll rows.

---

### Step 2 — Anti-duplication & component reuse audit
**Rule: never write raw utility strings or reinvent existing UI elements.**

| If you need… | DO NOT create it — use this instead |
| :--- | :--- |
| **Primary CTA (gold)** | `<button className="btn-gold">تقدم الآن</button>` |
| **Secondary CTA (cyan outline)** | `<button className="btn-outline-blue">استكشف التفاصيل</button>` |
| **Filter chip / pill** | `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>…</button>` |
| **Squircle icon action (36×36)** | `<button className="btn-icon-box" title="حفظ"><BookmarkIcon /></button>` |
| **Circular icon action (40×40)** | `<button className="btn-icon-circle" title="الملف"><UserIcon /></button>` |
| **Course listing card** | `<CourseCard course={course} layout="desktop" \| "mobile" />` |
| **Scholarship card** | `<ScholarshipCard scholarship={scholarship} layout="desktop" \| "mobile" />` |
| **Search input** | `<SmartSearchBox variant="desktop" \| "mobile" onSearch={…} />` |
| **Empty / error state** | `<StatePanel title text icon tone="neutral" \| "danger" action? />` |
| **Academy brand seal** | `<BrandLogo size={42} showText={true} onClick={…} />` |
| **Awaiting-data loader** | `<AstrolabeLoader message="جاري تجهيز البيانات..." />` |
| **Starfield particles** | `<CelestialCanvas className="absolute inset-0 pointer-events-none opacity-60" />` |
| **Horizontal swipe row** | `<div className="horizontal-scroll-row">…</div>` |
| **A class string you typed twice** | Extract it into the owning CSS file (`@layer components`) — see below |

**Class-extraction rule:** when the same utility run repeats for the same kind of element it is a missing concept class, not styling. Put it in the owning CSS file — **`src/features/<feature>/<feature>.css`** when only that feature uses it, **`src/styles/globals.css`** when 2+ features do — **inside `@layer components`** so JSX utilities can still override it. Use `var(--shadow-elev-2)` / `var(--color-overlay-scrim)` / `var(--shadow-glow-gold)` instead of literals, and keep `group` in the JSX (`@apply` cannot target it). Full rule: `khawarizm-frontend` §3.7.

---

### Step 3 — Directory & file placement
Create files strictly per this matrix (full taxonomy: [`khawarizm-organization-and-imports`](../khawarizm-organization-and-imports/SKILL.md)):

```
frontend/src/features/<feature>/
├── components/               # UI unique to this feature ONLY (purpose subfolders)
│   ├── layout/  views/  chrome/  cards/  hero/  overlays/  controls/  states/  filters/  toolbar/
├── context/                  # (Optional) shared page state — <Area>Context.ts + <Area>Provider.tsx
├── pages/                    # The top-level Page View
│   └── <Feature>Page.tsx
├── data/                     # (Optional) non-component modules (fetchers, tone maps)
├── hooks/                    # (Optional) feature query / filter hooks
├── types.ts                  # Feature view state & prop types
└── <feature>.css             # (Optional) concept classes used only by this feature,
                              #   imported by src/styles/globals.css (never by a .tsx)
```

If a piece is used across 2+ features, it moves to `src/shared/components/<Category>/`. Static UI data goes to `src/shared/json/`; **record data comes from the API** through a `data/<feature>Fetchers.ts` module read with `useCachedData`.

---

### Step 4 — Types & RTL localization
1. **TypeScript strict + verbatim imports:**
   ```ts
   import type { MyFeatureState, MyFilterType } from '@/features/my-feature/types';
   ```
2. **Never store Arabic strings in internal state:**
   ```ts
   // BAD
   const [tab, setTab] = useState<'دورات' | 'منح'>('دورات');
   // GOOD
   const [tab, setTab] = useState<'courses' | 'scholarships'>('courses');
   <span>{toArabic('catalog_tabs', tab)}</span>
   ```
3. **RTL layout guidelines:**
   - The document flows right-to-left (`dir="rtl"`). **Start edge = right**, **end edge = left**.
   - Leading-icon inputs (icon first → right, input second; text aligned right):
     ```tsx
     <div className="flex items-center gap-3 ...">
       <div className="text-slate-400 shrink-0 pointer-events-none"><MailIcon /></div>
       <input dir="auto" className="flex-1 text-right bg-transparent outline-none ..." />
     </div>
     ```
   - Directional arrows point back along the reading flow (`←` for next/proceed, `→` for return/back).

---

### Step 5 — Shell layout (`routes.json`)
Declare the shell mode in the route entry. `RootLayout` reads it — never check it inside a page.

```json
{ "path": "/my-page",   "title": "…", "skeletonVariant": "default" }
{ "path": "/dashboard", "title": "…", "immersive": true, "requiresAuth": true, "skeletonVariant": "dashboard" }
{ "path": "/admin",     "title": "…", "hideShell": true, "requiresAdmin": true, "skeletonVariant": "dashboard" }
{ "path": "/login",     "title": "…", "hideShell": true, "skeletonVariant": "default" }
```

| Flags | navbar | footer | bottom bar | Use for |
| :--- | :---: | :---: | :---: | :--- |
| neither | ✅ | ✅ | ✅ | Normal pages |
| `immersive: true` | ❌ | ❌ | ✅ | Pages that own their own nav (dashboard) |
| `hideShell: true` | ❌ | ❌ | ❌ | Login, full-screen player, exam |

**Access control is a flag.** Add `requiresAuth: true` (signed-in only) or
`requiresAdmin: true` (staff only) and let `RouteGuard` redirect — never branch on
`user` inside the page. Details: [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md).

- **Standard (no flags):** the page renders centered content only:
  ```tsx
  export const MyPage: React.FC = () => <main className="content-container">{/* … */}</main>;
  ```
- **`hideShell: true`:** the page takes the full window:
  ```tsx
  export const MyImmersivePage: React.FC = () => (
    <div className="min-h-screen w-full flex items-center justify-center">{/* … + exit link */}</div>
  );
  ```

> 📖 Route fields, redirects and `tabsByQuery`: [`khawarizm-routing`](../khawarizm-routing/SKILL.md).

---

### Step 6 — URL as single source of truth
**Rule: never duplicate URL query parameters (`?type=`, `?page=`, `?q=`) into `useState` + `useEffect`.** Derive them at render:

```tsx
import { useSearchParams, useNavigate } from '@/app/routerContext';

export const MyFeaturePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';       // derived from URL
  const searchQuery = searchParams.get('q') || '';
  const [isFilterOpen, setIsFilterOpen] = useState(false);   // only non-URL state

  const handleTabChange = (newTab: string) => setSearchParams({ tab: newTab });
};
```

---

### Step 7 — Dual-tier skeletons & SWR caching
1. **Tier 1 (cold chunk / page suspense):** handled automatically by `RootLayout` via `skeletonVariant`. **Never** render `<PageSkeleton />` inside a page.
2. **Tier 2 (dynamic data section):** use `useCachedData` in an isolated subcomponent with `keepPreviousData: true`:

```tsx
import { useCachedData } from '@/shared/hooks/useCachedData';
import { CatalogGridSkeleton } from '@/features/catalog/components/states/CatalogGridSkeleton';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { CourseCard } from '@/shared/components/Cards/CourseCard';

export const MyDataGrid: React.FC<{ category: string }> = ({ category }) => {
  const { data, isLoading, isError, refetch } = useCachedData(
    ['my-feature-items', category],                 // deterministic cache key
    async () => fetchItemsByCategory(category),
    { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000, keepPreviousData: true }
  );

  if (isLoading) return <CatalogGridSkeleton count={6} />;
  if (isError) return <StatePanel tone="danger" title="تعذّر التحميل" action={<button onClick={refetch}>إعادة المحاولة</button>} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((item) => <CourseCard key={item.id} course={item} layout="desktop" />)}
    </div>
  );
};
```

---

### Step 8 — Route chunk & registry wiring
Every new page is wired in exactly 3 places:

```ts
// 1. src/app/pageLoads.ts
export const MyNewPage = lazy(() =>
  import('../features/my-feature/pages/MyNewPage').then((m) => ({ default: m.MyNewPage }))
);
```
```json
// 2. src/shared/json/routes.json
{
  "path": "/my-feature",
  "title": "عنوان الصفحة — أكاديمية خوارزم",
  "description": "وصف الصفحة لمحركات البحث.",
  "activeTab": "home",
  "skeletonVariant": "default"
}
```
```ts
// 3. src/app/routes.tsx
const PAGE_BY_PATH: Record<string, ComponentType> = { '/my-feature': MyNewPage };
```

That is all: `skeletonVariant` drives the Tier-1 skeleton, `title` drives `document.title`, and `RootLayout` picks the shell — **no `<Route>` JSX**.

**If it is a top-level nav tab:** add the target and the tab row to `src/shared/json/shellNav.json`, register the `NavTabKey` in `localization.ts`, and add the Arabic label to `localization.json`. The navbar, the mobile bottom bar and the dashboard top bar all read that one list — **do not** edit those components.

> 📖 Full routing walkthrough: [`khawarizm-routing`](../khawarizm-routing/SKILL.md).

---

### Step 9 — Responsive layout & aesthetic polish
Follow the **Observatory design grammar**:
1. **Glassmorphism:** prefer `.glass-panel` (`bg-[#061A3A]/40 backdrop-blur-md border-[#1B3F80]/40`).
2. **Cards:** wrap custom cards with `.card-interactive-blue` or `.card-interactive-gold`.
3. **Elevation & glows:** use the variables, not literals — `box-shadow: var(--shadow-elev-2)` for cards/panels and `var(--shadow-glow-gold)` / `var(--shadow-glow-blue)` for active glows. A raw `shadow-[0_8px_24px_rgba(0,0,0,0.35)]` is a token waiting to happen.
4. **Interactive press states:** `active:scale-[0.98]` and `transition-all duration-200`.
5. **Mobile safe area:** bottom clearance via `pb-28` or `pb-[max(env(safe-area-inset-bottom),16px)]`.

---

### Step 10 — Strict verification & quality gates
```bash
cd frontend
npm run build      # 1. strict type check + production build
npx eslint src     # 2. lint audit
```

**Quality checklist:**
- [ ] `npm run build` exits 0 (zero TypeScript errors).
- [ ] `npx eslint src` exits 0 (zero warnings, no unused variables/imports).
- [ ] No class string repeated across components — repetitions live as concept classes in the owning CSS file.
- [ ] Desktop (1280px) renders without overflow.
- [ ] Mobile (390px) renders with readable fonts and ≥ 44px tap targets.
- [ ] All inputs have proper RTL layout (icon on the right, text aligned right).
- [ ] Back/forward restores scroll correctly.

---

## 3. Standard page template (copy-paste starter)

```tsx
import React from 'react';
import { useSearchParams } from '@/app/routerContext';

export const MyFeaturePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <main className="content-container animate-page-enter">
      {/* 1. Header row */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-600/50 pb-6">
        <div>
          <span className="badge-gold mb-2 inline-block">مسار معتمد</span>
          <h1 className="text-3xl font-bold text-white font-display">عنوان الميزة أو الصفحة</h1>
          <p className="text-sm text-slate-400 font-body mt-1">وصف تفصيلي يشرح هدف الصفحة والخيارات المتاحة للطلاب.</p>
        </div>
        <button className="btn-gold py-2 px-5 text-sm">إجراء رئيسي</button>
      </section>

      {/* 2. Main content body */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">{/* dynamic content / data section */}</div>
        <aside className="flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gold-400 font-display">معلومات إضافية</h3>
            <p className="text-sm text-slate-400 font-body">تفاصيل جانبية مكملة للمحتوى الرئيسي.</p>
          </div>
        </aside>
      </section>
    </main>
  );
};
```

---

## 4. Common pitfalls & how to prevent them

| Pitfall | Problem | Solution |
| :--- | :--- | :--- |
| **Raw utility button soup** | Inconsistent padding, font, active states | Always use `.btn-gold`, `.btn-outline-blue`, or `.btn-pill-subtle`. |
| **Retyped utility runs** | The same 8-class string pasted in two files, drifting apart | Extract a concept class in the owning CSS file (`@layer components`). |
| **Feature classes in `globals.css`** | The shared stylesheet bloats; every feature edit touches the same file | Feature-scoped classes go in `src/features/<feature>/<feature>.css`. |
| **New concept class in the wrong layer** | An unlayered class beats every utility, so JSX overrides silently do nothing | Declare new classes in `@layer components`; only legacy classes are unlayered. |
| **`@apply` on a custom class** | Build fails — `@apply` accepts only real utilities | Write raw utilities in the class; keep `group` markers and global helpers in JSX. |
| **Icon on the wrong side in RTL** | Putting `<input>` first places the icon on the far left | First child is on the right — put the icon first, `<input>` second. |
| **`dir="ltr"` on an Arabic email input** | Placeholder and cursor jump to the left edge | Use `text-right` and `dir="auto"`. |
| **Duplicating the shell in a page** | Rendering `<DesktopNavbar>` in a page causes duplicate headers | Never render headers/footers in page views; `RootLayout` owns the frame. |
| **Fake `setTimeout` timers** | Clutter + layout shifts | Suspense handles Tier 1; `useCachedData` handles Tier 2. |
| **Missing `verbatimModuleSyntax`** | Build fails with `TS1484` | Use `import type { … }` for types. |
| **Inverted RTL right sidebar** | Main body before the sidebar renders the sidebar on the left | In `dir="rtl" flex-row`, child #1 is the far right — sidebar first. |
| **Non-self-contained workspace** | Bouncing users out of the dashboard for basic actions | Implement in-dashboard chamber modals. |
| **Emoji / raw-SVG icon soup** | Inconsistent stroke weights and aesthetics | Use `lucide-react` icons exclusively, stroke `1.8`–`2.2`. |
| **Editing `router.tsx`/`App.tsx` to add a route** | JSX routing to maintain | Routes are data: `pageLoads.ts` + `routes.json` + `PAGE_BY_PATH`. |

---

> 📖 **Sibling skills:** [`khawarizm-motion`](../khawarizm-motion/SKILL.md) for every animation/micro-interaction, [`khawarizm-layout-edit`](../khawarizm-layout-edit/SKILL.md) for fixing alignment, centering, column gaps, stray action buttons and sticky offsets on existing pages, and [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md) when the page is signed-in or staff-only. Starting a brand-new app instead? [`khawarizm-app-blueprint`](../khawarizm-app-blueprint/SKILL.md).
