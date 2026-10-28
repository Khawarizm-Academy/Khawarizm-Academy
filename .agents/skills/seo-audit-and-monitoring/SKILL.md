---
name: seo-audit-and-monitoring
description: SEO audit and ongoing monitoring - a prioritized audit checklist (indexing, technical, content, links, speed, structured data), Google Search Console and Bing Webmaster Tools workflow, crawling tools, log checks, Core Web Vitals field data, CI regression tests for titles, canonicals, robots and noindex, a monthly review routine, and common failure diagnoses (not indexed, dropped traffic, duplicate pages). Use when auditing a site, launching or migrating, setting up SEO tooling, or investigating a traffic drop.
---

# SEO Audit & Monitoring

SEO is a feedback loop: **measure -> diagnose -> fix -> verify**. Automate checks so regressions never reach production.

## 1. Tools

| Tool | Use |
| --- | --- |
| **Google Search Console** | indexing status, queries/clicks/impressions, Core Web Vitals (field data), sitemaps, URL Inspection, manual actions, enhancements (structured data) |
| **Bing Webmaster Tools** | Bing/Yahoo/DuckDuckGo traffic, extra diagnostics |
| **Crawler** (Screaming Frog, Sitebulb, or an open-source crawler) | status codes, titles, canonicals, redirects, orphans, hreflang |
| **Lighthouse / PageSpeed / WebPageTest** | lab performance and SEO basics |
| **Rich Results Test / Schema validator** | structured data |
| **Analytics** | organic landing pages, conversions, engagement |
| **Server logs / CDN logs** | what bots actually crawl, status codes, crawl waste |

## 2. Audit checklist (in priority order)

**1. Indexing and access**
- [ ] Production is not `noindex`/blocked; robots.txt sane; sitemap submitted and accepted.
- [ ] Important pages return 200, are indexable, and appear in "Indexed" in Search Console; investigate "Crawled - currently not indexed", "Discovered - currently not indexed", "Duplicate without user-selected canonical", "Soft 404", "Blocked by robots".
- [ ] Rendered HTML contains the content (URL Inspection -> view crawled page) ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

**2. Technical** ([`seo-technical`](../seo-technical/SKILL.md))
- [ ] Single canonical host/protocol; no redirect chains or loops; real 404s; no soft 404s.
- [ ] Canonicals correct and self-referencing; pagination/facets controlled; hreflang valid.
- [ ] Mobile parity; HTTPS everywhere; no mixed content.

**3. On-page** ([`seo-on-page-content`](../seo-on-page-content/SKILL.md))
- [ ] Unique titles/descriptions, one H1, logical headings; no duplicate or missing metadata.
- [ ] One intent per URL; no cannibalization; thin/duplicate pages consolidated.
- [ ] Image alt text and sizes; internal links with descriptive anchors; no orphans or broken links.

**4. Structured data** ([`seo-structured-data`](../seo-structured-data/SKILL.md))
- [ ] Valid, matches visible content; no errors in Enhancements reports.

**5. Experience** ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md))
- [ ] Core Web Vitals pass in field data for key templates; no intrusive interstitials; mobile usable.

**6. Authority**
- [ ] Reasonable backlink profile; no spammy links; brand mentions; earn links with useful assets.

## 3. Search Console workflow (weekly/monthly)

1. **Performance**: compare periods; filter by page/query/country/device; find pages with high impressions and low CTR (improve title/description) and positions 8-20 (strengthen content/internal links).
2. **Indexing -> Pages**: review reasons for non-indexed URLs; confirm they are expected; fix unexpected ones and use "Validate fix".
3. **Sitemaps**: submitted vs indexed counts per sitemap/type.
4. **Core Web Vitals / Page experience**: URL groups failing LCP/INP/CLS -> fix the template.
5. **Enhancements**: structured data errors/warnings.
6. **Security & manual actions**: must be empty.
7. **Links**: top linking sites, top linked pages, internal link distribution.

## 4. CI regression tests (cheap and powerful)

Run against the built/prerendered output or a preview URL on every deploy:
- Every public route has a **unique non-empty title**, description, **canonical**, and exactly one H1.
- No `noindex` or blocking robots rule on production builds; **staging is noindex**.
- Sitemap contains only 200, indexable, canonical URLs; counts within expected ranges.
- No redirect chains; known-moved URLs return 301 to the right target; unknown URL returns 404.
- JSON-LD parses and has required fields; OG tags exist in the initial HTML.
- hreflang reciprocal for every localized pair.
- Lighthouse CI budgets for LCP/CLS/TBT on key templates.
See [`ops-deployment-and-ci`](../ops-deployment-and-ci/SKILL.md) and [`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md).

## 5. Diagnosing common problems

| Symptom | Likely causes -> checks |
| --- | --- |
| New pages not indexed | no internal links, not in sitemap, blocked, thin/duplicate, JS-only content, low crawl demand -> link from hubs, submit, inspect rendered HTML, improve uniqueness |
| "Crawled - currently not indexed" | low perceived value/duplicate -> improve content, consolidate, strengthen internal links |
| Sudden traffic drop | migration/redirect errors, `noindex`/robots change, canonical change, server errors, algorithm update, lost links -> check deploy log, Search Console crawl errors, robots/canonical diffs, compare to update dates |
| Wrong page ranks for a query | cannibalization -> merge/differentiate, adjust internal anchors |
| Wrong language shown | hreflang errors, auto-redirects -> fix reciprocity, remove IP redirects ([`seo-international-arabic-rtl`](../seo-international-arabic-rtl/SKILL.md)) |
| Rich results lost | markup mismatch/errors or policy change -> validate, compare to visible content |
| Slow indexing after changes | server slowness, crawl waste -> speed up TTFB, remove junk URLs, fix sitemaps |

## 6. Migration/launch protocol

Before: crawl the old site, map every URL to its new URL (301 map), preserve titles/content/structured data, keep the same URL structure where possible, plan the sitemap and robots, set up Search Console for the new property. At launch: verify redirects, canonicals, indexability, analytics; submit sitemaps. After: monitor crawl errors, indexing, rankings, and traffic daily for two weeks; keep redirects for at least a year.

## 7. Reporting

Report business KPIs (orders/bookings/sign-ups from organic), non-brand organic clicks, indexed pages vs expected, Core Web Vitals pass rate, top winners/losers, and the next three actions. Keep a changelog of SEO changes so cause and effect can be tied together.

## 8. Checklist

- [ ] Search Console and Bing verified; sitemaps submitted.
- [ ] Audit checklist run and findings prioritized (blockers first).
- [ ] CI SEO checks guard titles, canonicals, robots/noindex, sitemaps, schema, hreflang.
- [ ] Monthly review routine and a changelog exist.
