---
name: design-shapes-svg-and-iconography
description: Shapes, SVG, and icon design for the web - shape language and radius systems, inline SVG vs img vs CSS mask, viewBox and currentColor, SVGO optimization, sprites, clip-path and mask shapes, organic blobs, wave and angled section dividers, geometric and gradient pattern backgrounds, SVG line-draw and morph animation, icon grids and stroke consistency, illustration style, favicons and app icons. Use when creating decorative shapes, dividers, icons, illustrations, logos on the web, or when SVG assets are heavy or inconsistent.
---

# Shapes, SVG & Iconography

Shapes carry personality: **round = friendly, sharp = precise, organic = natural, geometric = technical**. Choose a shape language once and repeat it.

## 1. Shape language

- Decide: corner radius family (e.g. 8/12/20 + full pills), whether to use organic blobs, diagonal cuts, or circles as the signature motif.
- Apply it to buttons, cards, images, badges, avatars, dividers - consistency matters more than the specific choice ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)).
- Nested radius = outer radius - padding.
- Limit to 1-2 decorative shape types per page; decoration must not compete with content.

## 2. SVG basics

- Always set a **`viewBox`**; size with CSS (`width`, `height`), not fixed attributes, so it scales.
- Use `fill="currentColor"` / `stroke="currentColor"` so icons inherit text color and theme.
- **Inline** SVG for icons and anything animated/styled; `<img src="x.svg">` for static illustrations (cacheable); CSS `mask-image` for single-color icons controlled by `background-color`.
- Optimize with **SVGO** (remove metadata, editor cruft, collapse groups, shorten paths; keep `viewBox`); target a few KB per icon/illustration.
- Add `<title>` + `role="img"` for meaningful graphics; `aria-hidden="true"` for decorative ones ([`fe-accessibility`](../fe-accessibility/SKILL.md)).
- Many icons: use an **icon library component** (tree-shaken) or an SVG **sprite** (`<use href="#id">`); do not ship an icon font ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md) §5).

## 3. CSS shapes

```css
.avatar      { clip-path: circle(50%); }
.badge-cut   { clip-path: polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%); }   /* corner cut */
.hero-slant  { clip-path: polygon(0 0, 100% 0, 100% 88%, 0 100%); }              /* angled bottom edge */
.blob        { border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%; }              /* organic, 8-value radius */
.text-wrap   { shape-outside: circle(50%); float: inline-start; width: 12rem; aspect-ratio: 1; }  /* text flows around */
.icon-mask   { mask: url(star.svg) center / contain no-repeat; background: currentColor; }
```
- `clip-path` clips hit-testing and box-shadow; apply shadows via `filter: drop-shadow()` on a wrapper.
- Keep `clip-path` shapes responsive with percentages or SVG `clipPathUnits="objectBoundingBox"`.

## 4. Section dividers

- **Wave / curve:** an SVG path as a background or an absolutely positioned `<svg preserveAspectRatio="none">` with `fill` = next section's color; flip with `transform: scaleY(-1)`.
- **Angled:** `clip-path` polygon or a skewed pseudo-element.
- Use sparingly (1-2 per page), match colors exactly via tokens, ensure they do not add layout shift or overflow.

## 5. Pattern and background shapes

- Dots, grids, stripes with gradients (no images): `radial-gradient`, `repeating-linear-gradient`, `conic-gradient`.
- Soft color fields/blobs: blurred radial gradients positioned behind content at low opacity; verify text contrast over them ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).
- Noise/grain overlay (small tiled PNG/SVG filter) to avoid gradient banding; keep it light for performance.
- Decorative shapes are `pointer-events: none`, `aria-hidden`, and positioned within a clipped container (`overflow: clip`).

## 6. SVG animation (cheap and distinctive)

- **Line draw:** `stroke-dasharray: L; stroke-dashoffset: L;` then animate `stroke-dashoffset` to 0 (get `L` from `getTotalLength()`).
- **Morph:** interpolate paths with the **same number and type of points** (libraries or SMIL alternatives); otherwise cross-fade.
- Animate `transform`/`opacity` on groups; avoid animating `d` on huge paths per frame.
- Provide a static end state and honor reduced motion ([`design-motion-implementation`](../design-motion-implementation/SKILL.md)).

## 7. Icons

- One set, one grid (24x24), one stroke width (1.5-2px, consistent `stroke-linecap/linejoin`), one corner style, one fill style (outline **or** solid, not mixed randomly).
- Optical alignment: center icons to cap-height/line box; pair size to text (16/20/24).
- Semantic mapping documented (the same concept always uses the same icon).
- Interactive icons: >= 44px target with padding, accessible name ([`design-ui-components`](../design-ui-components/SKILL.md)).
- No emoji as UI icons (inconsistent rendering); brand marks (Google, Facebook) are the exception and follow the brand's guidelines.

## 8. Illustration style

Pick a style (flat, line, isometric, hand-drawn, 3D-ish) and a limited palette from tokens; consistent stroke/corner/perspective; own the characters/metaphors; ship as optimized SVG; provide dark-mode-safe variants; empty states, onboarding, and errors are the best places for illustration.

## 9. Logo and app icons

Master logo as SVG (light/dark/mono variants, clear space, minimum size). Generate favicons (`.ico` + SVG favicon), Apple touch icon (180), Android/PWA icons (192/512, maskable with safe zone), Open Graph/Twitter images (1200x630) from the one source via a script ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md) §6).

## 10. Checklist

- [ ] One shape language (radius scale, motif) applied consistently.
- [ ] SVGs have `viewBox`, `currentColor`, SVGO-optimized, accessible or hidden.
- [ ] Icons from one set/grid/stroke; no icon font; no emoji UI.
- [ ] Decorative shapes are non-interactive, clipped, and contrast-safe.
- [ ] Animations use transform/opacity/stroke-dashoffset with reduced-motion fallback.
- [ ] Favicons/app/social icons generated from one master.
