---
name: design-mobile-first-and-touch
description: Mobile-first and touch UX rules - thumb zones, touch target sizes, bottom navigation, sticky action bars, gestures with alternatives, mobile forms and keyboards, safe areas and viewport units, orientation, low-bandwidth and low-power considerations, PWA basics, and testing on real devices. Use when designing or reviewing any screen that will be used on a phone, or when a desktop layout is being adapted.
---

# Mobile-first & Touch

Design for the phone first (small screen, thumb, bad network), then enhance for larger screens.

## 1. Mobile-first process

1. Write the content and priorities for the smallest viewport (~360-390px wide).
2. Single column; the primary action reachable; essentials only.
3. Add columns, side panels, and hover enhancements at larger breakpoints ([`fe-responsive-layout-and-fixes`](../fe-responsive-layout-and-fixes/SKILL.md)).

## 2. Touch targets and spacing

- **44x44 CSS px** minimum (WCAG 2.2 AA minimum is 24px; Apple HIG 44pt; Material 48dp). Keep **8px+** between adjacent targets.
- Make the whole row/card tappable, not just a small link.
- Icon-only buttons get padding to reach the target size, and a label for accessibility.

## 3. Thumb zones

On large phones the **bottom third** is easiest to reach: primary actions, navigation, and sticky CTAs go there; destructive or rare actions go far from the thumb. Top corners are hardest. Use a **bottom navigation bar (3-5 items)** and bottom sheets instead of top menus/centered modals.

## 4. Sticky and fixed elements

- Sticky bottom CTA/action bar for the page's primary action (add to cart, enroll, book); keep it slim and not covering content (add bottom padding).
- Respect **safe areas** (`env(safe-area-inset-*)`) and browser UI changes; use `dvh` units for full-height layouts.
- Limit stacked fixed bars (header + bottom bar + cookie banner) so content keeps >= 60% of the viewport.

## 5. Gestures

Swipe, pull-to-refresh, long-press, pinch are **enhancements with visible alternatives** (buttons). Do not hijack browser/OS gestures (back swipe, edge swipes). Horizontal carousels show a peek of the next item; use `scroll-snap`.

## 6. Mobile forms

Short forms, one column, correct `inputmode`/`type`/`autocomplete`, 16px+ text, labels always visible, sticky submit, avoid dropdowns for short lists (use radios/segmented), date/time via native pickers, autofill and password-manager friendly, OTP auto-read ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).

## 7. Content and readability

16px+ body, 1.5+ line-height (more for Arabic), concise copy, collapsible long content (accordions), no hover-only information, tap-to-call (`tel:`), WhatsApp/maps deep links, no horizontal scrolling of the page, readable tables (cards or scroll container).

## 8. Network and device realities

- Assume slow/unstable networks and mid-range CPUs: small JS, responsive images, lazy loading, skeletons, caching, offline tolerance ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md), [`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).
- Respect data saver/reduced motion; avoid heavy autoplay video and big WebGL scenes on mobile unless essential, with a static fallback ([`design-3d-web`](../design-3d-web/SKILL.md)).
- Battery: pause offscreen animations and polling.

## 9. Orientation and viewport

Support portrait first; do not lock orientation; check landscape for forms and video; set `<meta name="viewport" content="width=device-width, initial-scale=1">` (do not disable zoom); handle the on-screen keyboard (inputs not hidden behind sticky bars).

## 10. PWA basics (when installability matters)

Web app manifest (name, icons, theme color, display), HTTPS, a service worker with a considered cache strategy (precache the shell, stale-while-revalidate content, network-first for user data), offline fallback page, install prompt at a meaningful moment. Do not add a service worker without a plan for updates and cache invalidation.

## 11. Test on real devices

Test on at least one low-end Android and one iPhone (real or reliable emulators), on a throttled network, in both light and dark mode, with large text settings, and with one-handed use. Check 360, 390, 412 widths and a small 320 case.

## 12. Checklist

- [ ] Designed mobile-first; single column; priorities clear.
- [ ] Targets >= 44px with spacing; primary actions in the thumb zone.
- [ ] Sticky bars respect safe areas and do not cover content.
- [ ] Gestures have button alternatives; no hover-only info.
- [ ] Forms use the right keyboards/autofill; 16px text.
- [ ] Fast on slow networks; tested on real devices.
