---
name: seo-structured-data
description: Structured data (schema.org JSON-LD) for SEO - rules for correct markup, validation, and the main types - Organization, WebSite, BreadcrumbList, Article/BlogPosting, Product with Offer and ratings, Course, LocalBusiness and Restaurant with opening hours and menu, Event, VideoObject, FAQ and HowTo status, Review rules, generating JSON-LD from data in code, and testing. Use when adding rich results eligibility, local SEO markup, product or course markup, or auditing existing schema.
---

# Structured Data (JSON-LD)

Structured data **describes what is already on the page** so search engines can understand it and may show rich results. It is not a ranking switch and it must never contradict visible content.

## 1. Rules

1. Use **JSON-LD** (a `<script type="application/ld+json">` block) - Google's recommended format; it can sit in `<head>` or `<body>`.
2. Mark up only content that is **visible to users** on that page; values must match (price, rating, hours).
3. Follow the target feature's required/recommended properties (check Google's Search Gallery for current eligibility - rich result policies change).
4. Do **not** mark up fake reviews, self-serving reviews for your own business entity, or hidden content (policy violations can trigger manual actions).
5. One entity graph per page; use `@id` to link entities (Organization <- WebSite <- WebPage <- Product).
6. Generate JSON-LD **from the same data** that renders the page (never hand-typed duplicates), and render it **server-side/in the initial HTML** where possible ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

## 2. Core types

**Organization (site-wide, home page)**
```json
{ "@context": "https://schema.org", "@type": "Organization", "@id": "https://www.example.com/#org",
  "name": "Brand", "url": "https://www.example.com/", "logo": "https://www.example.com/logo.png",
  "sameAs": ["https://www.facebook.com/brand", "https://www.instagram.com/brand"],
  "contactPoint": [{ "@type": "ContactPoint", "telephone": "+20-...", "contactType": "customer support", "availableLanguage": ["Arabic", "English"] }] }
```

**BreadcrumbList (every deep page)**
```json
{ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
  { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.example.com/" },
  { "@type": "ListItem", "position": 2, "name": "Courses", "item": "https://www.example.com/courses" },
  { "@type": "ListItem", "position": 3, "name": "Python Basics" } ] }
```

**Article / BlogPosting**: `headline`, `image`, `datePublished`, `dateModified`, `author` (Person with `url`), `publisher`, `mainEntityOfPage`.

## 3. Product (e-commerce)

```json
{ "@context": "https://schema.org", "@type": "Product", "name": "Leather Wallet", "image": ["https://.../1.jpg"],
  "description": "Handmade full-grain leather wallet.", "sku": "W-102", "brand": { "@type": "Brand", "name": "Brand" },
  "offers": { "@type": "Offer", "url": "https://.../wallet", "priceCurrency": "EGP", "price": "450.00",
              "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.6", "reviewCount": "89" } }
```
Price and availability must match the page and update with stock changes; include `aggregateRating`/`review` only when real reviews are shown on the page; keep a Merchant Center feed consistent ([`design-ecommerce`](../design-ecommerce/SKILL.md)).

## 4. Course (education)

`Course` with `name`, `description`, `provider` (Organization), and where applicable `offers`, `hasCourseInstance` (mode, schedule), and `educationalLevel`; check the current Course rich result requirements.

## 5. LocalBusiness / Restaurant (local SEO)

```json
{ "@context": "https://schema.org", "@type": "Restaurant", "name": "Brand Bistro", "image": "https://.../front.jpg",
  "url": "https://www.example.com/", "telephone": "+20-...", "priceRange": "$$", "servesCuisine": ["Italian", "Pizza"],
  "address": { "@type": "PostalAddress", "streetAddress": "12 Main St", "addressLocality": "City", "addressCountry": "EG" },
  "geo": { "@type": "GeoCoordinates", "latitude": 30.0, "longitude": 31.0 },
  "openingHoursSpecification": [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday"], "opens": "12:00", "closes": "23:00" }],
  "acceptsReservations": true, "menu": "https://www.example.com/menu", "sameAs": ["https://maps.google.com/?cid=..."] }
```
Use the most specific subtype (`Restaurant`, `CafeOrCoffeeShop`, `Bakery`, `Dentist`...). **NAP must be identical** to the Google Business Profile and visible on the page. One page + markup per branch ([`design-restaurants-and-food`](../design-restaurants-and-food/SKILL.md), [`seo-vertical-playbooks`](../seo-vertical-playbooks/SKILL.md)).

## 6. Other useful types

`Event` (dates, location, offers, status), `VideoObject` (thumbnail, duration, upload date, embed), `ImageObject`, `JobPosting`, `SoftwareApplication` (SaaS), `Person`, `WebSite`, `ItemList` (carousels of lists).

## 7. FAQ and HowTo: know the status

Google restricts **FAQ rich results** to well-known authoritative government and health sites and has **retired HowTo rich results**. You may still mark up genuine FAQ content for clarity, but do not expect rich results or invest heavily; real value is in visible, helpful content. Re-check Google's documentation before relying on any feature.

## 8. Generating JSON-LD in code

```ts
const productJsonLd = (p: Product) => ({
  '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku,
  offers: { '@type': 'Offer', priceCurrency: p.currency, price: p.price.toFixed(2), availability: AVAILABILITY[p.stock] },
});
// <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
```
Escape `<` to prevent script injection; use records for enum mappings (`AVAILABILITY`), not `if` ladders ([`core-code-style`](../core-code-style/SKILL.md) §3); keep builders in one module with tests.

## 9. Validate and monitor

Test with Google's **Rich Results Test** and the **Schema Markup Validator**; watch **Search Console -> Enhancements** for errors/warnings; add unit tests for builders; re-validate after template changes ([`seo-audit-and-monitoring`](../seo-audit-and-monitoring/SKILL.md)).

## 10. Checklist

- [ ] JSON-LD generated from page data, in the initial HTML, escaped.
- [ ] Markup matches visible content; no fake or self-serving reviews.
- [ ] Organization (home), BreadcrumbList (deep pages), type-specific markup (Product/Course/Article/Restaurant/Event).
- [ ] Local business NAP identical everywhere.
- [ ] Validated and monitored; FAQ/HowTo expectations realistic.
