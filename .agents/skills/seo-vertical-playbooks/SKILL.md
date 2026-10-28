---
name: seo-vertical-playbooks
description: SEO playbooks by site type - e-commerce (category and product pages, faceted navigation, variants, out-of-stock handling, reviews, feeds), local and restaurant businesses (Google Business Profile, NAP, local pages, reviews, menus), blogs and content sites (topic clusters, pillar pages), SaaS (comparison and integration pages, docs), and education/course sites. Use when planning SEO for a specific kind of website or when asked how to rank a store, restaurant, clinic, blog, SaaS, or course platform.
---

# SEO Playbooks by Site Type

Apply [`seo-technical`](../seo-technical/SKILL.md), [`seo-on-page-content`](../seo-on-page-content/SKILL.md), and [`seo-structured-data`](../seo-structured-data/SKILL.md) first; then use the playbook for your vertical.

## E-commerce

**Architecture:** shallow, logical categories (home -> category -> subcategory -> product); every product linked from at least one category and from related-product modules; breadcrumbs.

**Category pages (usually the money pages):** unique H1 and a short helpful intro (not keyword stuffing), crawlable product links, filters that do not create endless URLs, pagination with self-canonicals and real links, internal links to subcategories and guides.

**Product pages:** unique descriptions (not manufacturer copy), specs, size/fit info, high-quality images with alt, price and availability visible, shipping/returns, reviews with `Product`/`Offer`/`AggregateRating` markup ([`seo-structured-data`](../seo-structured-data/SKILL.md) §3), clean slug, related products, FAQ from real questions.

**Faceted navigation:** index only facet combinations with demand and unique content (e.g. "black leather wallets"); others `noindex,follow` or canonical to the base; block parameter explosion in robots/URL parameter handling; never let sort/session parameters generate new indexable URLs.

**Variants:** one canonical product page with variant selection (color/size) unless variants are separately searched; reflect the selected variant in the URL only if it has its own canonical decision.

**Out of stock / discontinued:** temporarily out of stock: keep the page, mark availability `OutOfStock`, offer alerts/alternatives; permanently gone: 301 to the closest equivalent, else 404/410. Never leave thousands of empty "not available" pages.

**Feeds and surfaces:** keep a Merchant Center/product feed consistent with on-page price/stock; submit product sitemaps; image sitemaps if images drive traffic.

**Performance:** LCP product image, stable layout, fast filters ([`design-ecommerce`](../design-ecommerce/SKILL.md), [`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## Local businesses and restaurants

1. **Google Business Profile (GBP):** claim, verify, choose accurate primary + secondary categories, complete hours (including holidays), services/menu, attributes, photos (regularly), posts, booking/order links, Q&A; respond to every review.
2. **NAP consistency:** Name, Address, Phone identical across the website, GBP, social profiles, and directories; use a local phone number; keep it in HTML text, not an image.
3. **Website:** a page per location/branch (unique content, hours, map, parking, photos, staff), a page per core service/dish category, an indexable HTML menu ([`design-restaurants-and-food`](../design-restaurants-and-food/SKILL.md)), embedded map, click-to-call, `LocalBusiness`/`Restaurant` JSON-LD ([`seo-structured-data`](../seo-structured-data/SKILL.md) §5).
4. **Reviews:** ask satisfied customers (QR at the table/receipt/WhatsApp follow-up); never buy or fake reviews.
5. **Citations and links:** consistent listings in relevant local directories, local press/blogs, partnerships.
6. **Content:** neighborhood guides, events, seasonal offers, FAQs in local language/dialect.
7. **Mobile and speed:** most local searches are on phones; fast, tap-to-call/directions ([`design-mobile-first-and-touch`](../design-mobile-first-and-touch/SKILL.md)).
8. Track GBP insights (calls, direction requests) as the primary KPI, not only rankings.

## Blogs and content sites

- **Topic clusters:** a pillar page for each core topic plus detailed cluster articles linking both ways; interlink related posts contextually.
- Target one intent per article; refresh winners; consolidate or redirect thin/outdated posts; use author pages with credentials (E-E-A-T).
- Article markup, TOC, fast reading experience ([`design-website-types-playbook`](../design-website-types-playbook/SKILL.md)); category/tag pages only when they add value (otherwise `noindex`).
- Newsletter and social distribution; earn links with original data, tools, and guides.

## SaaS

- Pages that match buying intent: **use-case/solution pages**, **integration pages**, **comparison** ("X vs Y") and **alternatives** pages, pricing, templates, and glossary/educational content.
- Documentation indexable and well-linked; changelog; public status page; case studies with numbers.
- Product-led content (calculators, templates, free tools) earns links.
- App area behind login is `noindex`; marketing site on indexable, fast pages.

## Education and course platforms

- Indexable course catalog and detail pages with unique outcomes/curriculum/instructor, reviews, FAQ, and `Course` markup; category pages by subject and level.
- Free educational content (guides, tutorials, roadmaps) feeding into courses via internal links.
- Instructor/author pages; learner testimonials; schedule/cohort info with `Event`/`CourseInstance` where appropriate.
- Logged-in learning areas `noindex`; protected video not exposed to crawlers ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)).
- Youth-oriented products: clear privacy and safety content builds trust with parents (also a conversion factor).

## Cross-vertical measurement

Define the business KPI per vertical (orders, bookings/calls, sign-ups, enrollments), track non-brand organic landing pages, and review monthly ([`seo-audit-and-monitoring`](../seo-audit-and-monitoring/SKILL.md)).

## Checklist

- [ ] Vertical-specific architecture and page templates implemented.
- [ ] Duplicate/parameter URL control in place (facets, variants, pagination).
- [ ] Structured data for the vertical's main entity; business profiles and feeds consistent with the site.
- [ ] A content plan tied to search intent and a KPI beyond rankings.
