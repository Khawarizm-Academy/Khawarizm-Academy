---
name: design-motion-implementation
description: How to implement UI motion well - CSS transitions and keyframes, the Web Animations API, View Transitions API, CSS scroll-driven animations with fallbacks, Motion/Framer Motion, GSAP and Lottie/Rive choices, animating only transform and opacity, staggered entrance cascades, the animation fill-mode and containing-block pitfalls, sliding segmented controls, CTA shine sweep and attention halo, countdowns, skeleton shimmer, a global reduced-motion block, and performance profiling. Use when writing or debugging any animation, hover effect, transition, or scroll effect.
---

# Motion Implementation

Pair this with [`design-motion-principles`](../design-motion-principles/SKILL.md) (what/why). Here: **how, safely and cheaply.**

## 1. Performance rule #1

Animate **`transform` and `opacity` only** (composited on the GPU, no layout/paint). Do **not** animate `width`, `height`, `top`, `left`, `margin`, `padding`, `gap`, `box-shadow` on big areas, or `filter: blur` on large layers. Exceptions are small, established reveals (an expanding sidebar rail) - measure them.

- Height reveal without animating `height`: grid-rows trick (`grid-template-rows: 0fr -> 1fr`) or `<details>` with `interpolate-size` where supported.
- `will-change: transform` only on elements about to animate, removed afterward; never blanket it.
- Prefer CSS over JS for simple state transitions; use JS animation for sequencing, springs, or gesture-driven motion.

## 2. Choosing the tool

| Need | Tool |
| --- | --- |
| hover/focus/open-close state changes | CSS `transition` |
| one-off entrances, loops, skeletons | CSS `@keyframes` |
| programmatic control (play/reverse/finish), no library | Web Animations API (`el.animate(keyframes, options)`) |
| route/page/shared-element transitions | **View Transitions API** (`document.startViewTransition`) with CSS fallback |
| scroll-linked effects | CSS **scroll-driven animations** (`animation-timeline: scroll()/view()`) behind `@supports`, else IntersectionObserver |
| React layout/enter/exit/gesture/springs | Motion (Framer Motion) |
| complex timelines, SVG, ScrollTrigger | GSAP |
| designer-authored vector animation | Lottie / Rive (watch bundle size; lazy-load) |

Do **not** add a new animation library for page transitions or simple effects; the platform covers them. Check bundle cost before adding any ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 3. Entrance cascades

```css
@keyframes pop-in { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
.enter { animation: pop-in 350ms var(--ease-out) both; }
```
```tsx
{items.map((item, i) => (
  <Row key={item.id} className="enter" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }} />   /* cap the stagger */
))}
```
Step 60-100 ms; cap the index so long lists do not take seconds; keep the delay on the element carrying the animation.

## 4. Keyframes live in one place

Define shared keyframes and utility classes **once** (global stylesheet/theme): `pop-in`, `fade-in`, `fade-in-up`, `float`, `wiggle`, `bell-ring`, `twinkle`, `shine-sweep`, `shimmer`, `orbit`, `pulse`, `dropdown-in/out`. Feature CSS mirrors a global keyframe with a raw `animation:` line when markup cannot carry the utility; it does not redefine shared motion. Check an `animate-*` class exists before using it ([`fe-css-architecture`](../fe-css-architecture/SKILL.md) §6).

## 5. The fill-mode and containing-block pitfalls (critical)

`animation-fill-mode: both/forwards` leaves the **final `transform`** on the element. Consequences:

1. **Hover/active transforms on the same element stop working** (`animate-pop-in hover:scale-105` will not scale). Put the hover transform on a **child**, or animate non-transform properties on the animated element (border color, outline, brightness).
2. **A leftover `transform` makes the element the containing block for `position: fixed` descendants**, breaking fixed headers/modals inside it. Avoid fixed chrome under animated wrappers; use `sticky`, or end the animation with `transform: none` and no fill (`animation-fill-mode: backwards`/remove the class after `animationend`).
3. `will-change`/`filter`/`perspective` also create containing blocks and stacking contexts; know when you add them.

## 6. Sliding segmented control (shared switch)

One component for every side-by-side toggle: a track with an absolutely positioned **puck** translated by `translateX(index * 100%)` (negate for RTL), 300-400 ms with a gentle overshoot easing, translucent tint + outline (not a solid fill), options are real `<button role="tab">`/radio inputs with keyboard arrows. Never hand-roll a different switch ([`design-ui-components`](../design-ui-components/SKILL.md)).

## 7. CTA effects

- **Shine sweep:** the button is `position: relative; overflow: hidden`; an `::after` beam is parked off-canvas (`translateX(-260%) skewX(-20deg)`) and runs once on `:hover` (`animation: shine-sweep .7s ease`).
- **Attention halo:** animated `box-shadow` pulse (not a scaled ring if the button clips overflow). **One hero CTA per screen** at most.
- Press feedback `active:scale-95`; keep focus ring visible.

## 8. Countdowns and live numbers

A `useCountdown` hook updates once per second from a **target timestamp** (not by decrementing a counter, which drifts), pauses when the tab is hidden, cleans up the interval; digits use tabular figures in fixed-width boxes so nothing jitters ([`design-dashboards-and-data-viz`](../design-dashboards-and-data-viz/SKILL.md) §7).

## 9. View Transitions (pages and shared elements)

```ts
const go = (update: () => void) =>
  document.startViewTransition ? document.startViewTransition(update) : update();
```
```css
::view-transition-old(root) { animation: fade-out 160ms ease-in both; }
::view-transition-new(root) { animation: fade-in 220ms var(--ease-out) both; }
.card-thumb { view-transition-name: hero; }   /* unique per transition pair */
```
Set a flag (`html[data-vt-enabled]`) so your CSS entrance fallback is disabled when native transitions run (no double animation). Names must be unique at a time.

## 10. Scroll-driven animations (progressive enhancement)

```css
@supports (animation-timeline: view()) {
  .reveal { animation: fade-in-up both linear; animation-timeline: view(); animation-range: entry 0% cover 30%; }
}
```
Fallback: `IntersectionObserver` toggling a class once; or no animation. Content must be visible without the effect.

## 11. Reduced motion (one global block)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```
Keep this once in the global stylesheet; do not scatter per-component handling. For JS animation libraries use their reduced-motion hooks (`useReducedMotion`) ([`fe-accessibility`](../fe-accessibility/SKILL.md)).

## 12. Debug and profile

DevTools Performance + Layers: look for layout/paint during animation (a sign you animate the wrong property), long tasks, and dropped frames; test with 4x CPU throttle; use the Animations panel to slow down and inspect; check no console warnings about non-passive listeners.

## 13. Checklist

- [ ] Only transform/opacity animated; no blanket `will-change`.
- [ ] Shared keyframes defined once; classes verified to exist.
- [ ] Fill-mode/containing-block pitfalls respected (hover on children, no fixed chrome under animated wrappers).
- [ ] Staggers capped; one hero CTA effect per screen.
- [ ] View Transitions/scroll-driven features behind support checks with fallbacks.
- [ ] Global reduced-motion block present; profiled on a throttled CPU.
