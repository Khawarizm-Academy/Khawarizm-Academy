---
name: design-system-and-tokens
description: Building a design system and design tokens for any brand or project - the token layers (primitive, semantic, component), color roles, type scale, spacing/radius/shadow/z-index/motion tokens, CSS variables and Tailwind v4 @theme setup, dark mode and theming, brand asset pipeline (logo source to generated icons/favicons), component states, naming, documentation, and governance. Use when starting a project, rebranding, adding dark mode, or when styles are inconsistent.
---

# Design System & Tokens

A design system is **shared decisions in code**. Tokens are the smallest unit: named values that every component consumes.

## 1. Token layers

| Layer | Example | Rule |
| --- | --- | --- |
| **Primitive** | `--blue-500: #167bdb` | raw palette/scale; never used directly in components |
| **Semantic** | `--color-primary`, `--color-surface`, `--color-text-muted`, `--color-danger` | what the value *means*; components use these |
| **Component** | `--button-radius`, `--card-padding` | optional overrides for one component |

Components consume **semantic** tokens only. Theming = remapping semantic tokens.

## 2. What to tokenize

- **Color roles:** `bg` (canvas), `surface`, `surface-raised`, `border`, `text`, `text-muted`, `primary`, `primary-contrast`, `accent`, `success`, `warning`, `danger`, `info`, `overlay-scrim`, `focus-ring`.
- **Typography:** families (display/body/mono), scale (e.g. 12/14/16/18/20/24/30/36/48/60), weights, line-heights, letter-spacing ([`design-typography`](../design-typography/SKILL.md)).
- **Spacing:** 4/8 scale; **radius:** sm/md/lg/full; **shadows:** elevation 1-3 + glow; **z-index scale**; **breakpoints**; **container widths**; **motion:** durations (instant 100ms, fast 150-200, base 250-300, slow 400-500) and easings ([`design-motion-principles`](../design-motion-principles/SKILL.md)); **opacity** steps; **skeleton** colors.

## 3. Implementation (CSS variables + Tailwind v4)

```css
@import "tailwindcss";
@theme {
  --color-brand-600: #1d4ed8;    /* primitives become utilities: bg-brand-600 */
  --color-accent-400: #f59e0b;
  --font-display: 'Display Font', system-ui, sans-serif;
  --font-body: 'Body Font', system-ui, sans-serif;
}
:root {                           /* non-utility tokens, read with var(--...) */
  --shadow-elev-1: 0 2px 8px rgb(0 0 0 / .15);
  --shadow-elev-2: 0 8px 24px rgb(0 0 0 / .2);
  --radius-md: 12px;
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --dur-base: 250ms;
}
```
(Values above are placeholders; real values come from the project profile.) Without Tailwind: the same variables in `:root`, consumed by plain CSS or CSS modules.

Optionally **override default palette names** (e.g. `slate-*`) with brand values so framework defaults never leak off-brand colors; still prefer semantic names in components.

## 3.1 Semantic mapping and dark mode

```css
:root                      { --bg: #ffffff; --surface: #f6f7f9; --text: #101828; --primary: #1d4ed8; }
:root[data-theme="dark"]   { --bg: #0b1220; --surface: #121a2b; --text: #e6ecf5; --primary: #6ea8ff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* same dark values */ } }
```
Components never contain dark-specific code; they use `var(--surface)`. Dark mode is **not** inverted light mode: lower saturation, check contrast again, lift surfaces with lightness not shadows, keep brand accents legible.

## 4. Component states (define for every interactive component)

default, hover, focus-visible, active/pressed, disabled, loading, selected, error. Document each; `focus-visible` ring is mandatory ([`fe-accessibility`](../fe-accessibility/SKILL.md)). Sizes as a scale (sm/md/lg) not ad-hoc paddings.

## 5. Component library surface

Build a small set well: Button (variants: primary/secondary/subtle/ghost/danger; sizes; icon-only), Input/Select/Checkbox/Radio/Switch, Card, Badge/Tag, Tabs/SegmentedControl, Modal/Drawer, Toast, Tooltip/Popover, Dropdown/Menu, Table, Pagination, Breadcrumb, Skeleton, StatePanel (empty/error), Avatar. Rules and patterns: [`design-ui-components`](../design-ui-components/SKILL.md), reuse rules: [`fe-component-architecture`](../fe-component-architecture/SKILL.md).

## 6. Brand asset pipeline

One **master logo source** (SVG preferred) in `assets/brand/source/`; a script generates app icons, favicons, social images, and touch icons into `generated/`/`public/` (`npm run brand:generate`). Never hand-edit generated files. Provide logo clear-space, minimum size, and light/dark variants.

## 7. Naming and organization

`category-role-modifier` (`color-text-muted`, `space-4`, `radius-lg`); one tokens file; one place where primitives live; no duplicates with different names; deprecate before deleting.

## 8. Documentation and governance

A short style guide page (or Storybook) showing tokens, components, and states from the real code; a changelog for token changes; a rule that **new colors/sizes require a token first**; automated checks (lint for raw hex/px in components).

## 9. Creating a system from scratch (fast path)

1. Pick brand colors; generate a 9-11 step ramp per hue; verify contrast pairs ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).
2. Choose font pairing + scale ([`design-typography`](../design-typography/SKILL.md)).
3. Set spacing/radius/shadow/motion scales.
4. Map semantic roles for light (and dark).
5. Build Button, Input, Card first; review against [`design-fundamentals`](../design-fundamentals/SKILL.md).
6. Document in the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)).

## 10. Checklist

- [ ] Tokens in one place; components use semantic tokens only.
- [ ] No raw hex/px/fonts in components; z-index and motion scales exist.
- [ ] Light/dark (if needed) by remapping tokens; contrast re-verified.
- [ ] Every interactive component has all states including focus-visible.
- [ ] Brand assets generated from one master source.
- [ ] Documented, with a rule that new values start as tokens.
