---
name: seo-on-page-content
description: On-page SEO and content - search intent and keyword research, title tags, meta descriptions, headings, URL slugs, content quality and E-E-A-T, topic clusters and internal linking, image SEO (alt, file names), Open Graph and Twitter cards, per-route metadata in apps, breadcrumbs, content freshness, and avoiding thin or duplicate content. Use when writing or reviewing any public page, page template, blog, product, course, or landing page metadata and copy.
---

# On-page SEO & Content

Rank by being the **best answer to a specific search intent**, presented clearly to people and machines.

## 1. Intent and keyword research

- Group queries by **intent**: informational ("how to learn python"), navigational (brand), commercial investigation ("best python course"), transactional ("buy/enroll/book ...").
- One primary topic/intent per page; do not make two pages compete for the same query (cannibalization). Merge or differentiate them.
- Sources: Search Console queries, autocomplete/"People also ask", competitor pages, support tickets, internal search logs, keyword tools. Research in the **user's language** and dialect ([`seo-international-arabic-rtl`](../seo-international-arabic-rtl/SKILL.md)).
- Prefer specific, achievable long-tail topics first; map each target keyword to exactly one URL.

## 2. Title tag

- Unique per URL; primary keyword/topic early; human-readable; brand last ("Python for Teens - Live Online Course | Brand").
- Aim for roughly 50-60 characters (display truncates by pixel width; keep key words first). Search engines may rewrite titles; a good title still wins.
- Do not stuff keywords or repeat the same title site-wide.

## 3. Meta description

- Unique, ~120-160 characters, summarizing the page with a benefit and a reason to click (CTA wording ok).
- Not a direct ranking factor, but it drives click-through; engines may substitute a snippet from the page. `meta keywords` is ignored - do not use it.

## 4. Headings and body

- **One `<h1>`** that states the page topic (can differ slightly from the title); logical `h2`/`h3` hierarchy that outlines the page; headings describe content, not styling.
- Lead with the answer; short paragraphs; lists, tables, and images that help; match the depth of top results for the intent.
- Natural language and synonyms, not repetition; include the primary term in H1, intro, and where it fits naturally.
- Add FAQs only when real questions exist (and keep them visible on the page).

## 5. URL slugs

Short, lowercase, hyphenated, descriptive, stable: `/courses/python-basics`, not `/p?id=482` or `/Courses/Python_Basics_FINAL`. Do not change slugs without 301s. For Arabic sites choose Arabic or transliterated slugs deliberately and consistently ([`seo-international-arabic-rtl`](../seo-international-arabic-rtl/SKILL.md) §4).

## 6. Internal linking

- Link related pages with **descriptive anchor text** ("Python course for teens", not "click here").
- Hub-and-spoke: a pillar page links to detailed cluster pages and each cluster links back and across.
- Contextual links in body copy carry more weight than footers; breadcrumbs reinforce hierarchy (`BreadcrumbList`, [`seo-structured-data`](../seo-structured-data/SKILL.md)).
- Every important page gets links from several relevant pages; find orphans with a crawler; fix broken links; avoid pointing links at redirected URLs.
- Links are real `<a href>` elements ([`seo-technical`](../seo-technical/SKILL.md) §9).

## 7. Content quality and E-E-A-T

- **Helpful, original, people-first** content with experience and expertise: real authors with bios and credentials, first-hand examples, data, screenshots, sources, updated dates, transparent business details (about, contact, policies).
- Avoid thin pages, doorway pages, scraped/spun/auto-generated filler, and near-duplicates (consolidate or canonicalize).
- Health, finance, and safety topics ("your money or your life") demand extra accuracy and expert review.
- Refresh content that is outdated; show a real "last updated" date only when meaningful changes were made.

## 8. Images and media

- Descriptive file names (`grilled-sea-bass.jpg`), meaningful `alt`, captions where useful, images in HTML `<img>`/`<picture>` (not only CSS backgrounds), compressed and sized ([`design-imagery-and-media`](../design-imagery-and-media/SKILL.md)).
- Video: transcript/captions, `VideoObject` markup, thumbnail, host so it is indexable.

## 9. Social and sharing metadata

```html
<meta property="og:type" content="website">
<meta property="og:title" content="Python for Teens - Live Online Course">
<meta property="og:description" content="12 weeks of live mentoring...">
<meta property="og:image" content="https://www.example.com/og/python.png">  <!-- 1200x630 -->
<meta property="og:url" content="https://www.example.com/courses/python-basics">
<meta property="og:locale" content="ar_AR">
<meta name="twitter:card" content="summary_large_image">
```
Social crawlers usually do **not** run JavaScript: OG tags must be present in the initial HTML ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

## 10. Per-route metadata in apps

Metadata is **data on the route/entity**, not hard-coded in components: each route entry (or CMS record) carries `title`, `description`, `canonical`, `ogImage`, `robots`, and `structuredData`; the layout writes them into the document head. Dynamic pages (product, course, article) build them from the record. Unique values for every URL; tests assert none are missing ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md) §10).

## 11. Page-type templates

| Page | Title pattern | H1 | Must have |
| --- | --- | --- | --- |
| Home | Brand - what you do | the promise | clear intro, links to key sections, Organization data |
| Category/listing | Category - qualifier \| Brand | Category name | intro copy, filters crawlable per rules, links to items |
| Detail (product/course) | Name - key attribute \| Brand | Name | unique description, price/availability, reviews, structured data |
| Article | Headline \| Brand | Headline | author, date, TOC, related links, Article data |
| Local/branch | Service in City \| Brand | Service in City | NAP, hours, map, local data |

## 12. Checklist

- [ ] One intent and primary keyword per URL; no cannibalization.
- [ ] Unique title (~50-60), description (~120-160), single H1, logical headings.
- [ ] Clean descriptive slugs; internal links with descriptive anchors; no orphans.
- [ ] Original, expert, up-to-date content; no thin/duplicate pages.
- [ ] Images with alt/file names; OG/Twitter tags in the initial HTML.
- [ ] Metadata driven from route/entity data with tests.
