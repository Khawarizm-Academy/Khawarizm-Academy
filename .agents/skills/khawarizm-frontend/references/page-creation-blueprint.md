# Khawarizm Academy — Page Creation Blueprint & Worked Example

> **Authoritative protocol:** the full **10-step flow** lives in [`khawarizm-page-builder`](../../khawarizm-page-builder/SKILL.md). This reference is the condensed recipe plus a real deconstruction, so you can see the moves in practice.
> **Companions:** [`khawarizm-frontend`](../SKILL.md) (design system & placement) · [`khawarizm-routing`](../../khawarizm-routing/SKILL.md) (URLs) · [`khawarizm-navigation-cache`](../../khawarizm-navigation-cache/SKILL.md) (loading/caching) · [`khawarizm-organization-and-imports`](../../khawarizm-organization-and-imports/SKILL.md) (folders & imports).

---

## 1. The condensed recipe

```
1. Ingest the design      →  Designs/Khawarizm Academy Platfrom Design/<NN-feature>/*.png
2. Audit reuse            →  shared/components + concept classes (usually 80%+ of the page)
3. Scaffold the feature   →  features/<feature>/{pages,components,context,data,types.ts,<feature>.css}
4. Types & localization   →  English keys internally, Arabic via toDictionary()
5. Choose the shell mode  →  routes.json flags (standard / immersive / hideShell)
6. Wire URL state         →  derive from useSearchParams / useParams at render
7. Assemble page + data   →  thin page + isolated data section (useCachedData + keepPreviousData)
8. Register the route     →  pageLoads.ts + routes.json + PAGE_BY_PATH
9. Polish                 →  RTL alignment, hover glows, press scales, mobile safe area
10. Verify                →  npm run build && npx eslint src  (+ behavioral check)
```

Steps 1–6 are design and structure; 7–10 are wiring and verification. The 10-step skill expands each one.

---

## 2. Types, localization & mock data

**Types (`features/<feature>/types.ts`) — English keys only:**
```ts
export type CatalogTab = 'all' | 'courses' | 'scholarships';
export type EducationLevel = 'all' | 'bachelor' | 'master' | 'phd' | 'bootcamp';
```

**Localization:** register new labels in `src/shared/json/localization.json` and read them through `toArabic(category, key)` / `toArabicNav(key, isMobile?)` from `src/shared/lib/localization.ts`. Never store Arabic in state or in a URL.

**Static data:** the records go in `src/shared/json/<feature>.json`; a `.ts` beside it may only hydrate (icon names) or add types. Reuse existing shared entities (`Course`, `Scholarship`, `Event`) from `src/shared/types/entities.ts`.

---

## 3. Assemble the page (content only — no shell)

A page view never renders the navbar, footer, bottom bar or atmosphere: `RootLayout` owns them. It starts with `<main className="content-container">`.

Build any feature-specific piece from the **existing concept classes** and reuse shared components. The real `CatalogFilterSidebar` shows the pattern — the shell comes from the feature's own classes, the pill rows are delegated to the shared `<CatalogFilterGroups />`:

```tsx
export const CatalogFilterSidebar: React.FC<CatalogFilterSidebarProps> = ({
  type, filters, onChangeFilter, onReset,
}) => (
  <aside className="catalog-sidebar">
    <div className="catalog-panel-head">
      <div className="catalog-panel-title">
        <Filter size={16} className="text-gold-400" />
        <span>{catalogJson.filters.header}</span>
      </div>
      <button type="button" onClick={onReset} className="catalog-reset hover:text-gold-200">
        {catalogJson.filters.resetLabel}
      </button>
    </div>
    <CatalogFilterGroups tab={type} filters={filters} surface="desktop" onChangeFilter={onChangeFilter} />
  </aside>
);
```

When you catch the same utility run twice, extract a concept class into the owning CSS file (`@layer components`), per [`khawarizm-frontend`](../SKILL.md) §3.7.

---

## 4. Register the route (exactly three places)

```ts
// 1. src/app/pageLoads.ts — one lazy chunk per page
export const MyNewPage = lazy(() => import('../features/my-feature/pages/MyNewPage').then((m) => ({ default: m.MyNewPage })));
```
```json
// 2. src/shared/json/routes.json
{ "path": "/my-feature", "title": "عنوان الصفحة — أكاديمية خوارزم", "activeTab": "home", "skeletonVariant": "default" }
```
```ts
// 3. src/app/routes.tsx
const PAGE_BY_PATH: Record<string, ComponentType> = { '/my-feature': MyNewPage };
```

That is all: `skeletonVariant` drives the Tier-1 skeleton, `title` drives `document.title`, and `RootLayout` picks the shell from the flags. There is **no** `<Route>` JSX to edit, and `*` must stay last (it renders `NotFoundPage`). Adding a top-level tab also means a target + row in `shellNav.json` and a `NavTabKey` label — see [`khawarizm-routing`](../../khawarizm-routing/SKILL.md).

---

## 5. Verify

```bash
cd frontend
npm run build      # tsc -b + vite build — zero errors
npx eslint src     # zero warnings
```

Then check **behavior**: desktop (1280px) and mobile (390px) both render, RTL inputs have their icon on the start edge, back/forward restores scroll, and a cached revisit shows no skeleton.

---

## 6. Worked example — deconstructing the catalog screen

The catalog design ships as PNGs under `Designs/Khawarizm Academy Platfrom Design/02-catalog/`. Almost the entire screen is existing components and concept classes — only the new pieces are feature files.

| Design region | Built with | New code needed |
| :--- | :--- | :--- |
| Desktop top navigation | `<DesktopNavbar />` (RootLayout) | none |
| Hero title + subtitle | `.catalog-hero` + `.section-accent-title-*` | none |
| Smart search + type toggle | `<SmartSearchBox />` (two slots share one `searchProps`) | none |
| Result cards | `<CatalogCard item={…} />` inside `.catalog-grid` | small |
| Filter sidebar + mobile drawer | `<CatalogFilterSidebar />` + `<CatalogMobileFilterDrawer />`, both delegating to `<CatalogFilterGroups />` | small |
| Toolbar + sort menu | `<CatalogToolbar />` (`.catalog-chip-btn`, `.catalog-sort-option`) | none |
| Pagination | `<CatalogPagination />` (`.catalog-page-nav`, `.catalog-page*`) | none |
| Empty / error / skeleton | `<StatePanel />` + `.catalog-state`, `<CatalogGridSkeleton />` | none |

**Takeaway:** the page view is a thin composition; the real work is the data boundary (`CatalogDataSection`) and the feature's concept classes. That ratio — reuse first, new code last — is the target for every new screen.

---

## 7. Common pitfalls

| Pitfall | Fix |
| :--- | :--- |
| Rendering the shell inside the page | Let `RootLayout` own navbars/footer; pages start with `<main className="content-container">`. |
| Editing `router.tsx`/`App.tsx` to add a route | Routes are data: `pageLoads.ts` + `routes.json` + `PAGE_BY_PATH`. |
| Fake `setTimeout` loader | Suspense handles Tier 1; `useCachedData` handles Tier 2. |
| Arabic string in state or URL | English keys internally; Arabic only via `toArabic`. |
| Repeating a class string | Extract a concept class into the owning CSS file (`@layer components`). |
| Icon on the wrong side in RTL | In an RTL flex row, the first child is on the **right** — icon first, input second. |
| Sidebar renders on the left | In `dir="rtl" flex-row`, child #1 is on the far right — sidebar first. |
| `verbatimModuleSyntax` error (TS1484) | Use `import type { … }` for types. |

---

## 8. Project docs

Human-facing walkthroughs: [`docs/06-development-guide.md`](../../../../docs/06-development-guide.md) and [`docs/02-architecture.md`](../../../../docs/02-architecture.md).
