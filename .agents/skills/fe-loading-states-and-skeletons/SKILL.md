---
name: fe-loading-states-and-skeletons
description: Loading, empty, and error state design for web UIs - two-tier skeletons (full-page via Suspense, data-section via cache miss), zero layout shift, skeleton primitives, shimmer with reduced-motion support, never fake timers, empty states with next actions, error panels with retry, optimistic and partial states, and progress indicators. Use when building any data-driven view, a new page, a loading screen, or fixing flashes and layout jumps.
---

# Loading, Empty & Error States

Perceived speed is mostly **what the user sees while waiting**. Show structure immediately, keep the controls alive, and never flash.

## 1. Two tiers

| Tier | When | Component | What stays mounted |
| --- | --- | --- | --- |
| **1. Page skeleton** | cold visit, hard refresh, lazy route chunk is loading | `<PageSkeleton variant="home" \| "catalog" \| "detail" \| "dashboard" \| "default" />` rendered by the layout's `Suspense` fallback | global header/nav (they live in the layout) |
| **2. Data-section skeleton** | a query key was **never fetched** (true cold miss) | `<DataSectionSkeleton variant="grid" \| "rail" \| "list" count={6} />` or a feature-specific one | header, hero, search, filters, footer |

**Hard rules**
- A skeleton is a real loading state (Suspense or a cache miss). **Never a fake `setTimeout` skeleton.**
- Pages do not render `<PageSkeleton>` themselves; the route entry declares `skeletonVariant` and the layout does it ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)).
- Filter/search/sort/page changes **do not** show a Tier-2 skeleton; keep previous data mounted with a subtle shimmer line ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).
- Pages never duplicate the app shell.

## 2. Zero layout shift

The skeleton must pre-render the **same structure and dimensions** as the content (same grid, card heights, image aspect ratios). Reserve space for images (`aspect-ratio`, width/height) and async blocks. Target CLS near 0 ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 3. Skeleton primitives (build once, reuse)

`SkeletonBox`, `SkeletonText(lines, lastLineWidth)`, `SkeletonCircle(size)`, `SkeletonBadge(width)`. Compose page and section skeletons from these; never hand-write grey boxes in a feature.

```css
.skeleton { background: var(--skeleton-base); position: relative; overflow: hidden; }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--skeleton-highlight), transparent);
  animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .skeleton::after { animation: none; } }
```
Animate `transform`/`opacity` only.

## 4. Render order for any data view

```
isLoading  -> data-section skeleton
isError    -> error panel + Retry
empty      -> empty state + next action
data       -> content (with a quiet isFetching indicator)
```

## 5. Empty states

An empty state says **why** it is empty and **what to do next**: icon/illustration, a short sentence, and one primary action (reset filters, create the first item, browse the catalog). Distinguish "no data yet" from "no results for these filters" (offer reset). One shared `StatePanel` component serves empty and error.

## 6. Error states

Short human message, optional detail for support, a **Retry** button, and keep any stale data visible when you have it. Never an infinite spinner; never a raw exception. Route-level crashes use an error boundary that keeps the shell alive ([`core-error-handling`](../core-error-handling/SKILL.md)).

## 7. Other loading patterns

- **Buttons:** disable and show an inline spinner/progress on submit; keep the label width stable.
- **Optimistic UI:** reflect the change immediately; roll back with an explanation on failure.
- **Progress:** determinate bars for uploads/long jobs; skeletons for content; spinners only for short, unknown waits (< ~1 s) in small areas.
- **Images:** blurred low-quality placeholder or dominant-color box until the image decodes.
- **Infinite lists:** a "loading more" row at the end, not a full-page skeleton.
- **Delay trivial spinners** by ~150-200 ms so fast responses do not flicker.

## 8. Accessibility

Announce loading and errors to assistive tech (`aria-busy`, `role="status"`/`aria-live="polite"`, `role="alert"` for errors). Skeletons are `aria-hidden`. See [`fe-accessibility`](../fe-accessibility/SKILL.md).

## 9. Verify

- [ ] Cold visit: page skeleton once, then content, no layout jump.
- [ ] Revisit: instant from cache, no skeleton.
- [ ] Filter/search/page change: only the data section updates; previous items stay; no skeleton flash.
- [ ] Error: panel with Retry; empty: message + action.
- [ ] `prefers-reduced-motion`: shimmer off.
