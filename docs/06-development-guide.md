# 06 · Development Guide

How to set up, run, and extend the Khawarizm Academy frontend. Read this before writing your first page, and keep the [design system](01-design-system.md) and [architecture](02-architecture.md) docs open.

---

## 1. Prerequisites

- **Node.js** 18+ and a package manager (npm, pnpm, or yarn).
- A browser with the View Transitions API for the full transition experience (a CSS fallback covers everything else).

---

## 2. Setup & commands

```bash
# from the repository root
cd frontend
npm install
npm run dev        # Vite dev server (defaults to http://localhost:5173)
```

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Production build — `tsc -b` then `vite build`. Must be clean. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint over the project. |
| `npm run brand:generate` | Regenerate all brand icons, favicons, and the OG image from the source logo. |

**Verification gate before any commit:**
```bash
cd frontend
npm run build      # tsc -b + vite build — zero TypeScript errors
npx eslint src     # zero warnings
```

`tsconfig.app.json` runs `noUnusedLocals` and `noUnusedParameters`, so removing data usually means removing an import too.

---

## 3. Environment

`frontend/.env` holds the API configuration:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

The app is **fully API-driven** — a running backend is required. See [07 · Backend Contract](07-backend-contract.md).

---

## 4. Code style in one page

These rules are enforced across every `.ts` / `.tsx` file. The long version is the `khawarizm-code-style` skill.

### 4.1 Comments
- **One line.** If it needs two, shorten it or delete it.
- **Say why, not what.** `// render the chart` is noise.
- **No `====` banners, no numbered steps, no commented-out code.**

### 4.2 No clever code
Write the obvious version. If a new teammate would pause on a line, rewrite it. Banned without an explanatory comment: nested ternaries in `className`, bit tricks, chained optional access mixed with `??` and `||`.

### 4.3 No `if`/`else` chains — use data

| Instead of | Use |
| :--- | :--- |
| `if (x === 'a') … else if (x === 'b') …` | a record: `const M = { a: …, b: … }[x]` |
| a chain that picks a component | a record of components, or a map of icon names |
| a chain that only shows/hides things | a `surfaces` or `desktop`/`mobile` flag in data |
| `switch` on a view/tab/status | a `Record<Union, T>` so the compiler checks exhaustiveness |

Allowed `if`s: early returns for genuinely different work (`if (!canvas) return`), loading/empty/error branches, and feature guards that cannot be expressed as data.

### 4.4 Static presentation data lives in `src/shared/json/`
Every route, nav item, label, and config map goes in a JSON file. JSON cannot hold a component or a type, so a `.ts` beside it may only import the JSON, add a type/cast, and hydrate names into components. **Record data does not live here** — it is fetched from the backend API (see [07](07-backend-contract.md)).

### 4.5 One source of truth
If a label, path, or list appears in two files, one is wrong. Before typing a literal, check whether it already exists in a config or helper. **Class strings are values too** — the same utility run twice becomes a concept class.

### 4.6 No desktop/mobile duplication
Two variants of the same UI render **one component**. Differences are data or CSS, never a JS branch. When a whole page needs different markup, split it into `views/<ComponentName>/` (see [02](02-architecture.md) §5).

### 4.7 Types over casts — cast JSON once
JSON widens every literal to `string`. Declare the shape, cast once at the boundary with a named type, and stay safe everywhere after. A cast inside a component means the boundary is in the wrong place.

### 4.8 Real JSON booleans
`{"isExternalRoute": "false"}` is truthy. Write `false`.

### 4.9 Fail loudly on bad config
Unknown icon names, missing required route fields, and half-defined routes throw instead of rendering wrong.

---

## 5. Building a page — the 10-step protocol

```
1.  Ingest the design (mockups in Designs/, Figma code)
2.  Audit reuse (shared components + concept classes)
3.  Set up the feature file structure
4.  Define types & localization (English keys + Arabic dictionary)
5.  Choose the shell mode (standard / immersive / hideShell)
6.  Wire state & URL as the single source of truth
7.  Assemble the page and its isolated data section(s)
8.  Register the lazy chunk, route entry, and PAGE_BY_PATH
9.  Polish (RTL alignment, hover glows, press states, mobile spacing)
10. Run the verification gates
```

### Step 1 — Ingest the design
- Identify the **pillar color** (cyan = courses, gold = scholarships).
- Identify the **viewport requirements** (desktop multi-column vs. mobile single column with ≥ 44px targets and bottom-nav clearance).

### Step 2 — Audit reuse
Never write a raw utility string for something that already has a concept class. Start from the [design system vocabulary](01-design-system.md#5-concept-classes--the-vocabulary) and the shared component list. Roughly 80% of a new page is assembled, not authored.

### Step 3 — File structure
```
frontend/src/features/<feature>/
├── pages/<Feature>Page.tsx
├── components/<category>/…            # layout, views, chrome, cards, hero,
│                                       # overlays, controls, states, filters, toolbar
├── context/<area>Context.ts + <Area>Provider.tsx   # if state is shared across surfaces
├── data/…                              # non-JSON feature data & fetchers
├── hooks/…                             # feature-specific hooks
├── types.ts                            # feature view types
├── <feature>.css                       # feature-scoped concept classes
└── README.md                           # the feature's own documentation
```
If a component is needed by 2+ features, move it to `shared/`.

### Step 4 — Types & localization
Internal state and config keys are **English**; Arabic appears only at render time.
```tsx
// BAD
const [tab, setTab] = useState<'دورات' | 'منح'>('دورات');
// GOOD
const [tab, setTab] = useState<'courses' | 'scholarships'>('courses');
<span>{toArabic('catalog_tabs', tab)}</span>
```

RTL form inputs: leading icon first, input second, `text-right` + `dir="auto"` on the input.

### Step 5 — Shell mode
Declare it in the route entry; never check it inside the page.

| Flags | navbar | footer | bottom bar | Use for |
| :--- | :---: | :---: | :---: | :--- |
| none | ✅ | ✅ | ✅ | Normal pages |
| `immersive: true` | ❌ | ❌ | ✅ | Dashboard |
| `hideShell: true` | ❌ | ❌ | ❌ | Login, full-screen player |

### Step 6 — URL is the source of truth
Derive URL values at render; keep only local UI state in `useState`.
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'all';
const [isFilterOpen, setIsFilterOpen] = useState(false);
const changeTab = (t: string) => setSearchParams({ tab: t });
```

### Step 7 — Page + data sections
Extract every dynamic region into an isolated data-section component that owns its `useCachedData` call, per the [canonical pattern](04-loading-caching-and-motion.md#canonical-data-section-pattern).

### Step 8 — Register the route
Three edits only: the lazy chunk in `pageLoads.ts`, the entry in `routes.json`, the path in `PAGE_BY_PATH`. If it is a nav tab, also add the target + tab row to `shellNav.json` and the label to `localization.json`. Full details: [03 · Routing](03-routing-and-navigation.md#3-adding-a-page--four-steps).

### Step 9 — Polish
- Glass surfaces, accent borders, and `var(--shadow-elev-*)` / `var(--shadow-glow-*)` glows.
- `active:scale-[0.98]` + `transition-all duration-200` on interactive controls.
- Mobile bottom clearance (`pb-28` or `pb-[max(env(safe-area-inset-bottom),16px)]`).
- Entrance cascades via `animate-pop-in` + staggered `animationDelay`.

### Step 10 — Verify
`npm run build` and `npx eslint src` clean, plus the behavior checklist below.

---

## 6. Standard page template

```tsx
import React from 'react';
import { useSearchParams } from '@/app/routerContext';

export const MyFeaturePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <main className="content-container animate-page-enter">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-600/50 pb-6">
        <div>
          <span className="badge-gold mb-2 inline-block">مسار معتمد</span>
          <h1 className="text-3xl font-bold text-white font-display">عنوان الميزة</h1>
          <p className="text-sm text-slate-400 font-body mt-1">وصف تفصيلي للصفحة.</p>
        </div>
        <button className="btn-gold py-2 px-5 text-sm">إجراء رئيسي</button>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 flex flex-col gap-6">{/* dynamic section */}</div>
        <aside className="flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6">{/* supporting panel */}</div>
        </aside>
      </section>
    </main>
  );
};
```

---

## 7. Common pitfalls

| Pitfall | Fix |
| :--- | :--- |
| Raw utility button soup | Use `.btn-gold`, `.btn-outline-blue`, `.btn-pill-subtle`. |
| A utility run typed twice | Extract a concept class into the owning CSS file. |
| Feature classes in `globals.css` | Move them to `features/<feature>/<feature>.css`. |
| New class in the wrong layer | Declare in `@layer components` so JSX utilities can override. |
| `@apply` on a custom class | `@apply` accepts real Tailwind utilities only. |
| Icon on the wrong side in RTL | In RTL flex, child #1 is on the right — put the icon first. |
| `dir="ltr"` on an Arabic input | Use `text-right` + `dir="auto"`. |
| Rendering the shell inside a page | Never render navbar/footer in a page view. |
| Fake `setTimeout` skeletons | Let Suspense (Tier 1) and `useCachedData` (Tier 2) handle loading. |
| Missing `import type` | `verbatimModuleSyntax` fails the build (TS1484). |
| Inverted RTL sidebar | In `dir="rtl"` flex, child #1 is rightmost — sidebar first. |
| Bouncing the user out of the dashboard | Use in-dashboard modal chambers. |
| Emojis / ad-hoc SVG icons | Use `lucide-react` only. |

---

## 8. Quality checklist

- [ ] `npm run build` exits 0 (zero TypeScript errors).
- [ ] `npx eslint src` exits 0 (no warnings, no unused vars).
- [ ] No class string is repeated across components — repetitions are concept classes.
- [ ] Desktop (1280px) renders without overflow; mobile (390px) has ≥ 44px targets.
- [ ] Every comment is one line and explains *why*.
- [ ] No new `if`/`else`/`switch` chain where a lookup would do.
- [ ] New static presentation config is in `src/shared/json/`; record data comes from the API.
- [ ] Desktop and mobile share one component (or a `views/<Component>/` split).
- [ ] Casts live at the JSON boundary.
- [ ] Navigating back/forward restores scroll; cold loads skeleton once; cached returns are instant.
