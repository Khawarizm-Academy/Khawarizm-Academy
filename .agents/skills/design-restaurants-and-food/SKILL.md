---
name: design-restaurants-and-food
description: Restaurant, cafe, bakery, and food-business website design - the one-job homepage (menu, order, reserve, directions), menu design as HTML (categories, photos, prices, dietary tags, allergens), online ordering and delivery links, reservations, hours with open-now, location and contact, photography direction, mood and brand, mobile-first behavior, QR menus, local SEO and structured data, and performance. Use for any restaurant, cafe, catering, or food-delivery site or menu page.
---

# Restaurants & Food Business Design

Most visitors are hungry and on a phone. They want **the menu, the hours, the location, and a way to order or book - in seconds.**

## 1. The homepage job

Above the fold on mobile: name/logo, one-line identity ("Wood-fired pizza in ..."), **primary CTA** (Order online / Reserve a table / See menu), tap-to-call, open-now status, and a mouth-watering hero image. Below: signature dishes, menu highlights, story/atmosphere, gallery, reviews, location + map, hours, social links.

- Primary CTA depends on the business: delivery/takeaway -> Order; table service -> Reserve; both -> two clear buttons, one dominant.
- Sticky bottom bar on mobile: Call / Directions / Order.

## 2. Menu design (do it as HTML, not only a PDF)

- A PDF-only menu is slow, unreadable on phones, not accessible, and invisible to search. Provide an **HTML menu** (and an optional download).
- Sticky category tabs (Starters, Mains, Desserts, Drinks) with scroll-spy and anchors; search/filter for long menus; filters for dietary needs.
- Item row: name, short description (ingredients/method), price (aligned at the end edge, consistent currency format), tags (vegetarian, vegan, halal, gluten-free, spicy), allergens as clear icons + text, photo for signature items only (consistent crop, small thumbnails).
- Show size/variant prices clearly; mark popular/chef's picks; indicate unavailable items instead of deleting them silently.
- Keep prices **accurate and updated** from one data source (CMS/admin), not hard-coded in markup ([`be-architecture`](../be-architecture/SKILL.md)).
- Allergen and dietary claims must be accurate; add a note to ask staff about allergies.

## 3. Ordering and delivery

- Direct ordering beats third-party apps (fees): cart, pickup/delivery choice, delivery zone and minimum, estimated time, special instructions, upsell sides/drinks, scheduled orders, order tracking/confirmation via SMS/WhatsApp.
- Checkout rules from [`design-ecommerce`](../design-ecommerce/SKILL.md) §6 apply (guest, total early, local payment methods incl. cash on delivery where customary, idempotent submit).
- Link third-party delivery apps as secondary options if used.
- Open/closed logic: show "Open now - closes at 11 pm", disable ordering outside hours or allow scheduling; handle holidays and kitchen-closing times from data, not hard-coded text.

## 3.1 Reservations

Date, time, party size, name, phone (and email); show availability; confirm instantly by SMS/WhatsApp/email; allow changes/cancellation; large-party/event inquiry form; integrate a booking provider or a simple request flow ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).

## 4. Hours, location, contact

Hours in a clear table with today highlighted; address with a map (static map image first, interactive on tap to save weight), directions deep links (Maps apps), parking/transit notes, phone with `tel:`, WhatsApp link, email, social; multiple branches with a selector and per-branch hours/menu.

## 5. Photography and mood

- Photography sells: natural light, close crops, real dishes, consistent style/color grade; people and process shots (chef, oven) for story. Avoid obvious stock.
- Hero as optimized image or short muted loop with a poster; never autoplay heavy video on mobile ([`design-imagery-and-media`](../design-imagery-and-media/SKILL.md)).
- Brand mood by cuisine: warm earthy tones and serif accents (bakery/traditional), bold color and playful type (street food), dark elegant neutrals with metallic accent (fine dining), fresh greens and whitespace (healthy). Keep one signature motif.
- Typography readable for menus: legible weights, good contrast on dark backgrounds ([`design-typography`](../design-typography/SKILL.md), [`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).

## 6. Social proof

Google/Tripadvisor ratings and a few real reviews, press mentions, awards, user photos/Instagram feed (lazy, optional), hygiene/halal/certification badges where applicable.

## 7. Mobile-first and QR menus

QR code at tables opens the HTML menu directly (short stable URL), loads fast on weak networks, no login, no app install; large tap targets; offline-tolerant caching; language switcher (Arabic/English) with RTL support ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).

## 8. Local SEO and structured data (high value for restaurants)

- Claim and complete the Google Business Profile (hours, menu, photos, categories, ordering links); keep name/address/phone **identical** everywhere (NAP).
- `Restaurant` (or `CafeOrCoffeeShop`, `Bakery`) JSON-LD with address, geo, `openingHoursSpecification`, `servesCuisine`, `priceRange`, `telephone`, `menu` URL, `acceptsReservations`, `sameAs` ([`seo-structured-data`](../seo-structured-data/SKILL.md)).
- Per-branch landing pages, indexable HTML menu, descriptive image alt text, fast mobile pages, review acquisition ([`seo-vertical-playbooks`](../seo-vertical-playbooks/SKILL.md)).

## 9. Performance

Menu and homepage are image-heavy: responsive AVIF/WebP, lazy-load below the fold, reserve sizes, cache the menu API at the CDN with short TTL + SWR ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)), and keep chat/booking widgets deferred ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 10. Content management

The owner must update menu, prices, hours, specials, and photos **without code**: build admin screens for these (or a headless CMS), with an availability toggle per item ([`be-architecture`](../be-architecture/SKILL.md) §6).

## 11. Checklist

- [ ] Primary CTA + call/directions visible on mobile without scrolling.
- [ ] HTML menu with categories, tags, allergens, prices from one data source.
- [ ] Hours/open-now from data; map + directions; NAP consistent.
- [ ] Ordering/reservation flow short, with confirmation; local payment options.
- [ ] Optimized, consistent photography; fast mobile load.
- [ ] Restaurant structured data and Google Business Profile aligned.
- [ ] Owner can edit menu and hours.
