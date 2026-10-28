---
name: design-ecommerce
description: E-commerce design and UX - store information architecture, homepage, category/listing pages (filters, sort, grid), product detail pages (gallery, price, variants, stock, reviews, shipping), cart and mini-cart, checkout (guest, address, payments incl. cash on delivery and local wallets, order summary), trust signals, search, mobile commerce patterns, performance, accessibility, and structured data. Use when designing or building any online store, product page, cart, or checkout.
---

# E-commerce Design

Every screen answers: **Can I find it? Do I trust it? Is the price total clear? Is checkout easy?** Conversion is won by clarity, trust, and speed.

## 1. Store architecture

- Categories reflect how shoppers think (use search logs); max 2-3 levels; mega-menu on desktop, drill-down/bottom sheet on mobile.
- Stable, readable URLs: `/category/subcategory/product-slug`; canonical per product; filter URLs controlled for SEO ([`seo-vertical-playbooks`](../seo-vertical-playbooks/SKILL.md)).
- Persistent header: logo, search (prominent), account, **cart with count**; sticky on scroll; free-shipping threshold message if relevant.

## 2. Homepage

Hero with the main offer + one CTA; featured categories with strong imagery; best sellers/new arrivals rails; trust strip (delivery, returns, payment security, support); reviews/UGC; newsletter last. Do not stack five competing banners.

## 3. Listing pages (PLP)

- Product grid: 2 columns on phones, 3-4 on desktop; consistent image ratio (4:5 or 1:1); card = image, title (2 lines), price (sale price + original struck), rating, key badge (New/Sale/Out of stock), quick-add only if variants are simple.
- **Filters:** facets with counts, applied chips, clear-all, sticky filter button + bottom-sheet on mobile; sort (relevance, price, newest, rating); state in the URL.
- Pagination or "Load more" with a visible total; preserve scroll/filters on back; skeletons not spinners ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
- Hover second image on desktop only; never hide price or key info behind hover.

## 4. Product detail page (PDP)

| Area | Rules |
| --- | --- |
| **Gallery** | large images (zoom/pinch), 4-8 angles incl. in-use and scale, video if it helps, swipe on mobile, first image is the LCP (high priority, not lazy) |
| **Title + price** | clear name, price prominent, sale/original, currency, VAT/shipping note, installment info if offered |
| **Variants** | swatches/buttons (not dropdowns) for size/color, unavailable options disabled with reason, size guide link, selection reflected in image and URL |
| **Primary CTA** | "Add to cart" large, high contrast, **sticky on mobile**; secondary: wishlist |
| **Stock & delivery** | in stock / low stock (honest) / back-in-stock alert; delivery estimate by location; returns policy snippet |
| **Details** | short benefit bullets first, then specs table, materials/care, FAQs, size chart |
| **Reviews** | rating summary with distribution, filters, photos, verified-purchase badge, helpful votes |
| **Cross-sell** | "Complete the look"/related products below the fold, not before the CTA |
| **Trust** | secure payment icons, returns, warranty, support contact |

## 5. Cart

Mini-cart drawer after add (with checkout CTA and continue shopping); full cart page: line items with thumbnail, variant, quantity stepper, remove, price per line; shipping estimator, promo code field (collapsed to avoid coupon hunting), subtotal/shipping/tax/total; save-for-later; stock and price changes explained; persistent cart (server-side for logged-in, local for guests).

## 6. Checkout

- **Guest checkout by default**; optional account creation after purchase.
- Single page or short stepped flow with progress; order summary always visible (collapsible on mobile).
- Minimal fields, address autocomplete, phone with country format, saved addresses ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).
- **Show total cost (shipping, fees, tax) before the last step.** No surprises.
- **Payment methods that match the market:** cards, digital wallets, **cash on delivery** where customary, local wallets and instant-bank transfers, installment providers; display accepted methods early. Use a PCI-compliant hosted gateway/field; never store card data yourself.
- Inline validation, clear errors, preserved input; one primary button "Place order" with total; idempotency to prevent double orders ([`be-api-design`](../be-api-design/SKILL.md) §7).
- Confirmation page + email/SMS with order number, summary, delivery estimate, support contact; tracking link.

## 7. Search

Prominent box with autocomplete (products, categories, recent), typo tolerance, synonyms, filters on results, helpful zero-result page with suggestions; index fast ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md)).

## 8. Trust and policy

Visible shipping costs/times, returns, warranty, contact (phone/WhatsApp/chat), real address, company info, reviews, secure checkout cues, clear privacy/terms. Honest scarcity and discounts only.

## 9. Mobile commerce

Thumb-reachable actions, sticky add-to-cart and checkout bars, large tap targets, numeric keyboards for phone/card/OTP, wallet/one-tap payment where available, bottom-sheet filters, minimal modals ([`design-mobile-first-and-touch`](../design-mobile-first-and-touch/SKILL.md)).

## 10. Performance (directly affects revenue)

LCP image prioritized and responsive; lazy-load below-the-fold images; fixed aspect ratios (no CLS); cache catalog responses at the CDN/app layers ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)); keep third-party scripts (chat, pixels) deferred; budget JS ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)). Inventory and order writes: stock decrements and payments commit immediately with locking, never buffered ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md) §2).

## 11. Accessibility and RTL

Labelled quantity steppers and swatches (`aria-pressed`), focus management in the cart drawer, price announcements, contrast on sale badges ([`fe-accessibility`](../fe-accessibility/SKILL.md)); mirrored layout, correct currency/number formats and digits in Arabic ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).

## 12. Structured data and SEO

`Product` + `Offer` + `AggregateRating`/`Review`, `BreadcrumbList`, `Organization`; unique titles/descriptions per product; canonical for variants; sitemap of products ([`seo-structured-data`](../seo-structured-data/SKILL.md), [`seo-vertical-playbooks`](../seo-vertical-playbooks/SKILL.md)).

## 13. Checklist

- [ ] Search prominent; filters stateful; PLP card has price, rating, badge.
- [ ] PDP: big gallery, variant selection, sticky mobile CTA, honest stock/delivery, reviews, returns.
- [ ] Cart and checkout: guest, total visible early, market-appropriate payments, no double-submit.
- [ ] Trust cues and policies visible; confirmation and tracking.
- [ ] LCP/CLS good; catalog cached; inventory/payments transactional.
- [ ] Product structured data and unique metadata.
