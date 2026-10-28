---
name: design-ui-components
description: Design and behavior rules for common UI components - buttons, links, inputs, selects, checkboxes, switches, cards, badges, tabs and segmented controls, navigation (top bar, sidebar, bottom bar, breadcrumbs), modals and drawers, dropdowns, tooltips, toasts, tables, pagination, avatars, accordions, and carousels. Use when designing or building any of these, reviewing component consistency, or defining a component library.
---

# UI Components - rules that make them feel right

Build each component once, with all states, sizes, and accessibility. See tokens in [`design-system-and-tokens`](../design-system-and-tokens/SKILL.md) and reuse rules in [`fe-component-architecture`](../fe-component-architecture/SKILL.md).

## Buttons
- Variants: **primary** (one per section), secondary (outline), subtle/ghost, danger; sizes sm/md/lg; icon-only (needs `aria-label`).
- Min height 40px desktop, **44px touch**; horizontal padding about 1.25-1.5x vertical; label sentence case, verb-first ("Save changes").
- States: hover, focus-visible ring, active (`scale(.98)`), disabled, loading (spinner inside, same width).
- Shine/halo effects only on the single hero CTA ([`design-motion-principles`](../design-motion-principles/SKILL.md)).

## Links
Underline (or clear non-color cue) in body text; visited/hover states; external links indicated; "action links" ("View all") are links, not competing buttons.

## Inputs and form controls
Visible label, helper text, error text; 44px height on touch; 16px font; clear focus ring; leading icon on the **start** edge; clear button on search; checkboxes/radios with 24px+ hit area including the label; switches for instant on/off settings, checkboxes for form choices ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).

## Cards
One primary action per card (whole-card link or a single CTA); consistent media aspect ratio; title max 2 lines with ellipsis; meta row (price, rating, level) aligned; hover = border/shadow lift (do not scale an element that has an entrance animation); skeleton twin exists ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).

## Badges and tags
Short text (1-2 words), semantic color + text, not interactive unless styled as a chip; filter chips show selected state with a check or filled style.

## Tabs and segmented controls
Tabs switch **views of the same context**; segmented controls switch **modes/filters**. Active state is obvious beyond color; a sliding indicator uses `transform`; keyboard arrows move between items; URL reflects the tab when shareable ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)).

## Navigation
- Top bar: logo at the start, primary links, search, account at the end; sticky and slim (~56-72px).
- Mobile: **bottom bar with 3-5 destinations** (icon + label), or a hamburger for secondary; safe-area padding.
- Sidebar for apps: collapsible rail, active item highlighted, grouped sections.
- Breadcrumbs for deep hierarchies; current page not a link; `aria-current="page"`.
- Footer: sitemap links, contact, legal, language; reuse across pages (the layout owns it).

## Modals, drawers, popovers
Use modals sparingly (blocking decisions, short forms); drawers for filters/details on mobile. Focus trap, Esc to close, scrim click closes (except destructive/in-progress), return focus, lock scroll, `role="dialog"` + `aria-modal` + label ([`fe-accessibility`](../fe-accessibility/SKILL.md)). Panels over scrims are solid, not translucent.

## Dropdowns, menus, tooltips
Menus open on click (not hover-only), arrow-key navigation, Esc closes, collision-aware placement (logical sides for RTL). Tooltips are supplementary, appear on hover **and** focus, never hide essential info, never contain interactive content.

## Toasts
Short, auto-dismiss (4-6 s) for success, persistent for errors with an action; stack at one edge; `role="status"`/`alert`; never the only place an important result appears.

## Tables and lists
Left/start-align text, end-align numbers with tabular figures, sticky header for long tables, zebra or row dividers (not both), row hover, sortable columns announced (`aria-sort`), responsive strategy (horizontal scroll container, or card list on mobile), empty and loading states, bulk-action bar.

## Pagination and infinite scroll
Pagination for goal-oriented browsing and SEO-relevant lists (real links); infinite scroll for feeds with a "load more" fallback and a way to reach the footer; keep scroll position on back.

## Accordions / FAQ
Button headers with `aria-expanded`; one or many open consistently; animate height via grid-rows or `<details>`; FAQ content crawlable ([`seo-structured-data`](../seo-structured-data/SKILL.md)).

## Carousels
Last resort; show part of the next item as an affordance; arrows + swipe + dots; pause on hover/focus; no autoplay on key content; one image visible-loaded first (LCP).

## Avatars and media thumbnails
Fixed sizes from a scale; fallback initials; `alt` or decorative handling; lazy-loaded with reserved dimensions.

## Checklist

- [ ] Every component has default/hover/focus/active/disabled/loading (and error where relevant).
- [ ] Sizes from a scale; touch targets >= 44px; labels sentence-case and verb-first.
- [ ] Keyboard and screen-reader behavior defined for overlays, menus, tabs.
- [ ] Skeleton, empty, and error twins exist for data components.
- [ ] Built once and reused; no one-off variants.
