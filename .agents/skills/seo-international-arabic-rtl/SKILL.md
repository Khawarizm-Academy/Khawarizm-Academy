---
name: seo-international-arabic-rtl
description: International and Arabic SEO - choosing URL structure for languages and countries, hreflang rules (self-reference, reciprocity, x-default, language-region codes), lang and dir attributes, Arabic keyword research (Modern Standard vs dialects, spelling variants, numerals), Arabic and transliterated URL slugs, Arabic titles/descriptions and Open Graph locale, RTL meta and rendering checks, avoiding IP-based auto-redirects, localized structured data, and translation quality. Use for multilingual or Arabic-language websites and any site targeting several countries or languages.
---

# International & Arabic SEO

Search engines serve **the right language/country version** when you signal it clearly and consistently.

## 1. URL structure options

| Option | Example | Pros | Cons |
| --- | --- | --- | --- |
| Subdirectories | `/ar/`, `/en/` | one domain's authority, simple hosting | geo-targeting is weaker |
| Subdomains | `ar.example.com` | separable infrastructure | treated more separately |
| ccTLDs | `example.eg`, `example.sa` | strongest country signal | cost, many properties |

For most single-brand sites, **subdirectories** are the best default (`/ar/...`, `/en/...`). Keep the **same URL structure** per language. Do not serve different languages on the same URL based on cookies or Accept-Language alone (bots cannot see them).

## 2. hreflang (get it exactly right)

```html
<link rel="alternate" hreflang="ar" href="https://www.example.com/ar/courses/python/">
<link rel="alternate" hreflang="en" href="https://www.example.com/en/courses/python/">
<link rel="alternate" hreflang="x-default" href="https://www.example.com/en/courses/python/">
```
- Every version lists **all versions including itself** (self-reference), and the links are **reciprocal** (return links); mismatches are ignored.
- Use ISO 639-1 language codes, optionally with ISO 3166-1 region (`ar-EG`, `ar-SA`, `en-GB`); `x-default` for the fallback/selector page.
- Annotate in **one** place: HTML head, HTTP headers (for non-HTML), or the **XML sitemap** (best at scale). Keep them in sync with a generated source of truth.
- Hreflang URLs must be canonical, indexable, 200 pages. Each language's canonical points to itself (not to another language).
- Only link pages that are true equivalents.

## 3. Language and direction in HTML

`<html lang="ar" dir="rtl">` per page; set `lang` on mixed-language fragments; `<meta property="og:locale" content="ar_AR">` (and `og:locale:alternate`); localized `title`/description/OG/structured data - never leave English metadata on Arabic pages ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).

## 4. Arabic URL slugs

- Google handles Unicode URLs; browsers display Arabic slugs, but when copied they appear **percent-encoded** (long, ugly). Options: Arabic slugs (`/ar/دورات/بايثون`), or readable transliterated/English slugs (`/ar/courses/python-basics`).
- Choose **one** convention per site and keep it stable; never mix; keep slugs short; redirect 301 when changing.
- Many teams prefer ASCII slugs for shareability and tooling; Arabic slugs can help recognition. Decide with your audience and analytics.

## 5. Arabic keyword research and content

- Research in Arabic, not translated English keywords. Users search in **Modern Standard Arabic and dialects** (Egyptian, Gulf, Levantine, Maghrebi), in Arabizi/Latin for some products, and with spelling variants (hamza forms أ/إ/ا, taa marbuta ة/ه, alef maqsura ى/ي, diacritics, "ال" definite article).
- Use autocomplete/People-also-ask in the target country, Search Console queries, and local keyword tools; map each variant cluster to one page, using natural variants in headings and body.
- Write natively (not machine-literal translation): local idioms, currency, units, examples, holidays, payment methods; have a native editor review.
- Numerals: pick Western (0-9) or Eastern Arabic-Indic digits per audience and be consistent; users may search with either, so support both in internal search normalization.
- Normalize Arabic text in your own search index (strip diacritics/tatweel, unify alef/hamza/yaa forms) so users find results regardless of spelling ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §3).

## 6. Titles, descriptions, headings in Arabic

Same rules as [`seo-on-page-content`](../seo-on-page-content/SKILL.md): unique, primary term early, brand last; Arabic characters are wider/narrower than Latin so check truncation in SERP previews; avoid keyword stuffing and excessive punctuation; use a natural register consistent with the brand voice ([`design-ux-patterns-and-microcopy`](../design-ux-patterns-and-microcopy/SKILL.md) §8).

## 7. Language selector and redirects

- Provide a visible **language switcher** that links to the equivalent page in the other language (real `<a href>`), not a JS-only toggle.
- **Do not auto-redirect by IP or browser language** in a way that blocks users or bots; at most suggest ("Switch to Arabic?") with a dismissible banner and remember the choice.
- The root `/` can serve a language selector or the default language with `x-default`.

## 8. Localized structured data and local signals

Translate `name`/`description` in JSON-LD per language, keep identifiers stable via `@id`; set `inLanguage`; for local businesses use country-correct address, phone format, currency, and `areaServed` ([`seo-structured-data`](../seo-structured-data/SKILL.md)). Use the target country's Google Business Profile and local directories ([`seo-vertical-playbooks`](../seo-vertical-playbooks/SKILL.md)). Search engines used vary by country; Google is dominant in most Arabic-speaking markets - confirm with your analytics and also set up Bing Webmaster Tools.

## 9. RTL rendering checks that affect SEO and UX

Verify mirrored layout, readable Arabic fonts that load fast ([`design-typography`](../design-typography/SKILL.md)), correct punctuation direction, LTR fragments isolated, mobile-friendly rendering (mobile-first indexing), and that critical Arabic text is real text in the HTML (not images).

## 10. Sitemaps and canonical hygiene

Per-language sitemaps or one sitemap with hreflang annotations; canonical per language version; no duplicate-language pages (machine-translated thin copies) in the index; remove or `noindex` untranslated placeholder pages.

## 11. Measurement

Segment Search Console and analytics by language folder/country; track impressions/clicks per language and per country; watch for wrong-language ranking (hreflang errors) ([`seo-audit-and-monitoring`](../seo-audit-and-monitoring/SKILL.md)).

## 12. Checklist

- [ ] One URL structure per language (subdirectories by default); equivalents mapped.
- [ ] hreflang self-referencing, reciprocal, with x-default, generated from one source.
- [ ] `lang`/`dir`, localized metadata, OG locale, structured data in each language.
- [ ] Arabic keyword research per target country/dialect; native-quality copy.
- [ ] Consistent slug convention; 301s on change.
- [ ] Visible crawlable language switcher; no IP-based forced redirects.
- [ ] Per-language monitoring in Search Console.
