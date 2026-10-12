# 03 · Routing & Navigation

The URL is the single source of truth for view state. Routing is **data-driven**: routes are declared in JSON, matched by a small custom router, and rendered by the persistent shell. This document explains the pipeline, the route fields, the navigation tabs, and how to add or debug a URL.

---

## 1. The URL pipeline — four files, four jobs

```
routes.json               what each path IS
(src/shared/json/)        path, redirect, title, activeTab, tabsByQuery,
                          hideShell, immersive, skeletonVariant
        │
        ▼ joined with
routes.tsx                which COMPONENT renders it
(src/app/)                PAGE_BY_PATH: path → lazy page chunk
        │
        ▼
router.tsx                how the URL CHANGES
(src/app/)                navigate(), back/forward, scroll memory, view transitions
        │
        ▼
RootLayout.tsx            what the SHELL does
(src/app/layouts/)        header, footer, bottom bar, active tab
        │
        ▼
shellNav.json             where the TABS go
(src/shared/json/)        NAV_TARGETS paths + one tab list
```

In one sentence: **the JSON says what a path is, the TSX says what renders it, the router says how it changes, the layout says what wraps it.**

---

## 2. The route table

`frontend/src/shared/json/routes.json` is an ordered array. Order matters: `findRoute()` returns the **first** match, so specific paths must sit above `*`.

| Path | Kind | Tab | Shell | Skeleton |
| :--- | :--- | :--- | :--- | :--- |
| `/` | page (Home) | `home` | standard | `home` |
| `/catalog` | page (Catalog) | `catalog` (+ `tabsByQuery`) | standard | `catalog` |
| `/courses` | redirect → `/catalog?type=courses` | `courses` | standard | `catalog` |
| `/scholarships` | redirect → `/catalog?type=scholarships` | `scholarships` | standard | `catalog` |
| `/courses/:slug` | page (Course landing) | `courses` | standard | `detail` |
| `/courses/:slug/learn` | page (Course player) | `courses` | standard | `detail` |
| `/courses/:slug/certificate` | page (Certificate) | `courses` | standard | `detail` |
| `/scholarships/:slug` | page (Scholarship detail) | `scholarships` | standard | `detail` |
| `/events` | page (Events) | `events` | standard | `default` |
| `/competitions` | page (Competitions) | `competitions` | standard | `default` |
| `/dashboard` | page (Dashboard) | `dashboard` (+ `tabsByQuery`) | `immersive` | `dashboard` |
| `/dashboard/enrolled` | redirect → `/dashboard?view=enrolled` | `dashboard` | — | `dashboard` |
| `/profile` | page (redirects to `/dashboard?view=profile`) | `profile` | standard | `default` |
| `/login` | page (Login) | — | `hideShell` | `default` |
| `/auth` | redirect → `/login` | — | `hideShell` | `default` |
| `*` | page (NotFound) | — | standard | `default` |

### Route fields

| Field | Required | What it does |
| :--- | :---: | :--- |
| `path` | ✅ | The URL. `:slug` for params, `*` for the catch-all. |
| `redirect` | — | Target instead of a page. Mutually exclusive with a page. |
| `title` | ✅ | `document.title`, set automatically by the router. |
| `description` | — | Meta description. |
| `activeTab` | — | Which navbar tab lights up. Defaults to `home`. |
| `tabsByQuery` | — | `{ "queryValue": "tabKey" }` — a query value that switches the tab. |
| `hideShell` | — | No navbar, no footer, **no** bottom bar. Full-screen pages. |
| `immersive` | — | Page owns its own nav. No navbar, no footer; bottom bar stays. |
| `skeletonVariant` | ✅ | `home` \| `catalog` \| `detail` \| `dashboard` \| `default`. |

### `hideShell` vs `immersive`

| | navbar | footer | bottom bar | Use for |
| :--- | :---: | :---: | :---: | :--- |
| neither | ✅ | ✅ | ✅ | Normal pages |
| `immersive: true` | ❌ | ❌ | ✅ | Dashboard (owns its top bar) |
| `hideShell: true` | ❌ | ❌ | ❌ | Login, full-screen player |

`RootLayout` computes this once — a page never repeats the check:
```ts
const showHeaderAndFooter = !hideShell && !activeRoute?.meta?.immersive;
```

---

## 3. Adding a page — four steps

**Step 1 — register the lazy chunk** in `src/app/pageLoads.ts`:
```ts
export const MyNewPage = lazy(() => import('../features/myfeature/pages/MyNewPage'));
```

**Step 2 — add the route entry** to `src/shared/json/routes.json`:
```json
{
  "path": "/my-feature",
  "title": "ميزة جديدة — أكاديمية خوارزم",
  "description": "وصف الصفحة لمحركات البحث.",
  "activeTab": "home",
  "skeletonVariant": "default"
}
```

**Step 3 — map the path to its component** in `src/app/routes.tsx`:
```ts
const PAGE_BY_PATH: Record<string, ComponentType> = {
  // ...
  '/my-feature': MyNewPage,
};
```

**Step 4 — build the page.** A standard page renders `<main className="content-container">` only. No navbar, no footer, no `<PageSkeleton>`, no fake loading timers — the layout provides all of that.

---

## 4. Redirects

A route renders a page **or** redirects, never both. `redirect` is data — there is no `<Navigate />` in the table. `routes.tsx` detects the field and builds the redirect variant; `Outlet` renders `<Navigate to={redirect} replace />`.

```json
{ "path": "/courses", "redirect": "/catalog?type=courses", "activeTab": "courses", "skeletonVariant": "catalog" }
```

**Canonical URLs:** one real page per view; everything else redirects. `/courses` and `/scholarships` redirect into `/catalog?type=…`; `/dashboard/enrolled` redirects into `/dashboard?view=enrolled`; `/profile` redirects into `/dashboard?view=profile`.

---

## 5. Navigation tabs & targets

Never type a path string. Every URL in the app comes from `frontend/src/shared/json/shellNav.json`, hydrated by `@/shared/lib/navigation`:

```json
{
  "targets": {
    "home": "/",
    "catalog": "/catalog",
    "courses": "/catalog?type=courses",
    "scholarships": "/catalog?type=scholarships",
    "events": "/events",
    "competitions": "/competitions",
    "dashboard": "/dashboard",
    "profile": "/dashboard?view=profile",
    "login": "/login"
  },
  "tabs": [
    { "key": "home",         "icon": "Home",            "desktop": true,  "mobile": true  },
    { "key": "courses",      "icon": "BookOpen",        "desktop": true,  "mobile": true  },
    { "key": "scholarships", "icon": "GraduationCap",   "desktop": true,  "mobile": true  },
    { "key": "events",       "icon": "CalendarDays",    "desktop": true,  "mobile": false },
    { "key": "competitions", "icon": "Trophy",          "desktop": true,  "mobile": false },
    { "key": "dashboard",    "icon": "LayoutDashboard", "desktop": false, "mobile": true  },
    { "key": "profile",      "icon": "User",            "desktop": false, "mobile": true  }
  ]
}
```

```ts
export const NAV_TARGETS = shellNavJson.targets as Record<NavTabKey | 'login', string>;
export const NAV_TABS = shellNavJson.tabs.map((tab) => ({ ...tab, icon: resolveIcon(tab.icon) }));
export const DASHBOARD_TOP_BAR_TABS = NAV_TABS.filter((tab) => tab.desktop);
```

**One list, three surfaces.** The desktop navbar renders `desktop: true`, the mobile bottom bar renders `mobile: true`, and the dashboard top bar renders the desktop set. Labels come from `toArabicNav(tab.key)` — never restated.

**Adding a tab:** add the target, add the tab row with its flags, register a matching `NavTabKey` in `localization.ts`, and add the label to `localization.json`. The navbar components are never edited.

---

## 6. Reading the URL in a component

```tsx
import { useRouter, useNavigate, useParams, useSearchParams, useLocation, useActiveRoute } from '@/app/routerContext';
```

| Hook | Returns |
| :--- | :--- |
| `useRouter()` | Everything at once: `pathname`, `search`, `params`, `activeRoute`, `navigate` |
| `useNavigate()` | `navigate(to, { replace? })` |
| `useParams<T>()` | Route params, typed |
| `useSearchParams()` | `[URLSearchParams, setter]` — the setter replaces the URL and keeps scroll |
| `useLocation()` | `pathname` + `search` |
| `useActiveRoute()` | The matched `RouteDefinition` or `null` |

**Navigating:**
```tsx
navigate(NAV_TARGETS.dashboard);
navigate(NAV_TARGETS.courses);
setSearchParams({ type: 'courses', q: 'python' }); // query update, scroll preserved
```

**Derive, never sync.** Keep only non-URL state local:
```tsx
// GOOD — derived, cannot drift
const activeTab = searchParams.get('type') || 'all';
const qFromUrl = searchParams.get('q') || '';
const [persistentFilters, setPersistentFilters] = useState(DEFAULT_FILTERS);
const filters = { ...persistentFilters, type: activeTab, searchQuery: qFromUrl };
```

---

## 7. `tabsByQuery` — when the tab is not `activeTab`

Some query values must light a tab other than the route's own. Each route declares its own map:

```json
{ "path": "/catalog",   "activeTab": "catalog",   "tabsByQuery": { "courses": "courses", "scholarships": "scholarships" } }
{ "path": "/dashboard", "activeTab": "dashboard", "tabsByQuery": { "profile": "profile" }, "immersive": true }
```

`resolveActiveTab(pathname, search)` tries `tabsByQuery` first, then falls back to `activeTab`.

- `/catalog?type=courses` lights the **courses** tab; `?type=scholarships` lights **scholarships**; no `type` lights **catalog**.
- `/dashboard?view=profile` lights the **profile** tab, while legacy aliases like `?view=courses` do not.

---

## 8. Dashboard views — `dashboardNav.json`

Dashboard "views" are query-driven (`?view=`), not routes.

```json
{
  "id": "enrolled",
  "label": "دوراتي",
  "icon": "BookOpen",
  "isExternalRoute": false,
  "aliases": ["courses"],
  "inSubNav": true,
  "path": "/dashboard/enrolled"
}
```

| Field | Meaning |
| :--- | :--- |
| `id` | Canonical view. `?view=<id>` opens it. |
| `aliases` | Extra `?view=` values that light this item. |
| `inSubNav` | Shows in the mobile pill strip. |
| `isExternalRoute` | Real boolean. `true` **requires** `path`; the app throws otherwise. |
| `icon` | Name, hydrated by `resolveIcon()`. |

Resolve a view to its nav item — never branch:
```tsx
const navItem = getDashboardNavItem(view); // null for views outside the sidebar
<DesktopDashboardSidebar activeItemId={navItem?.id ?? null} />
```

- The **pill strip is derived**: `DASHBOARD_SUB_NAV = DASHBOARD_NAV.filter(item => item.inSubNav)`; each item's `activeViews` is `[item.id, ...item.aliases]`.
- The pill strip (`.dash-subnav`) is **mobile/tablet-only** (`lg:hidden`); at `lg+` the right sidebar owns navigation.
- `?view=saved` and `?view=notifications` intentionally have **no sidebar item** (icon-only entry points) and resolve to `null`; the page still renders them.
- **Modes are not aliases.** `?view=live` and `?state=empty` are demo modes and stay explicit booleans in the page.
- A mode the URL must survive is a query param: `/login?mode=welcome-back` reopens the returning-user card.

---

## 9. What the router handles for you

`src/app/router.tsx` already does the following — never reimplement it:

- **View transitions** — `document.startViewTransition` when available, CSS fallback otherwise; `withViewTransition()` wraps every update.
- **Scroll memory** — cross-page navigation scrolls to top; back/forward restores the exact offset; query updates preserve scroll.
- **Title updates** — `document.title` follows `meta.title`.
- **Lazy suspense** — `RootLayout` wraps `<Outlet />` in `<Suspense fallback={<PageSkeleton variant={…} />}>`.
- **Page remount control** — the transition wrapper is keyed by `pathname`, so query changes do not remount the page.

---

## 10. Debugging a URL — checklist

| Symptom | Look at |
| :--- | :--- |
| Blank page | Is the path in `routes.json` **and** `PAGE_BY_PATH`? Is the lazy chunk in `pageLoads.ts`? |
| 404 on a valid page | Order in `routes.json` — `*` is probably above it. |
| Wrong page renders | Two patterns match; `findRoute()` returns the **first**. |
| Redirect loops | Does the `redirect` target itself redirect? |
| Wrong navbar tab lit | `activeTab` vs `tabsByQuery` in that route's entry. |
| Shell missing | `hideShell` / `immersive` set when it should not be. |
| Query change does nothing | The value was copied into `useState` instead of derived. |
| Page remounts on query change | Missing `key={pathname}` on the transition wrapper. |
| Params empty | Pattern needs `:slug`, and the segment count must match. |

Ask the router directly:
```ts
import { findRoute, resolveActiveTab } from './routes';
const [pathname, search = ''] = url.split('?');
const hit = findRoute(pathname);
console.log(hit?.route.path, hit?.params, resolveActiveTab(pathname, search), hit?.route.skeletonVariant);
```

**Match rules:** `:name` captures one segment, `*` always matches, and a segment-count mismatch never matches.

---

## 11. Routing rules

1. **No path literals** — import from `NAV_TARGETS`.
2. **No hardcoded tabs** — add to `shellNav.json` and let the surfaces filter.
3. **No Arabic as a URL value** — English keys internally, Arabic at display time only.
4. **One page per view** — everything else is a `redirect` entry.
5. **`*` goes last** and renders `NotFoundPage`, never `null`.
6. **Never branch on a route or view** — use `resolveActiveTab`, `findRoute`, `getDashboardNavItem`.
7. **Shareable view state lives in the query** — derived at render, never kept only in `useState`.
