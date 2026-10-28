---
name: design-motion-principles
description: Motion design principles for interfaces - why and when to animate, purpose categories (feedback, orientation, attention, delight), durations and easing curves, choreography and staggering, hierarchy of motion, micro-interactions (hover, press, toggle, success), page and scroll motion, loading motion, what not to animate, restraint (one hero effect per screen), and reduced-motion design. Use when deciding what should move and how, defining a motion system, or reviewing animations.
---

# Motion Principles

Motion is communication. If it does not **explain, confirm, guide, or delight**, remove it.

## 1. Purpose test

| Purpose | Example | Motion budget |
| --- | --- | --- |
| **Feedback** | button press, toggle, success tick | tiny, instant (100-150 ms) |
| **Orientation** | page/drawer slides from where it came; shared-element transition | 200-350 ms |
| **Attention** | highlight new item, subtle halo on the one hero CTA | rare |
| **Continuity** | skeleton shimmer, list reorder, accordion open | 200-300 ms |
| **Delight / brand** | entrance cascade, hero reveal, signature micro-interaction | restrained, once |

If you cannot name the purpose, delete it.

## 2. Timing

| Duration | Use |
| --- | --- |
| 80-150 ms | hover, press, focus, small state toggles |
| 150-250 ms | menus, tooltips, small reveals |
| 250-400 ms | modals, drawers, page elements entering, accordions |
| 400-600 ms | large transitions, hero choreography (rare) |
| > 600 ms | only for storytelling; never for UI feedback |

Exit faster than enter (about 60-70% of the entrance). Longer distances take more time. Define durations as tokens ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)).

## 3. Easing

- **Enter** (arrives): ease-out (decelerate) - `cubic-bezier(.16, 1, .3, 1)` (expo-out feel) or `cubic-bezier(.2, 0, 0, 1)`.
- **Exit** (leaves): ease-in (accelerate) - `cubic-bezier(.4, 0, 1, 1)`.
- **Move on screen**: ease-in-out - `cubic-bezier(.4, 0, .2, 1)`.
- **Springy** (playful controls, sliding pucks): slight overshoot - `cubic-bezier(.34, 1.56, .64, 1)`; use only where it suits the brand.
- Avoid `linear` except for continuous motion (spinners, shimmer, marquee).

## 4. Choreography

- **Stagger** related items 50-90 ms apart (cap total stagger around 400-600 ms, so lists of 30 items do not take seconds).
- Lead with the most important element; the rest follow in reading order.
- Move things **from where they came from** and **to where they go** (a card opens from its thumbnail).
- Group motion: elements that belong together move together; do not animate everything on a page at once.
- One **motion hierarchy** per screen: a single hero effect (the signature entrance or the one CTA halo), supporting motion quiet.

## 5. Micro-interaction recipes

| Interaction | Recipe |
| --- | --- |
| Button press | `scale(.97-.98)` + slightly darker, 100 ms |
| Card hover | border/shadow lift, optional 2-4px translateY; not scale if it has an entrance animation |
| Icon hover | tiny rotate/translate + tint |
| Toggle/segmented switch | sliding indicator (transform), spring-ish ease, 300-400 ms |
| Success | check draw (stroke-dashoffset) + soft pulse once |
| Error | short horizontal shake (3-4 px, 300 ms) + message; do not repeat |
| Loading | skeleton shimmer; spinner only for short unknown waits |
| Number change | quick count/tick, tabular figures |
| Notification bell | single swing |

## 6. Page, scroll, and reveal motion

- **Page transitions:** short fade/slide (about 200-250 ms), native View Transitions where supported ([`design-motion-implementation`](../design-motion-implementation/SKILL.md)); never block interaction.
- **Scroll reveals:** subtle (8-16 px rise + fade), once per element, triggered slightly before entering view; content must be readable without JS/animation; never reveal above-the-fold content with delay (hurts LCP).
- **Parallax:** gentle, decorative layers only; disable under reduced motion; never on text that must be read.
- **Scroll-linked effects:** keep them cheap (CSS scroll-driven animations or passive observers).

## 7. What not to animate

Layout properties on large trees (width/height/top/left/margin), text that users must read while it moves, form validation errors repeatedly, anything above the fold that delays content, background loops that distract from reading, and auto-playing carousels.

## 8. Restraint rules

- At most **one attention effect (halo/pulse/shine) per screen**, on the single most important CTA.
- Do not stack entrance + hover + loop on the same element.
- Motion density follows product tone: dashboards calm, marketing a little richer, tools almost none.
- Consistency: same easing/duration for the same kind of motion across the product.

## 9. Reduced motion (design it, do not just disable it)

Under `prefers-reduced-motion: reduce`: remove parallax, large translations, scaling, auto-rotation, and looping effects; keep **opacity fades** and instant state changes; replace motion cues with static ones (highlight color, icon change). Essential information must never depend on motion ([`fe-accessibility`](../fe-accessibility/SKILL.md)). Also respect users who cannot hover or are on low-power devices.

## 10. Review questions

Does it have a purpose? Is it fast enough? Does it block input? Does it work with reduced motion? Does it cost frames on a low-end phone? Is it consistent with the rest?

## 11. Checklist

- [ ] Every animation has a named purpose and a token duration/easing.
- [ ] Enters decelerate, exits accelerate and are shorter; staggers capped.
- [ ] One hero effect per screen; supporting motion quiet; no stacked effects.
- [ ] No layout-property animation; nothing above the fold delayed.
- [ ] Reduced-motion variant designed and tested.
