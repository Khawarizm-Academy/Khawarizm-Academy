---
name: perf-frontend-web-vitals
description: Frontend performance and Core Web Vitals - LCP, INP, CLS targets, performance budgets, route-level code splitting, tree-shaking, image and font optimization, critical rendering path, preload/preconnect/fetchpriority, third-party script control, render performance in React (memoization, virtualization, avoiding re-renders), caching and compression, and measuring with Lighthouse and field data (RUM). Use when pages are slow, before launch, when adding libraries or media, or when SEO and conversion depend on speed.
---

# Frontend Performance & Core Web Vitals

Speed is a feature and a ranking/conversion factor. **Measure first, fix the biggest cost, measure again.**

## 1. Targets (75th percentile of real users)

| Metric | Good | What it measures |
| --- | --- | --- |
| **LCP** Largest Contentful Paint | <= 2.5 s | when the main content appears |
| **INP** Interaction to Next Paint | <= 200 ms | responsiveness to clicks/taps/keys |
| **CLS** Cumulative Layout Shift | <= 0.1 | visual stability |
| TTFB (supporting) | <= ~0.8 s | server + network start |

Set budgets in the project profile: JS per route (e.g. initial route JS gzip under ~170 KB as a starting point), image weight, request count. Enforce in CI ([`fe-testing-and-visual-qa`](../fe-testing-and-visual-qa/SKILL.md) §6).

## 2. Measure

- Lab: Lighthouse, WebPageTest, Chrome DevTools Performance panel (throttle CPU 4x and "Fast 3G"/"Slow 4G").
- **Field data (real users):** `web-vitals` library -> your analytics; CrUX/Search Console Core Web Vitals report. Lab numbers guide fixes; field numbers decide success.
- Bundle: visualize with `rollup-plugin-visualizer`/`source-map-explorer`/`next build` analyzer.

## 3. JavaScript: ship less

1. **Route-level code splitting** (`React.lazy` + dynamic import): one chunk per page; the shell stays in the main chunk.
2. **Split heavy widgets** (charts, editors, maps, 3D, video players) and load on demand/visibility ([`design-3d-web`](../design-3d-web/SKILL.md)).
3. **Tree-shake:** import named functions (`import debounce from 'lodash/debounce'` or use native), avoid whole-library imports and barrel files that defeat shaking.
4. Replace heavy dependencies with small/native ones; check size before adding (bundlephobia-style).
5. Modern build target; drop polyfills you do not need; minify; enable gzip/brotli.
6. Defer non-critical work: `requestIdleCallback`, `import()` after first paint.
7. **Third-party scripts** (analytics, chat, ads, A/B): load `async`/`defer`, after interaction or idle, behind a consent gate; audit their cost regularly.

## 4. Images and media (usually the biggest LCP lever)

- Modern formats (AVIF/WebP), responsive `srcset`/`sizes`, exact dimensions or `aspect-ratio`.
- The LCP image: **not** lazy-loaded, `fetchpriority="high"`, preloaded if discovered late, served from the CDN.
- Everything below the fold: `loading="lazy"` and `decoding="async"`.
- Video: poster image, `preload="none"`/`metadata`, no autoplay of heavy video on mobile; prefer adaptive streaming ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)).
- Details: [`design-imagery-and-media`](../design-imagery-and-media/SKILL.md).

## 5. Fonts

- Self-host, **subset** (include only needed glyph ranges, Arabic + Latin subsets), WOFF2, 1-2 families, 2-3 weights, or a variable font.
- `font-display: swap` (or `optional` for non-critical); preload the one critical file; set `size-adjust`/fallback metrics to limit shift.
- No icon fonts: use inline SVG ([`design-shapes-svg-and-iconography`](../design-shapes-svg-and-iconography/SKILL.md)).

## 6. Critical rendering path

- Inline critical CSS only if measured to help; otherwise a single small CSS file.
- `preconnect` to critical third-party origins (API, CDN, font host); `dns-prefetch` for the rest; `preload` the LCP image/font; `modulepreload` the entry chunk.
- Avoid render-blocking scripts; `defer` by default.
- Do not block first paint on client data: show the shell + skeleton immediately ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)); consider SSR/SSG/prerender for public pages ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

## 7. CLS: stop layout shifts

Reserve space (`width`/`height`/`aspect-ratio`) for images, video, ads, embeds, and async content; skeletons match final dimensions; avoid inserting banners above existing content; animate `transform`/`opacity`, not layout properties; keep font swap shift small.

## 8. INP: keep the main thread free

- Break up long tasks (> 50 ms): chunk work, `scheduler.yield()`/`setTimeout(0)`, move heavy compute to a Web Worker.
- Debounce/throttle scroll, resize, and input handlers; use passive listeners.
- Avoid forcing layout in loops (read then write; batch DOM reads/writes).
- React: avoid re-render storms ([§9](#9-react-render-performance)); keep event handlers cheap; show immediate visual feedback, then do the heavy work.

## 9. React render performance

- Keep state local and low; lift only when needed; split big contexts by concern so a change does not re-render everything.
- `useMemo`/`useCallback`/`React.memo` **after measuring** with the Profiler; stable keys; no inline object/array props to memoized children in hot paths.
- **Virtualize** long lists/tables (`react-window`, `@tanstack/virtual`); paginate or infinite-load.
- `useTransition`/`useDeferredValue` for expensive filtered views; concurrent features instead of manual debouncing where suitable.
- Avoid `useEffect` for derived data; compute in render.
- Do not render hidden heavy trees (tabs, modals) until opened.

## 10. Network and caching

HTTP caching for assets and API ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)), HTTP/2 or HTTP/3 via the CDN, brotli, a client cache with prefetch ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)), prefetch likely next routes on hover/idle, service worker only when offline support is a real requirement.

## 11. Animations and effects

Animate `transform`/`opacity` only; use `will-change` sparingly and temporarily; pause off-screen/looping animations; cap canvas/WebGL pixel ratio; honor reduced motion ([`design-motion-implementation`](../design-motion-implementation/SKILL.md)).

## 12. Checklist

- [ ] LCP/INP/CLS measured in lab and field; budgets set and enforced.
- [ ] Route-level splitting; heavy widgets lazy; third-party scripts deferred and audited.
- [ ] LCP image prioritized and not lazy; images responsive, modern, dimensioned.
- [ ] Fonts self-hosted, subset, `swap`, one preloaded.
- [ ] No layout shift sources; long tasks broken up; lists virtualized.
- [ ] Caching and compression verified; regression guard in CI.
