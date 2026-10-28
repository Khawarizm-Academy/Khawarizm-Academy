---
name: fe-routing-and-url-state
description: Routing and URL handling for single-page and multi-page frontends (React Router, TanStack Router, Next.js, Vue Router, custom routers) - data-driven route tables, one source of truth for paths, redirects as data, shell flags (full, immersive, hidden), active-tab resolution, query params as shareable view state, derived state instead of useState mirrors, route-level lazy loading, 404 handling, scroll restoration, and a debugging checklist. Use when adding or changing a route, redirect, nav tab, query param, or when a URL renders the wrong thing.
---

# Routing & URL State

The URL is the **single source of truth for view state** (which page, which tab, filters, search, page number). Routes are **data** where the stack allows it.

## 1. The five jobs (keep them separate)

```
route table   what each path IS            (path, title, description, redirect, activeTab, shell flags, skeleton variant)
page map      which COMPONENT renders it   (path -> lazy chunk)
router        how the URL CHANGES          (navigate, back/forward, scroll memory, transitions)
layout        what WRAPS the page          (header, footer, bottom bar, error boundary, Suspense)
nav config    where the TABS point         (target paths + one tab list with per-surface flags)
```

## 2. Adding a page: three places

1. **Lazy chunk** for the page component (route-level code splitting, [`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md) §3).
2. **Route entry** in the route table: `path`, `title`, `description`, `activeTab`, `skeletonVariant`, shell flags.
3. **Map path -> component.**

The page itself is content only: no header/footer/skeleton/shell markup. Order in the table matters when the matcher returns the **first** match: specific paths above the catch-all `*`.

## 3. Redirects are data

A route renders a page **or** redirects, never both. `{ "path": "/courses", "redirect": "/catalog?type=courses" }`. Keep one canonical URL per view; everything else redirects (and, for SEO, redirects server-side with a 301 where the host allows - [`seo-technical`](../seo-technical/SKILL.md)).

## 4. Never type a path string

Every URL comes from one target map (`NAV_TARGETS.dashboard`). Tabs come from **one list** with per-surface flags (`desktop: true, mobile: false`); the desktop navbar, mobile bottom bar, and any dashboard bar all filter that list. Adding a tab = target + one row + one label.

## 5. Shell flags

| Flag | Header/footer | Bottom bar | Use for |
| --- | --- | --- | --- |
| none | yes | yes | normal pages |
| `immersive` | no | yes | pages that own their navigation (dashboard) |
| `hideShell` | no | no | login, full-screen player, exams |

The layout computes this **once** from the route entry; pages never check it.

## 6. Active tab resolution

`resolveActiveTab(pathname, search)`: try the route's `tabsByQuery` map first (a query value may light a *different* tab than the route's own), then fall back to `activeTab`. Use `tabsByQuery` only when a query value must highlight another tab; do not use a global "query value = tab key" rule.

## 7. Query params are shareable state

```tsx
const [params, setParams] = useSearchParams();
const type = params.get('type') ?? 'all';          // derived at render - cannot drift
const q = params.get('q') ?? '';
const [persistent, setPersistent] = useState(DEFAULTS);   // only NON-URL state (page-local UI)
const filters = { ...persistent, type, q };
setParams({ type: 'courses', q: 'python' });        // replaces URL, keeps scroll
```
- **Never** copy a URL value into `useState` and sync it with `useEffect` (stale closures, double renders, drift).
- Modes the user should be able to bookmark/share (`?mode=welcome-back`, `?tab=reviews`) live in the URL.
- A query change on the same path must not remount the page; only the data section re-renders (`key={pathname}`, not `key={location}`).
- English/ASCII keys in URLs; localized text only at display time.

## 8. Dynamic segments and aliases

`:slug` captures one segment; segment counts must match. Aliases (`?view=courses` meaning `enrolled`) are data fields on the nav item (`aliases: []`), and the lookup function (`getNavItem(view)`) returns `null` for views intentionally outside the nav - never branch on a view id in a component.

## 9. 404 and error handling

- `*` renders a real not-found page, never `null`, and is the last entry.
- Unbuilt tabs get a placeholder page, never a blank outlet.
- A route-level error boundary shows a themed error and keeps the shell alive ([`core-error-handling`](../core-error-handling/SKILL.md) §7).
- For SEO the server should return a 404 **status** for unknown URLs ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

## 10. What the router must handle once (do not reimplement)

- View transitions around navigation updates (`document.startViewTransition` where supported, CSS fallback otherwise).
- Scroll: top on cross-page navigation, exact restore on back/forward, preserved on query-only changes.
- `document.title` and meta description from the route entry ([`seo-on-page-content`](../seo-on-page-content/SKILL.md)).
- Lazy chunk Suspense with the matching skeleton ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
- Prefetching a route's chunk and data on link hover/focus ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).

## 11. Debugging a URL

| Symptom | Look at |
| --- | --- |
| blank page | path missing from the route table or page map; lazy chunk not registered |
| valid page shows 404 | `*` above it; first-match order |
| wrong page | two patterns match; first wins |
| redirect loop | the redirect target redirects back |
| wrong tab lit | `activeTab` vs `tabsByQuery` |
| shell missing/duplicated | shell flags; page rendering its own header |
| query change does nothing | value mirrored into `useState` instead of derived |
| page remounts on query change | transition wrapper keyed by search instead of path |

Print the router's answer for a URL: matched route, params, active tab, skeleton variant.

## 12. Rules

1. No path literals. 2. No hardcoded tabs. 3. No localized text in URLs. 4. One page per view; everything else redirects. 5. `*` last. 6. Never branch on a route/view; use the resolver helpers. 7. Shareable state lives in the query. 8. Verify every URL you touch.
