## Development Notes (Handwritten)

### 📌 Localization & State
- Code uses English keys (`'home'`, `'courses'`), the UI shows Arabic.
- Converted only at display time by [`localization.ts`](./frontend/src/shared/lib/localization.ts).
- Helpers: `toArabic()`, `toArabicNav()`, `convertKeyToAr()`.
- Never use Arabic as a state or logic key.

## Refactors

### Routes
- Every route lives in [`routes.tsx`](./frontend/src/app/routes.tsx). Add one there and it just works.
- A route renders a page **or** redirects, never both.
- Redirects are data: `redirect: '/catalog?type=courses'`.
- `meta` holds the title, the active tab, and the shell flags (`hideShell`, `immersive`).
- No `if` chains. The router reads the table, the layout reads the table.

### Shell Tabs
- [`navigation.ts`](./frontend/src/shared/lib/navigation.ts) owns every path.
- `NAV_TARGETS` = tab → URL. `NAV_TABS` = one list, `desktop` and `mobile` flags pick the subset.
- The navbar and the bottom bar read that list, so they cannot drift apart.
- `resolveActiveTab(pathname, search)` decides the highlighted tab.

### Dashboard Tabs
- [`dashboardNav.json`](./frontend/src/shared/json/dashboardNav.json) is the source: id, label, icon, aliases.
- JSON holds icon **names**, `navigation.ts` turns them into components.
- `aliases` lists the extra `?view=` values that light the item, e.g. `courses` → `enrolled`.
- `inSubNav` picks the items shown in the pill strip.
- `getDashboardNavItem(view)` resolves a view to its item, so no view needs an `if`.
- `VIEW_HEADERS` in [`DashboardPage.tsx`](./frontend/src/features/dashboard/pages/DashboardPage.tsx) holds the title and chips per view.

### Rules
- One source of truth per thing. If a label or path is written twice, move it to the config.
- Prefer a lookup over a chain of conditions.
- Comments stay one line and short.