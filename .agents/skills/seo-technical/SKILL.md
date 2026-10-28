---
name: seo-technical
description: Technical SEO foundations for any website - crawlability and indexability, robots.txt vs noindex, XML sitemaps, canonical URLs, HTTP status codes and redirects, soft 404s, HTTPS and host/trailing-slash consistency, mobile-first parity, URL structure, pagination and faceted navigation, internal link crawl paths, page speed and Core Web Vitals, security headers, staging protection, and AI/bot crawler policy. Use when launching or restructuring a site, setting up hosting/redirects, or diagnosing pages that are not indexed.
---

# Technical SEO

If search engines cannot **crawl, render, and index** a page, nothing else matters. Content and links decide how it ranks; technical SEO decides whether it is eligible.

## 1. Crawl vs index (do not confuse them)

| Tool | Controls | Notes |
| --- | --- | --- |
| `robots.txt` | **crawling** (what bots may fetch) | does **not** remove a page from the index; a blocked URL can still be indexed from links without content |
| `<meta name="robots" content="noindex">` or `X-Robots-Tag: noindex` | **indexing** | the page must be **crawlable** or the directive is never seen; use the header for PDFs/images |
| `rel="canonical"` | which duplicate to index | a hint, not a command |
| Redirect (301/308) | permanent move, consolidates signals | strongest consolidation signal |
| 404/410 | removed | 410 = gone on purpose |

Never block CSS/JS/API endpoints the page needs to render. Never use robots.txt to hide sensitive data.

## 2. robots.txt

```
User-agent: *
Disallow: /admin/
Disallow: /cart
Disallow: /search?
Allow: /

Sitemap: https://www.example.com/sitemap.xml
```
Keep it short; test it; a stray `Disallow: /` on production is a classic launch disaster. Decide an explicit policy for AI/LLM crawlers (allow or disallow per user-agent) as a business choice.

## 3. XML sitemaps

- List **only canonical, indexable, 200-status URLs**. Max 50,000 URLs or 50 MB (uncompressed) per file; use a **sitemap index** to split (by type: pages, products, articles, images).
- `lastmod` = real last significant change (Google uses it when consistently accurate; `priority`/`changefreq` are ignored).
- Generate automatically from the database/route table; reference in `robots.txt`; submit in Search Console.
- Include hreflang alternates in the sitemap for multilingual sites ([`seo-international-arabic-rtl`](../seo-international-arabic-rtl/SKILL.md)).

## 4. Canonicalization

- Each content has **one preferred URL**; every page carries a **self-referencing absolute canonical** (`<link rel="canonical" href="https://www.example.com/path">`).
- Normalize: one protocol (HTTPS), one host (www or apex), consistent trailing slash, lowercase paths, no session IDs; redirect variants to the canonical.
- Parameters (tracking, sort, filters): canonicalize to the clean URL or block pointless combinations (see §8).
- Variants (colors/sizes) usually canonical to the main product unless they are truly distinct, searched-for pages.

## 5. Status codes and redirects

| Situation | Response |
| --- | --- |
| normal page | 200 |
| permanently moved | **301/308** to the final URL (no chains: A->B->C; no loops) |
| temporary | 302/307 |
| not found | **real 404** (with a helpful page) |
| permanently removed | 404 or 410 |
| server trouble | 503 + `Retry-After` for maintenance |

**Soft 404s** (a "not found" page returning 200) waste crawl budget and confuse indexing; in SPAs return a real 404 from the server/edge or add `noindex` ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)). Keep a redirect map when URLs change; update internal links to the new URLs.

## 6. HTTPS, hosts, headers

HTTPS everywhere with HSTS; redirect HTTP->HTTPS and non-preferred host->preferred in **one hop**; no mixed content; valid certificate and renewal monitoring; compress (brotli/gzip); sensible caching ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)).

## 7. Mobile-first parity

Google indexes the **mobile version**. Mobile must contain the same primary content, structured data, meta tags, internal links, and images (with alt) as desktop; do not hide key content behind interactions that bots cannot trigger; do not lazy-load content on scroll events only (use IntersectionObserver/native lazy loading so it is discoverable).

## 8. URLs, pagination, facets

- URLs: short, lowercase, hyphen-separated, descriptive, stable (`/courses/python-basics`); avoid IDs and long query strings for content pages.
- **Pagination:** each page crawlable via real `<a href>` links, self-canonical, unique title suffix ("Page 2"); do not canonicalize all pages to page 1; Google no longer uses `rel=prev/next`.
- **Faceted navigation (filters/sort):** allow indexing only for combinations with search demand (and unique content); others: `noindex,follow`, canonical to the base, or block parameter crawling; never create infinite crawl spaces (calendars, endless filter combos).
- Internal search results pages: `noindex`.

## 9. Internal linking and crawl paths

Every important page is reachable within ~3 clicks via **real anchor links** (not click handlers or `javascript:` links); use breadcrumbs, hub pages, related links; fix orphan pages; avoid link chains through redirects; footer/nav links go to canonical URLs. Details: [`seo-on-page-content`](../seo-on-page-content/SKILL.md) §6.

## 10. Speed and experience signals

Core Web Vitals, HTTPS, no intrusive interstitials, mobile-friendly layout ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)). TTFB and server stability affect crawl rate too ([`perf-backend-speed`](../perf-backend-speed/SKILL.md)).

## 11. Staging, previews, and launch safety

- Staging/preview environments: `noindex` via `X-Robots-Tag` **and** authentication (basic auth); never rely on robots.txt alone.
- Launch checklist: remove `noindex`, production robots.txt, sitemap live, canonicals point to production host, redirects from the old site tested, analytics/Search Console verified.
- CI guard: fail the build if production config ships `noindex`, a blocking robots rule, or missing canonicals ([`seo-audit-and-monitoring`](../seo-audit-and-monitoring/SKILL.md)).

## 12. Misc technical details

- `<html lang>` set; `<meta charset>`; viewport tag; unique `<title>` per URL.
- `hreflang` for localized versions; `link rel="alternate"` for feeds.
- Images/video discoverable in HTML (not only CSS backgrounds); video sitemap/`VideoObject` where relevant.
- JavaScript SEO: see [`seo-spa-rendering`](../seo-spa-rendering/SKILL.md).

## 13. Checklist

- [ ] robots.txt correct and not blocking needed resources; sitemap clean and submitted.
- [ ] One canonical URL per page; HTTPS/host/trailing slash consistent; no redirect chains.
- [ ] Real 404s (no soft 404); permanent moves are 301/308.
- [ ] Mobile parity; crawlable pagination; controlled faceted navigation.
- [ ] Important pages within 3 links via real anchors; no orphans.
- [ ] Staging protected; launch and CI guards in place.
