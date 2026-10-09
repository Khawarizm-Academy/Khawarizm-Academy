---
name: khawarizm-layout-edit
description: How to edit, rebalance, and fix existing Khawarizm Academy pages — layout alignment, centering, multi-column grids, sticky chrome offsets, the desktop-vs-mobile single-source pattern, CTA hierarchy, slim top navigators, and filling empty space. Use whenever a page looks misaligned (content hugging one side of the viewport), has gaps or uneven columns, duplicated or misplaced action buttons, spacing problems, or needs design polish that must stay consistent with the rest of the app.
---

# Khawarizm Academy — Editing & Fixing Pages (Layout, Alignment & Polish)

Use this skill whenever you are **changing an existing page** rather than creating one from scratch: fixing misalignment, removing gaps, rebalancing columns, moving actions, restyling a bar, or tightening the design. It encodes the layout bugs found and fixed in the dashboard/profile work so you never re-invent the fix.

---

## 1. The #1 Misalignment Bug: Content Hugs One Side

**Symptom (found on Dashboard & Profile):** "most elements are on the right side and the left is empty."

**Root cause:** the wide page body is a flex column with `align-items: flex-start` (`.dash-main`) and the content wrapper is `w-full max-w-[1280px]` **without `mx-auto`**. In RTL the start edge is the right, so the whole column gets pinned next to the sidebar and the far side stays empty on wide screens.

**The fix recipe:**
```css
.dash-container {
  @apply w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 ... ;
}
```
- **Diagnose first**: check the page wrapper for `items-start`/`justify-start` + a `max-w-*` child missing `mx-auto`. That combination is always the culprit.
- Compare against pages that look right (Catalog/Home): they center via `.content-container`'s `mx-auto`. Match that.
- "Keep the most in one of sides": centering the **wrapper** is enough — inside it, keep the primary column wider (right in RTL) and the widget column narrow (left). Do not scatter content 50/50.

---

## 2. Two-Column Grid Recipe (primary + widgets)

Established by the dashboard grid:

```css
.dash-grid      { @apply self-stretch flex flex-col lg:flex-row justify-start items-start gap-8 w-full; }
.dash-grid-main { @apply flex-1 min-w-0 w-full flex flex-col justify-start items-start gap-8 order-1; }
.dash-grid-aside{ @apply order-2 w-full lg:w-auto lg:sticky lg:top-20 lg:self-start; }
```

- **Order in RTL:** `order-1` (main) renders on the **right**, `order-2` (aside/widgets) on the **left**. The `dir="rtl"` wrapper does this — do not flip the DOM.
- **Aside width:** the widget column is a child with `w-full md:w-96` (384px) — `lg:w-auto` on the wrapper shrink-wraps it. Result ≈ 70/30 split at 1280px.
- **Fill the left while scrolling:** `lg:sticky lg:top-20 lg:self-start` on the aside makes the widgets ride along so the side column never reads empty. Offset `top-20` (80px) clears the 56px top bar.

---

## 3. The "Taller Column Pushes the Actions" Bug

**Symptom (found on Profile):** the save/reset buttons sit far below the form — "there's a big space" — because a new card (account summary) made the **left** column taller, and a trailing action row always lands below the tallest column.

**Rule:** a trailing action row follows the *tallest* column. If the buttons must sit under the *primary* column (and not be pushed by the secondary/summary column), the action row must **live inside the primary column on desktop**.

**The single-source pattern** (already used by `EnrolledCourseCard` and the profile save row): render the action block once through a `render*` function and mount it twice with visibility utilities:

```tsx
const renderSaveActions = (visibilityClass: string) => (
  <div className={`profile-actions ${visibilityClass}`}>
    <button type="submit" className="btn-gold btn-attention ...">حفظ التغييرات</button>
    <button type="button" className="btn-pill-subtle ...">استعادة الافتراضي</button>
  </div>
);
// Desktop: inside the primary column, after its cards:
{renderSaveActions('hidden lg:flex')}
// Mobile: form footer (full-width, at the very bottom):
{renderSaveActions('lg:hidden')}
```

- `hidden lg:flex` anchors the desktop copy under the primary column; the tall secondary column (with the summary card) extends **below** it without affecting it.
- `lg:hidden` keeps a full-width footer at the bottom of the mobile stack (columns collapse to `flex-col`).
- Same principle for any "actions under a multi-column layout" — never duplicate the button markup itself, only the mount point.

---

## 4. CTA Hierarchy (what "big & attractive" means here)

Make the *important* actions prominent, keep secondary ones quiet — and only make the most important one *enticing*:

| Role | Class(es) | Notes |
| :--- | :--- | :--- |
| One primary hero CTA per screen (gold) | `btn-gold` | + `btn-attention` **only** for the single screen-defining CTA (challenge enter, save profile). |
| Course-domain primary action | `dash-course-action dash-course-action-active px-5 py-2.5 text-sm` (list rows) / `self-stretch px-4 py-2.5` (cards) | Blue gradient `from-blue-400 to-blue-500 text-white` + glow + hover shine-sweep; a taller/filled variant over a subtle pill is the "value up" move (course row "استمر"). |
| Competition strong CTA | `dash-cta-blue` (blue) / `btn-gold` (gold) | `dash-cta-blue` is a filled rounded gradient pill now — never a bare outline for an important action. |
| Secondary / quiet | `btn-pill-subtle`, `btn-outline-blue`, `dash-cert-cta` (translucent blue outline) | Keep these visibly secondary. |
| Section link "عرض الكل" | `dash-section-link` / `link-action-*` | A link, not a competing button. |

- Buttons must be **big enough to be obvious**: `px-5+ py-2.5` pills with `text-sm`, glow shadows (`shadow-[0_0_14px_rgba(41,169,255,0.35)]`), `active:scale-95`, and shared hover shine — not micro links.
- Do not make *every* button loud — the user's rule is "only the important buttons enticing on sight".

---

## 5. Slim Top Navigator Pattern (the `dash-topbar`)

A small navigator above page content is a *minor* control — keep it slim but designed:

- **Height:** `h-14` (56px) at most — "a little bigger, not too much".
- **Surface:** glass to match the rest: `bg-navy-950/90 backdrop-blur-md border-b border-navy-600/80`, `sticky top-0` (`hidden md:flex` when the mobile shell owns navigation).
- **Start edge (RTL right):** a **search pill** — icon + label — not a bare circle: `h-9 px-3.5 rounded-full bg-navy-900/80 border border-navy-600 hover:border-blue-400/70`, magnifier `rotate-12 scale-110` on hover.
- **End edge (RTL left):** icon+label tabs, each a hover pill (`.dash-topbar-tab`): `px-3 py-2 rounded-full hover:bg-navy-800/70`, icon lifts `-translate-y-0.5 scale-110` + tints blue on hover.
- **Signature:** a 1px cyan gradient hairline along the bottom edge (`.dash-topbar-hairline`), tying the bar into the celestial chrome.
- **Entrance:** `animate-fade-in-down` on the header. Keep `relative` so the hairline anchors.

**Dependent offsets must follow the bar's height.** When the top bar changes height, update every sticky element that pins under it — the mobile sub-nav used `md:top-12` for the old 48px bar and moved to `md:top-14` when the bar became 56px.

---

## 6. Sticky Chrome Rules (never break these)

1. **No `overflow-x-hidden` ancestors** — they create a scroll container and swallow sticky. The page shell uses `overflow-x-clip` on `.dash-page`/`.page-wrapper`.
2. **The parent must be taller than the sticky element** (the rail `sticky top-0 h-screen` inside tall `.dash-main`; the aside `lg:sticky` inside the grid).
3. **No `position: fixed` for chrome under the page-transition wrapper** — `.animate-page-enter` keeps a filled `transform` under non-View-Transition browsers, which becomes the containing block for `fixed`. Use `sticky` overlays (the expanding sidebar rail is `absolute` inside a `sticky` lane for this reason).
4. Keep the layering sensible: top bar `z-20`, sub-nav/rail `z-30`, overlays/modals `z-50`.

---

## 7. Filling Empty Space (gaps)

When a column/page "reads empty", in this order:
1. **Center the wrapper** (`mx-auto`) — most empty-side complaints are just that.
2. **Stick the widget column** (`lg:sticky`) so it stays filled during scroll.
3. **Add a compact data card** to the short column (e.g. profile "ملخص الحساب" stat rows: `.profile-stat` = `flex justify-between p-3 rounded-xl bg-navy-950/50 border border-navy-600/40`), reusing `SettingsCard` for the shell so the design stays uniform.
4. Only then consider widening `max-w` — stay consistent with the app's `1280px` content width.

---

## 8. Edit Protocol (fix the root cause, not the paint)

1. **Reproduce & inspect**: read the page's wrapper chain (flex direction, alignment classes, `mx-auto` presence) and column structure before touching CSS.
2. **Find the structural cause** (missing centering, tallest-column push, sticky offset drift) — never fix by adding compensating margins to a single element.
3. **Reuse first**: the same bug pattern fixes with the same recipe (this skill); the same element fixes with the same class (frontend skill §3).
4. **Verify**: `npm run build` and `npx eslint src` inside `frontend/` must pass; then confirm in a browser (mobile tab strip stability, desktop columns, no dead hover classes).

---

## 9. Cross-References

- Design system, directories, anti-duplication: [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md)
- Motion & animations: [`khawarizm-motion`](../khawarizm-motion/SKILL.md)
- Creating new pages: [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md)
- Routing & URL/view params: [`khawarizm-routing`](../khawarizm-routing/SKILL.md)
- Code style & quality: [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md)