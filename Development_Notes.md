## Development Notes (Handwritten)

### 📌 Localization & State
- Code uses English keys (`'home'`, `'courses'`), the UI shows Arabic.
- Labels live in [`localization.json`](./frontend/src/shared/json/localization.json).
- Converted at display time by [`localization.ts`](./frontend/src/shared/lib/localization.ts).
- Never use Arabic as a state or logic key.

### Static Data
- Every list, label, and record lives in [`shared/json`](./frontend/src/shared/json).
- JSON cannot hold a component or a type, so it stores the icon **name** or the raw record.
- [`navigation.ts`](./frontend/src/shared/lib/navigation.ts) turns names into components with `resolveIcon()`; the mock files do the same with their types.
- A `.ts` file next to a JSON file is only allowed to add types or hydrate data.

### Refactors

#### Routes
- [`routes.json`](./frontend/src/shared/json/routes.json) holds paths, redirects, titles, shell flags.
- [`routes.tsx`](./frontend/src/app/routes.tsx) only adds the page component for each path.
- A route renders a page **or** redirects, never both.
- `resolveActiveTab(pathname, search)` and `findRoute()` do the lookups. No `if` chains.

#### Shell Tabs
- [`shellNav.json`](./frontend/src/shared/json/shellNav.json) owns every path and tab.
- `NAV_TARGETS` = tab → URL. `NAV_TABS` = one list, `desktop` and `mobile` flags pick the subset.
- The navbar, the bottom bar, and the dashboard top bar read that list, so they cannot drift apart.

#### Dashboard
- [`dashboardNav.json`](./frontend/src/shared/json/dashboardNav.json) is the nav source: id, label, icon, aliases.
- [`dashboardViews.json`](./frontend/src/shared/json/dashboardViews.json) holds the title, subtitle, and chips per view.
- `aliases` lists the extra `?view=` values that light an item, e.g. `courses` → `enrolled`.
- `inSubNav` picks the items shown in the pill strip.
- `getDashboardNavItem(view)` resolves a view to its item, so no view needs an `if`.

#### Catalog
- [`catalog.json`](./frontend/src/shared/json/catalog.json) holds page titles, sort options, and filter groups.
- [`catalogFilters.ts`](./frontend/src/features/catalog/data/catalogFilters.ts) merges a group with its per-tab variant.
- The sidebar and the mobile drawer render the same [`CatalogFilterGroups`](./frontend/src/features/catalog/components/CatalogFilterGroups.tsx), so they cannot drift apart.

### Rules
- One source of truth per thing. If a label or path is written twice, move it to the config.
- Prefer a lookup over a chain of conditions.
- Comments stay one line and short.
