---
name: seo-spa-rendering
description: SEO for single-page apps and JavaScript-heavy sites (React/Vite, Vue, Angular) - how search engines and social crawlers render JavaScript, choosing SSR, SSG, prerendering, or client-only per page type, per-route titles/meta/canonical, real 404 status for unknown routes, crawlable links and History API routing, structured data and Open Graph in the initial HTML, hydration and performance, and verification. Use when the site is a SPA, when pages are not indexed or previews look empty, or when choosing a rendering strategy.
---

# SEO for SPAs and JavaScript Sites

A client-only SPA ships an almost-empty HTML shell. Google can render JavaScript, but later and less reliably, and many other crawlers (social previews, some search and AI bots) **do not execute JS at all**. Put what matters in the **initial HTML**.

## 1. How crawlers see your page

| Crawler | Executes JS? | Consequence |
| --- | --- | --- |
| Googlebot | yes (evergreen Chromium), queued after the HTML crawl | delayed indexing, render budget, errors can hide content |
| Bing | partially | prefer HTML |
| Facebook/WhatsApp/X/LinkedIn/Slack preview bots | **no** | OG/Twitter tags must be in the initial HTML |
| Many AI/LLM and SEO tools | often no | content invisible if JS-only |

Test what bots get: `curl -s URL | grep -i "<title>"`, URL Inspection -> "View crawled page" in Search Console, and a JS-disabled view.

## 2. Choose a rendering strategy per page type

| Page type | Best | Why |
| --- | --- | --- |
| Marketing, landing, blog, docs, course/product detail, category | **SSG** (build-time) or **SSR/ISR** | public, SEO-critical, cacheable |
| Pages with frequently changing data but public | **SSR + caching** or ISR/stale-while-revalidate at the CDN | fresh yet fast |
| Logged-in dashboards, editors, carts | **client-only SPA** | private, no SEO need (`noindex`) |
| Existing Vite/CRA SPA, limited budget | **prerender** the public routes at build (e.g. a prerender plugin/service) | HTML per route without a rewrite |

Frameworks that do SSR/SSG for you: Next.js, Nuxt, Remix/React Router framework mode, Astro, SvelteKit. "Dynamic rendering" (serving bots a different snapshot) is a workaround Google does not recommend long-term; prefer real SSR/SSG/prerender.

A hybrid is normal: public pages prerendered/SSR, app areas client-rendered, same codebase.

## 3. Per-route metadata (the minimum for any SPA)

Every public route outputs, **in the HTML the server returns**: unique `<title>`, meta description, canonical, `lang`/`dir`, Open Graph/Twitter tags, robots, and JSON-LD ([`seo-on-page-content`](../seo-on-page-content/SKILL.md) §10, [`seo-structured-data`](../seo-structured-data/SKILL.md)). Setting them only with client JS (react-helmet/`document.title`) helps Google eventually but **not** social previews or non-rendering bots.

With prerendering/SSR, the route table or entity data supplies the values; one function builds the head for both server and client so they cannot diverge.

## 4. Real status codes (no soft 404s)

An SPA that serves `index.html` with 200 for every unknown URL creates soft 404s. Fix at the host/edge:
- Serve **404** for unknown public routes (SSR/prerender knows the route table; or an edge function checks the route list/data).
- If the status cannot be controlled, render a not-found view with `<meta name="robots" content="noindex">` and a link home.
- Redirects as real **301/308** at the host (not only client-side `<Navigate>`); client redirects are a fallback ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md) §3).
- Static assets that do not exist must 404, not return `index.html`.

## 5. Crawlable navigation

- Use real **`<a href="/path">`** links; the router intercepts clicks. Never `onClick`-only navigation or `javascript:` hrefs.
- Use **History API (clean paths)**, not hash fragments (`/#/courses`), which Google does not treat as separate pages.
- Pagination and "load more" must have link-based fallbacks; infinite scroll needs paginated URLs.
- Content behind tabs/accordions is fine if it is in the DOM on load; content fetched only after a user click may not be indexed.

## 6. Content must exist without interaction

Primary text, headings, product data, and internal links render without requiring scroll/click/hover events; lazy-load images with native `loading="lazy"` (not scroll-event hacks) ([`design-imagery-and-media`](../design-imagery-and-media/SKILL.md)); do not block rendering on a failed API call - SSR/prerender data fetching needs error handling and timeouts ([`core-error-handling`](../core-error-handling/SKILL.md)).

## 7. Performance with SSR/hydration

SSR improves first paint but can hurt INP if hydration is heavy: split chunks per route, hydrate islands/progressively where the framework supports it, avoid hydrating static content, stream HTML, cache SSR output at the CDN ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)), keep third-party scripts off the critical path ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)). Avoid hydration mismatches (render the same HTML on server and client).

## 8. Sitemaps and discovery

Generate the sitemap from the same route table/database as the prerender list; include dynamic detail pages (products, courses, articles); submit it; internal links make discovery reliable ([`seo-technical`](../seo-technical/SKILL.md) §3).

## 9. Migrating a client-only SPA (practical path)

1. Inventory public routes and SEO value; keep private ones client-only.
2. Add per-route head data and structured-data builders from the route table/entities.
3. Prerender/SSR public routes; confirm HTML contains title, content, canonical, OG, JSON-LD.
4. Implement real 404 + 301s at the host; fix soft 404s.
5. Replace click handlers/hash routes with real links.
6. Submit sitemap; monitor indexing and Core Web Vitals; compare impressions before/after.

## 10. Verify

- [ ] `curl` of each public route shows the right title, description, canonical, OG, and visible content.
- [ ] Unknown URL returns 404; moved URL returns 301; assets 404 correctly.
- [ ] Search Console URL Inspection shows rendered content and links; no "Crawled - currently not indexed" patterns from thin shells.
- [ ] Social share debugger shows the right preview; JS-disabled view is meaningful.
- [ ] Private pages are `noindex`/blocked from sitemaps.
