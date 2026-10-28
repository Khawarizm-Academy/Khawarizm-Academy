---
name: fe-responsive-layout-and-fixes
description: Responsive layout and layout-bug fixing for web pages - mobile-first breakpoints, centered content wrappers, two-column grid with sticky aside, the "content hugs one side" bug, the "taller column pushes the actions" bug, single-source action rows mounted per breakpoint, sticky chrome rules, z-index layering, safe areas, container queries, and a root-cause edit protocol. Use when a page looks misaligned, has gaps or uneven columns, sticky elements break, or when editing existing layouts.
---

# Responsive Layout & Fixing Existing Pages

Fix the **structure**, not the paint. Read the wrapper chain before touching CSS.

## 1. Responsive foundations

- **Mobile-first:** base styles are the phone layout; `sm:`/`md:`/`lg:`/`xl:` add complexity upward. Typical breakpoints: ~640, 768, 1024, 1280.
- Fluid first: `%`/`fr`/`minmax()`/`clamp()` before fixed widths. `clamp(1rem, 2vw + .5rem, 1.5rem)` for type and spacing.
- Prefer **CSS Grid** for 2-D layout, **Flexbox** for 1-D rows; `gap` instead of margins between siblings.
- **Container queries** (`@container`) when a component's layout depends on its own width, not the viewport.
- Touch targets at least 44x44 px on touch UIs; body text at least ~16px on mobile (also prevents iOS input zoom).
- Safe areas: bottom bars use `padding-bottom: max(env(safe-area-inset-bottom), 16px)`; clear fixed bottom navigation with enough page bottom padding.
- Test at roughly 360-390, 768, 1024, and 1280+ widths and both orientations. No horizontal scroll at any size.
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, and text zoom to 200%.

## 2. Bug #1: content hugs one side

**Symptom:** "everything is on the right and the left is empty" (or the reverse).
**Cause:** the page body is a flex column with `align-items: flex-start` and the content wrapper is `w-full max-w-[1280px]` **without `mx-auto`**. The wrapper pins to the start edge and the far side stays empty on wide screens.
**Fix:** center the wrapper.
```css
.page-container { width: 100%; max-width: 1280px; margin-inline: auto; padding-inline: clamp(1rem, 4vw, 3.5rem); }
```
Diagnose first: look for `items-start`/`justify-start` plus a `max-w-*` child missing `mx-auto`. Compare against a page that looks right and match its wrapper. Inside the centered wrapper keep the primary column wide and the widget column narrow; do not scatter content 50/50.

## 3. Two-column grid (primary + widgets)

```css
.layout       { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
@media (min-width: 1024px) { .layout { flex-direction: row; align-items: flex-start; } }
.layout-main  { flex: 1; min-width: 0; }                 /* min-width:0 lets children shrink/ellipsize */
.layout-aside { width: 100%; }
@media (min-width: 1024px) { .layout-aside { width: 24rem; position: sticky; top: 5rem; align-self: flex-start; } }
```
- DOM order = reading order; RTL flips the visual side automatically through `dir="rtl"` ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).
- A sticky aside keeps the side column "alive" while scrolling. Its `top` must clear the sticky header height.

## 4. Bug #2: the taller column pushes the actions

**Symptom:** the save/reset buttons sit far below the form because a newly added summary card made the *other* column taller; a trailing action row always lands under the **tallest** column.
**Fix:** put the action row **inside the primary column on desktop** and a footer copy on mobile, from **one** render function:
```tsx
const renderActions = (visibility: string) => (
  <div className={`actions ${visibility}`}>
    <button type="submit" className="btn-primary">Save</button>
    <button type="button" className="btn-subtle">Reset</button>
  </div>
);
{/* inside the primary column */} {renderActions('hidden lg:flex')}
{/* form footer */}               {renderActions('lg:hidden')}
```
Never duplicate the markup, only the mount point.

## 5. CTA hierarchy

- One primary action per screen/section (filled, prominent); secondary actions quiet (outline/subtle); section links are links, not buttons.
- Only the single screen-defining CTA gets extra attention effects (halo/pulse). Making every button loud makes none loud.
- Primary pills: generous padding (`px-5 py-2.5`), clear label, press feedback (`active:scale-95`), visible focus.

## 6. Slim top bars

A page-level bar is a minor control: ~56px tall, glass/solid surface matching the app, sticky at the top, search pill at the start edge, tabs at the end, a hairline accent at the bottom. **When its height changes, update every sticky element pinned beneath it** (`top-12` -> `top-14`).

## 7. Sticky rules (never break)

1. **No `overflow-x: hidden` on an ancestor of sticky chrome** - it creates a scroll container and swallows `position: sticky`. Use `overflow-x: clip`.
2. A sticky element only travels inside its **parent**; the parent must be taller than it.
3. **No `position: fixed` chrome under an element with a (filled) `transform`** - a transform makes that element the containing block for fixed descendants. Use sticky overlays, or keep animated wrappers transform-free after the animation ([`design-motion-implementation`](../design-motion-implementation/SKILL.md) §5).
4. Layering via the token scale: sticky bars < rails < dropdowns < modals < toasts ([`fe-css-architecture`](../fe-css-architecture/SKILL.md) §8).
5. `100vh` on mobile includes browser chrome; prefer `100dvh`/`min-h-dvh` for full-height sections.

## 8. Filling empty space (in order)

1. Center the wrapper. 2. Make the short column sticky. 3. Add a compact data card to the short column using the existing card shell. 4. Only then widen `max-width`, staying consistent with the app's content width.

## 9. Edit protocol

1. **Reproduce and inspect** the wrapper chain (flex direction, alignment, `mx-auto`, overflow, transforms).
2. **Find the structural cause** (missing centering, tallest-column push, sticky offset drift, transform containing block). Never patch with compensating margins on one element.
3. **Reuse the same recipe** for the same bug and the same class for the same element.
4. **Verify** build/lint, then look at the page at several widths ([`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md)).

## 10. Checklist

- [ ] Wrapper centered (`margin-inline: auto`) with a shared max-width.
- [ ] Columns collapse to one on small screens; `min-width: 0` on flexible children.
- [ ] Action rows anchored to the primary column; one markup source.
- [ ] Sticky parents are tall enough; no `overflow-x:hidden`/transform ancestors; offsets follow bar heights.
- [ ] No horizontal scroll; tap targets >= 44px; safe areas handled.
