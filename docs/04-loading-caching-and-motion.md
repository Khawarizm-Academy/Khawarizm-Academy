# 04 · Loading, Caching & Motion

The platform stays fast and calm through four cooperating systems: a **persistent shell**, a **dual-tier skeleton strategy**, an **in-memory SWR cache**, and the **Celestial Motion System**. This document covers each.

---

## 1. The mental model

```
┌────────────────────────────────────────────────────────────────────────┐
│                      KHAWARIZM PLATFORM ENGINE                          │
├────────────────────────────────────────────────────────────────────────┤
│  1. ROUTING & SHELL   Persistent RootLayout + lazy route chunks.       │
│                       Navbars/Footer never remount.                     │
├───────────────────────┼────────────────────────────────────────────────┤
│  2. VIEW TRANSITIONS  Native View Transitions API (CSS themed)         │
│                       + .animate-page-enter fallback + scroll memory.   │
├───────────────────────┼────────────────────────────────────────────────┤
│  3. DUAL-TIER         Tier 1: PageSkeleton (Suspense, from              │
│     SKELETONS           skeletonVariant).                               │
│                       Tier 2: DataSectionSkeleton / CatalogGridSkeleton. │
├───────────────────────┼────────────────────────────────────────────────┤
│  4. CACHING & SWR     dataCacheManager + useCachedData +                │
│                       keepPreviousData → only the data section updates. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Persistent shell & page transitions

**Rule: pages never render the app shell.** `<DesktopNavbar>`, `<MobileHeader>`, `<MobileBottomBar>`, and `<Footer>` live only in `src/app/layouts/RootLayout.tsx`. Only the `<Outlet />` region changes between routes.

The transition wrapper:
```tsx
<div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
      <Outlet />
    </Suspense>
  </RouteErrorBoundary>
</div>
```

- `key={pathname}` → the page remounts only on a **path** change; a `?query` change re-renders the data section alone.
- **Native View Transitions** — `router.tsx` wraps updates in `document.startViewTransition` and sets `html[data-vt-enabled='true']` so the CSS `.animate-page-enter` fallback is disabled (no double animation). Themed `::view-transition-old/new(root)` animations live in `globals.css`.
- **Never add a JS animation library** for page transitions — CSS + the View Transitions API is the standard.
- **Scroll memory** — cross-page → scroll to top; back/forward → restore the exact offset; query update → preserve position.
- Reduced motion is honored globally; nothing extra is needed.

---

## 3. Dual-tier skeletons

**HARD RULE: never run a fake `setTimeout` skeleton.** A skeleton reflects a real loading trigger, and there are exactly two tiers.

### Tier 1 — Full-page skeleton
- **Trigger:** cold load / hard refresh / lazy route-chunk suspense.
- **How:** automatic. Each route declares `skeletonVariant`; `RootLayout` uses `<PageSkeleton variant={…} />` as the Suspense fallback. Each page is a `React.lazy` chunk in `pageLoads.ts`.
- **Pages must not** render `<PageSkeleton>` themselves or contain fake timers.
- **Purpose:** pre-renders structure → zero Cumulative Layout Shift.

`<PageSkeleton variant="home | catalog | detail | dashboard | default" />` — `src/shared/components/Loading/PageSkeleton.tsx`.

### Tier 2 — Data-section skeleton
- **Trigger:** a genuinely cold cache miss for a data query.
- **Components:**
  - `<CatalogGridSkeleton count={6} />` for course/scholarship grids.
  - `<DataSectionSkeleton variant="grid | rail | list" count={6} />` for generic dynamic sections.
- **Rule:** surrounding controls (nav, search, sidebar, active pills, footer) stay mounted, visible, and interactive.
- **Do not** show Tier 2 on every filter change — use `keepPreviousData: true` so previous cards stay mounted while the next set loads (only a shimmer line changes). The skeleton appears only on a real first load of a key.

### Atomic primitives
`src/shared/components/Loading/SkeletonPrimitives.tsx`:
```tsx
<SkeletonBox className="w-48 h-8 rounded-lg" />
<SkeletonText lines={2} lastLineWidth="70%" />
<SkeletonCircle size={40} />
<SkeletonBadge width="75px" />
```

---

## 4. In-memory SWR caching

The cache is a module singleton, `dataCacheManager` (`src/shared/lib/cacheManager.ts`), consumed by the hook `useCachedData` (`src/shared/hooks/useCachedData.ts`).

### `useCachedData` behavior — stale-while-revalidate + keepPreviousData

1. Check `dataCacheManager` synchronously.
2. **Fresh & cached** (< `staleTime`) → instant render, no skeleton.
3. **Stale but cached** → render cached data now, refresh in the background (`isFetching = true`, shimmer line).
4. **Cache miss** → if `keepPreviousData`, render the last data with a shimmer; else `isLoading = true` → Tier 2 skeleton.
5. **Error entry** → `isError = true` → themed retry block (never an endless spinner).

> Implementation note: `useCachedData` commits the last successful entry **inside the store-notification callback**, never with a guarded `setState` during render — `setState` in the render body loops under the React Compiler.

### Canonical data-section pattern
```tsx
import { useCachedData } from '@/shared/hooks/useCachedData';

export const MyDataSection: React.FC<{ filters: MyFilters }> = ({ filters }) => {
  const { data, isLoading, isFetching, isError, error, refetch } = useCachedData(
    ['my-feature-key', filters],      // deterministic, full-filter key
    async () => fetchMyData(filters),
    { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000, keepPreviousData: true }
  );

  if (isLoading) return <CatalogGridSkeleton count={6} />;
  if (isError)   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((item) => <CourseCard key={item.id} course={item} layout="desktop" />)}
    </div>
  );
};
```

### Cache API
- `dataCacheManager.set(key, data)` — optimistic update / mutation result.
- `dataCacheManager.invalidate('catalog-items')` — marks every `['catalog-items', …]` variant stale (namespace-token matching).
- `dataCacheManager.prefetch(['catalog-detail', id], fetcher)` — warm the cache on hover for instant detail navigation.
- `dataCacheManager.clear()` — logout / hard reset.

### Cache keys in use
- Catalog items: `['catalog-items', filters]`; detail: `['catalog-detail', slug]`; prefetch on card hover.
- Course detail: `['course-detail', slug]`; problems: `['course-problems']`.
- Dashboard sections are namespace-prefixed: `['dashboard', 'stats']`, `['dashboard', 'upcoming-events']`, `['dashboard', 'courses-list']`, `['dashboard', 'competitions']`, `['dashboard', 'certificates']`, `['dashboard', 'saved-scholarships']`, `['dashboard', 'favorite-courses']`, `['dashboard', 'notifications-view']`, `['dashboard', 'notifications-drawer']`.

**Key rule:** a cache key is deterministic and contains the full filter set. If two different filter combinations map to the same key, one of them will serve wrong data.

---

## 5. The Celestial Motion System

All keyframes and motion utilities live in the **"Celestial Motion System"** section of `frontend/src/styles/globals.css`, declared as Tailwind v4 `@utility` classes so variants (`hover:`, `group-hover:`) compose.

**Rule: every motion is transform and/or opacity only (GPU-cheap).** Never animate `width`, `height`, `top`, `margin`, or `gap` — except the established width transitions (`.dash-sidebar-rail`, `.dash-nav-label`).

### 5.1 Primitives

| Keyframe | Utility | Purpose |
| :--- | :--- | :--- |
| `pop-in` | `.animate-pop-in` | Springy entrance: scale 0.6 → 1.06 → 1 + rise. Cards, rows, badges, modal panels. |
| `float-y` | `.animate-float` / `.animate-float-slow` | Gentle ambient bobbing (emblems, empty-state compass). |
| `wiggle` | `.animate-wiggle` | One-shot playful icon jiggle (rotate ±10°). |
| `bell-ring` | `.animate-bell-ring` | Notification bell swing (pivot top-center). |
| `star-twinkle` | `.animate-star-twinkle` | Twinkling dot (opacity 0.25 → 1 + scale). |
| `shine-sweep` | used by `::after` rules | Light beam crossing a CTA on hover. |
| `fadeInUp` / `fadeInDown` | `.animate-fade-in-up` / `.animate-fade-in-down` | Section/page entrance drifts. |
| `orbit-slow` / `counter-orbit-slow` | `.animate-orbit-slow` / `.animate-counter-orbit-slow` | 60s / 45s orbiting rings. |
| `shimmer-sweep` | `.animate-shimmer` | Celestial shimmer sweep. |
| `celestial-pulse`, `radar-ping` | `.animate-celestial-pulse`, `.animate-radar-ping` | Ambient pulse and ping. |
| `fadeIn` | `.animate-fade-in` | Entrance for modals, toasts, data sections that mount after a cache hit. |

`@apply` **cannot** consume these helpers (they are plain global classes / `@utility`; `@apply` accepts real Tailwind utilities only). Put them in the JSX `className`, or mirror one with a raw `animation:` line inside a feature CSS class.

### 5.2 Staggered entrance cascades
Lists and card grids enter as a cascade with an inline `animationDelay`, kept on the element that carries `animate-pop-in`:
```tsx
<div className="dash-row animate-pop-in" style={{ animationDelay: `${index * 70}ms` }}>
```
Use `index * 70` for rows/cards, `* 60` for tighter lists, `* 90`–`* 100` for large cards. Section entrances already use `animate-fade-in-up animation-delay-100` — do not stack more motion on top.

### 5.3 The fill-mode caveat (critical)
`animate-pop-in` / `animate-fade-in-*` use `animation-fill-mode: both`, so the finished animation **leaves a `transform` on the element**:

1. **Hover/active transforms on the same element are dead** — `class="card animate-pop-in hover:scale-105"` will not scale.
2. **A filled `transform` blocks `position: fixed` descendants** (it creates a containing block). That is why the dashboard sidebar is `sticky`, never `fixed`.

Workarounds used across the app: put the hover transform on a **child** element (keep `group` in the JSX), or animate non-transform props on the animated element (outline color, box-shadow, brightness).

### 5.4 Hover micro-interactions (the standard set)

| Interaction | Pattern |
| :--- | :--- |
| Icon lift + tint | parent `:hover` targets the icon child (`text-blue-400 -translate-y-0.5 scale-110`). |
| Icon tilt | `rotate-12 scale-110` on hover. |
| Press feedback | `active:scale-95` on every clickable button/pill. |
| Card raise | `hover:border-sky-400/40 hover:brightness-110` + shadow lift — never scale a card that carries an entrance animation. |
| Bell swing | `.dash-bell:hover > svg { animation: bell-ring …; transform-origin: top center; }` |
| Shine sweep | `::after` beam on primary gold/blue CTAs. |

### 5.5 CTA motion — shine sweep & attention halo
- **Gold CTA shine** (`.btn-gold`): `position: relative; overflow: hidden`; a `::after` beam parked off-canvas runs `shine-sweep 0.7s` on hover.
- **Blue CTAs** share the beam via a combined rule in `dashboard.css` (`.dash-cta-blue::after`, `.dash-course-action-active::after`). Any primary blue-gradient action joining this family declares `relative overflow-hidden` and adds itself to the `::after` selector list.
- **Attention halo** (`.btn-attention` + `cta-halo`): an animated golden `box-shadow` pulse. Exactly **one** hero CTA per screen gets it — never sprinkle it.

### 5.6 Sliding-switch motion
`SlidingSegmentedControl` (`src/shared/components/Controls/SlidingSegmentedControl.tsx`) is **the** shared side-by-side switch — the same spring-glide puck as the home search bar.

- API: `options={[{ id, label }]} value={id} onChange={fn} tone="blue" | "gold"`, optional `className`, `aria-label`.
- RTL-safe: the puck sits inside an absolute track and translates by `translateX(-${activeIndex * 100}%)` with a 400ms overshoot spring.
- **Use it for every side-by-side toggle**: dashboard sub-nav, enrolled filters, saved-scholarship tabs, competition filters, profile learning level. Never hand-roll a different switch.

### 5.7 Countdown motion
`useCountdown` (`src/shared/hooks/useCountdown.ts`) + `CountdownDigits` (`src/shared/components/Banners/CountdownDigits.tsx`) render the live challenge deadline (home competition banner + dashboard `ChallengeSpotlightCard`).

---

## 6. Motion checklist

- [ ] Motion is transform/opacity only; no width/height animation unless it is an established expanded-rail/label reveal.
- [ ] Entrances use `animate-pop-in` + staggered `animationDelay`; no manual keyframes in feature CSS unless mirroring a global primitive.
- [ ] The fill-mode caveat is respected: hover/active transforms live on children; no `fixed` descendants under an animated element.
- [ ] Every side-by-side toggle is a `SlidingSegmentedControl`.
- [ ] At most one `.btn-attention` halo per screen; shine sweeps only on primary gold/blue CTAs.
- [ ] No new keyframes in feature CSS for shared motion; extend `globals.css` (2+ features) or mirror the global keyframe.
- [ ] `prefers-reduced-motion` is left to the global media query.
