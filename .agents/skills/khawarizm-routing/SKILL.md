---
name: khawarizm-routing
description: How to add, change, and debug routes and URLs in Khawarizm Academy. Use whenever adding a page or route, changing a path, adding a redirect, wiring a nav tab, reading or writing a query param, deciding what the navbar highlights, or debugging a URL that renders the wrong page. Covers the routes.json table, PAGE_BY_PATH, NAV_TARGETS, tabsByQuery, shell flags, and the lookup helpers.
---

# Khawarizm Academy — Routing & URL Handling

This skill is the **definitive guide** to how URLs work in Khawarizm Academy. Read it before adding a route, changing a path, or debugging a URL.

> Style rules for the code you write while doing this live in [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md).

---

## 1. The Mental Model — Four Files, Four Jobs

```
┌──────────────────────────────────────────────────────────────────────┐
│                          THE URL PIPELINE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   routes.json         ── what each path IS                          │
│   (src/shared/json/)      path, redirect, title, activeTab,          │
│                           tabsByQuery, hideShell, immersive,         │
│                           skeletonVariant                            │
│         │                                                                 │
│         ▼  joined with                                                    │
│   routes.tsx          ── which COMPONENT renders it                   │
│   (src/app/)             PAGE_BY_PATH: path → lazy page chunk         │
│         │                                                                 │
│         ▼                                                                 │
│   router.tsx          ── how the URL CHANGES                        │
│   (src/app/)             navigate(), back/forward, scroll memory,     │
│                           view transitions                           │
│         │                                                                 │
│         ▼                                                                 │
│   RootLayout.tsx      ── what the SHELL does                         │
│   (src/app/layouts/)     header, footer, bottom bar, active tab      │
│                                                                       │
│   shellNav.json       ── where the TABS go                          │
│   (src/shared/json/)      NAV_TARGETS paths + one tab list            │
└──────────────────────────────────────────────────────────────────────┘
```

**One sentence per file:** the JSON says what a path is, the TSX says what renders it, the router says how it changes, the layout says what wraps it.

---

## 2. Adding a Page — The 4 Steps

### Step 1 — Register the lazy chunk
`src/app/pageLoads.ts`:
```ts
export const MyNewPage = lazy(() => import('../features/myfeature/pages/MyNewPage'));
```

### Step 2 — Add the route entry to `src/shared/json/routes.json`
```json
{
  "path": "/my-feature",
  "title": "ميزة جديدة — أكاديمية خوارزم",
  "description": "وصف الصفحة للبحث Engines.",
  "activeTab": "home",
  "skeletonVariant": "default"
}
```

### Step 3 — Map the path to its component in `routes.tsx`
```ts
const PAGE_BY_PATH: Record<string, ComponentType> = {
  // ...
  '/my-feature': MyNewPage,
};
```

### Step 4 — Build the page
`<main className="content-container">`. No navbar, no footer, no `<PageSkeleton>`, no shell markup. The layout provides all of that.

**Order in `routes.json` matters.** `findRoute()` returns the first match, so specific paths go above `*`.

---

## 3. Adding a Redirect

A route renders a page **or** redirects, never both. `redirect` is data — there is no `<Navigate />` component in the table.

```json
{ "path": "/courses", "redirect": "/catalog?type=courses", "activeTab": "courses", "skeletonVariant": "catalog" }
```

`routes.tsx` detects the field and builds the redirect variant automatically. `Outlet` renders `<Navigate to={redirect} replace />`.

**Canonical URLs:** one real page per view, everything else redirects. `/courses` and `/scholarships` redirect to `/catalog?type=…`. Never register two page routes for the same view.

---

## 4. Route Entry Fields

| Field | Required | What it does |
| :--- | :---: | :--- |
| `path` | ✅ | The URL. `:slug` for params. `*` for the catch-all. |
| `redirect` | — | Target instead of a page. Mutually exclusive with a page. |
| `title` | ✅ | `document.title`. Set automatically by the router. |
| `description` | — | Meta description. |
| `activeTab` | — | Which navbar tab lights up. Defaults to `home`. |
| `tabsByQuery` | — | `{ "queryValue": "tabKey" }` — a query value switches the tab. |
| `hideShell` | — | No navbar, no footer, **no** bottom bar. For full-screen pages. |
| `immersive` | — | Page owns its own nav. No navbar, no footer; bottom bar stays. |
| `skeletonVariant` | ✅ | `home` \| `catalog` \| `detail` \| `dashboard` \| `default`. |

**`hideShell` vs `immersive`** — the only confusing pair:

| | navbar | footer | bottom bar | Use for |
| :--- | :--- | :--- | :--- | :--- |
| neither | ✅ | ✅ | ✅ | Normal pages |
| `immersive: true` | ❌ | ❌ | ✅ | Dashboard (has its own top bar) |
| `hideShell: true` | ❌ | ❌ | ❌ | Login, full-screen player |

`RootLayout` computes this once — never repeat the check in a page:
```ts
const showHeaderAndFooter = !hideShell && !activeRoute?.meta?.immersive;
```

---

## 5. `tabsByQuery` — Why the Tab Is Not Always `activeTab`

`/dashboard?view=profile` must light the **profile** tab, while `/dashboard?view=courses` is a legacy alias that must **not** light it. A global "query value = tab key" rule cannot express that, so each route declares its own map.

```json
{
  "path": "/catalog",
  "activeTab": "catalog",
  "tabsByQuery": { "courses": "courses", "scholarships": "scholarships" }
}
{
  "path": "/dashboard",
  "activeTab": "dashboard",
  "tabsByQuery": { "profile": "profile" },
  "immersive": true
}
```

`resolveActiveTab(pathname, search)` tries `tabsByQuery` first, then falls back to `activeTab`.

**When to use it:** any query value that must highlight a tab other than the route's own. **When not to:** when the tab is just the page — `activeTab` is enough.

---

## 6. Paths and Tabs — `shellNav.json` and `NAV_TARGETS`

**Never type a path string.** Every URL in the app comes from `shellNav.json`.

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
    { "key": "home",          "icon": "Home",            "desktop": true,  "mobile": true },
    { "key": "courses",       "icon": "BookOpen",        "desktop": true,  "mobile": true },
    { "key": "scholarships",  "icon": "GraduationCap",   "desktop": true,  "mobile": true },
    { "key": "events",        "icon": "CalendarDays",    "desktop": true,  "mobile": false },
    { "key": "competitions",  "icon": "Trophy",          "desktop": true,  "mobile": false },
    { "key": "dashboard",     "icon": "LayoutDashboard", "desktop": false, "mobile": true },
    { "key": "profile",       "icon": "User",            "desktop": false, "mobile": true }
  ]
}
```

Then in `navigation.ts`:
```ts
export const NAV_TARGETS = shellNavJson.targets as Record<NavTabKey | 'login', string>;
export const NAV_TABS = shellNavJson.tabs.map((tab) => ({ ...tab, icon: resolveIcon(tab.icon) }));
export const DASHBOARD_TOP_BAR_TABS = NAV_TABS.filter((tab) => tab.desktop);
```

**One list, two surfaces.** The desktop navbar renders `desktop: true`, the mobile bottom bar renders `mobile: true`, the dashboard top bar renders the desktop set. Add a tab once and all three follow. Labels come from `toArabicNav(tab.key)` — never restate them.

**Adding a tab:** add the target, add the tab row with its flags, register a matching `NavTabKey` in `localization.ts`, and add the label to `localization.json`. That is the whole job.

---

## 7. Reading the URL in a Component

```tsx
import { useRouter, useNavigate, useParams, useSearchParams, useLocation, useActiveRoute } from '../../../app/routerContext';

const { pathname, search, params, activeRoute, navigate } = useRouter();
const navigate = useNavigate();
const { slug } = useParams<{ slug: string }>();
const [searchParams, setSearchParams] = useSearchParams();
```

| Hook | Returns |
| :--- | :--- |
| `useRouter()` | Everything at once: `pathname`, `search`, `params`, `activeRoute`, `navigate` |
| `useNavigate()` | `navigate(to, { replace? })` |
| `useParams<T>()` | Route params, typed |
| `useSearchParams()` | `[URLSearchParams, setter]` — setter replaces the URL and keeps scroll |
| `useLocation()` | `pathname` + `search` |
| `useActiveRoute()` | The matched `RouteDefinition` or `null` |

**Navigating:**
```tsx
navigate(NAV_TARGETS.dashboard);
navigate(NAV_TARGETS.courses);
setSearchParams({ type: 'courses', q: 'python' });  // query update, scroll preserved
```

---

## 8. URL Is the Single Source of Truth for View State

**Never** copy a URL value into `useState` and sync it back with `useEffect`. Derive it at render, and keep only non-URL state local.

```tsx
// GOOD — derived, cannot drift
const activeTab = searchParams.get('type') || 'all';
const qFromUrl = searchParams.get('q') || '';
const [persistentFilters, setPersistentFilters] = useState(DEFAULT_FILTERS); // level, cost, page…
const filters = { ...persistentFilters, type: activeTab, searchQuery: qFromUrl };
```

The query changes re-render automatically, the page never remounts, and the previous cards stay mounted while the next set loads.

---

## 9. Dashboard Views — `dashboardNav.json`

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
| `aliases` | Extra `?view=` values that light this item — here `?view=courses` opens enrolled. |
| `inSubNav` | Shows in the pill strip. Currently `main`, `enrolled`, `profile`. |
| `isExternalRoute` | Real JSON boolean. `true` **requires** `path`; the app throws otherwise. |
| `icon` | Name, hydrated by `resolveIcon()`. |

**Resolve a view to its nav item — never branch on it:**
```tsx
const navItem = getDashboardNavItem(view);   // null for views outside the sidebar
<DesktopDashboardSidebar activeItemId={navItem?.id ?? null} />
```

`?view=notifications` intentionally has no sidebar item and resolves to `null`.

**Modes are not aliases.** `?view=live` and `?state=empty` are modes, not navigation targets, so they stay explicit booleans in `DashboardPage` (`isLive`, `isEmpty`) rather than becoming aliases.

---

## 10. Debugging a URL — A Checklist

When a URL renders the wrong thing, work down this list.

| Symptom | Look at |
| :--- | :--- |
| Blank page | Is the path in `routes.json` **and** `PAGE_BY_PATH`? Is the lazy chunk in `pageLoads.ts`? |
| 404 on a valid page | Order in `routes.json` — `*` is probably above it. |
| Wrong page renders | Two patterns match. `findRoute()` returns the **first** match. |
| Redirect loops | Does the `redirect` target itself redirect? |
| Wrong navbar tab lit | `activeTab` vs `tabsByQuery` in that route's entry. |
| Shell missing | `hideShell` / `immersive` set when it should not be. |
| Query change does nothing | The value was copied into `useState` instead of derived. |
| Page remounts on query change | Missing `key={pathname}` on the transition wrapper in `RootLayout`. |
| Params empty | Pattern needs `:slug`, and the segment count must match. |

**Ask the router directly.** This prints the whole answer for any URL:
```ts
import { findRoute, resolveActiveTab } from './routes';
const [pathname, search = ''] = url.split('?');
const hit = findRoute(pathname);
console.log(hit?.route.path, hit?.params, resolveActiveTab(pathname, search), hit?.route.skeletonVariant);
```

**Match rules:** `:name` captures one segment, `*` always matches, and a segment-count mismatch never matches.

---

## 11. What the Router Handles For You

`router.tsx` already does these — never reimplement them:

- **View transitions** — `document.startViewTransition` when the browser has it, CSS fallback otherwise. `withViewTransition()` wraps every update.
- **Scroll memory** — cross-page navigation scrolls to top, back/forward restores the exact offset.
- **Query updates keep scroll** — same page, new query, reader stays put.
- **Title updates** — `document.title` follows `meta.title`.
- **Lazy suspense** — `RootLayout` wraps `<Outlet />` in `<Suspense fallback={<PageSkeleton variant={...} />}>`.

---

## 12. Rules

1. **No path literals.** Import from `NAV_TARGETS`.
2. **No hardcoded tabs.** Add to `shellNav.json` and let the surfaces filter.
3. **No Arabic as a URL value.** English keys internally, Arabic at display time only.
4. **One page per view.** Everything else is a `redirect` entry.
5. **`*` goes last** and renders `NotFoundPage`, never `null`.
6. **Never branch on a route or view.** `resolveActiveTab`, `findRoute`, `getDashboardNavItem`.
7. **Verify every URL you touch** — route, redirect, active tab, skeleton variant, params.

---

## 13. Related Skills

- **Style for the code you write here:** [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md)
- **Skeletons, caching, page transitions:** [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md)
- **Design system and component reuse:** [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md)
- **Full page creation flow:** [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md)
