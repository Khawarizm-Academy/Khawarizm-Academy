---
name: fe-css-architecture
description: CSS and Tailwind architecture - design tokens as CSS variables (and Tailwind theme), concept/component classes via @layer components and @apply, extracting repeated utility strings, cascade layers and specificity, what @apply can and cannot consume, per-feature CSS files, no ad-hoc hex or arbitrary fonts, scrollbars, z-index scale, and dead-class prevention. Use when styling, when you catch the same class string twice, or when styles fight each other.
---

# CSS Architecture (Tailwind and plain CSS)

Style with **tokens and named concepts**, not repeated strings and magic numbers.

## 1. Layers of styling

```
tokens        colors, fonts, spacing, radius, shadows, motion as CSS variables / theme   (one file)
global base   resets, typography defaults, scrollbar, focus ring, reduced-motion          (one file)
concepts      named classes for repeated UI ideas (.btn-primary, .card, .field)           (global + per feature)
utilities     one-off layout tweaks in markup (gap-4, md:flex)
```
Tokens first ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)); then concepts; utilities last.

## 2. A repeated class string is a missing concept

The same run of utilities written twice for the same kind of element must become a named class.

```tsx
// BAD - drifts the moment one copy changes
<button className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold shadow-lg text-sm inline-flex items-center gap-2">
// GOOD
<button className="btn-primary">
```

Where it goes:
- Used by **one feature** -> that feature's CSS file (`features/<f>/<f>.css`).
- Used by **2+ features** -> the shared stylesheet.
- One stylesheet **entry point** imports the feature files; never import a feature CSS from a component.

## 3. Cascade layers and specificity

- Declare concept classes inside `@layer components` so **utilities in markup can still override them** (utilities live in a later layer).
- An **unlayered** class beats every layered utility. Leave a class unlayered only when markup must never override it, and document that.
- Prefer single-class selectors; avoid `!important`, ID selectors, and deep descendant chains.
- Order of concern: tokens -> base -> components -> utilities.

## 4. `@apply` rules (Tailwind)

- `@apply` accepts **real utilities** only (including variants like `hover:`, `md:`).
- It cannot consume custom classes (`.flex-center`), the `group`/`peer` marker classes, or plain global helpers defined with raw CSS (`animate-fade-in`, `animation-delay-100`). Keep markers and global helpers in markup, or write the raw property (`animation: fade-in .3s both`) inside the class.
- `animate-spin`, `animate-pulse`, `animate-bounce` are real utilities and may be applied.
- Keep `@apply` lists short and readable; if a class needs 20 utilities, split the concept.

## 5. Tokens, not literals

- Colors, fonts, radii, shadows, z-indexes, durations come from tokens (`bg-surface`, `text-muted`, `var(--shadow-2)`, `var(--radius-md)`), never a raw hex in a component.
- Fonts: token utilities (`font-display`, `font-body`, `font-mono`); no arbitrary font-family in markup.
- Arbitrary values (`w-[317px]`) are a smell; if it recurs, it is a token or a concept.
- Overriding a framework's default color names with brand values makes defaults brand-safe, but prefer semantic names (`surface`, `primary`, `danger`) for intent.

## 6. Check the class exists

A dead class renders nothing and fails silently (`animate-spin-very-slow` never existed). Grep the stylesheet/theme before using an `animate-*`/custom class; enable the Tailwind IntelliSense/lint plugin that flags unknown classes.

## 7. Layout primitives worth defining once

`content-container` (max-width + responsive padding + centered), `page-wrapper` (root canvas, `overflow-x: clip`), `horizontal-scroll-row`, `no-scrollbar`, `section-title`, `visually-hidden`, `focus-ring`. Details of centering/sticky pitfalls: [`fe-responsive-layout-and-fixes`](../fe-responsive-layout-and-fixes/SKILL.md).

## 8. Z-index scale

One scale in tokens (e.g. base 0, sticky 20, rail/subnav 30, dropdown 40, overlay/modal 50, toast 60). No magic `z-[9999]`.

## 9. Scrollbars and selection

Style scrollbars with tokens (thin, track = canvas, thumb = border color, hover = accent) and the Firefox properties; hide them only on intentional swipe rows (`.no-scrollbar`). Keep text selection and focus styles on-brand and visible.

## 10. Dark mode and themes

Define semantic tokens once and **redefine them** for `[data-theme="dark"]` or `prefers-color-scheme`; components consume tokens, so they need no dark-specific code ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md) §5).

## 11. Performance of CSS

Purge unused CSS (Tailwind does by content scanning), avoid huge global selectors, avoid animating layout properties, split critical CSS only if measured ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 12. Checklist

- [ ] No repeated class string for the same kind of element.
- [ ] Concepts in `@layer components`; one stylesheet entry point; feature CSS beside the feature.
- [ ] No raw hex, arbitrary fonts, or magic z-indexes; tokens only.
- [ ] `@apply` only on real utilities; markers/global helpers stay in markup.
- [ ] Every custom class used actually exists.
