---
name: fe-accessibility
description: Web accessibility (WCAG 2.2 AA) for frontends - semantic HTML, keyboard navigation and focus management, visible focus, contrast, accessible names for icon buttons, ARIA only when needed, live regions, modals and drawers, forms, images and media alternatives, reduced motion, touch target size, zoom/reflow, and testing with automated tools plus a manual pass. Use on every UI build, component library work, and before launch.
---

# Accessibility (WCAG 2.2 AA)

Accessibility is quality, legal exposure, and SEO all at once. Build it in, do not bolt it on.

## 1. Semantic HTML first

- Use the right element: `button` (actions), `a` (navigation), `nav`, `main`, `header`, `footer`, `section` with a heading, `ul/ol`, `table` for tabular data, `form`/`label`/`input`.
- **One `<h1>` per page**, headings in order (no skipping levels for styling).
- Landmarks: one `main`, labeled `nav`s; a **skip link** to `main` first in the tab order.
- Do not make clickable `div`s. If unavoidable: `role`, `tabindex="0"`, and key handlers (Enter/Space) - but prefer `button`.
- `lang` on `<html>`; `dir` for RTL; `lang` on foreign-language fragments.

## 2. Keyboard

- Everything operable by keyboard: Tab/Shift+Tab order follows visual order; no keyboard traps.
- **Visible focus** on every focusable element (never `outline: none` without a replacement; a 2px offset ring at 3:1 contrast works).
- Composite widgets (tabs, menus, listboxes) use arrow keys, Home/End, Esc to close.
- **Modals/drawers:** move focus in on open, trap it inside, close on Esc, **return focus** to the trigger, make the background inert (`inert` or `aria-hidden`), lock body scroll.
- Skeleton and decorative nodes are `aria-hidden`.

## 3. Names, roles, states

- Every control has an **accessible name**: visible text, `aria-label` for icon-only buttons (`<button aria-label="Save"><BookmarkIcon aria-hidden/></button>`), or `aria-labelledby`.
- Prefer native semantics; add ARIA only to fill gaps (`aria-expanded`, `aria-controls`, `aria-selected`, `aria-current="page"`, `aria-pressed`, `aria-invalid`, `aria-describedby`). **No ARIA is better than wrong ARIA.**
- State is exposed (`aria-expanded` on a disclosure; `aria-current` on the active nav item), not only shown by color.

## 4. Color and contrast

- Text contrast at least **4.5:1** (3:1 for large text, >= 24px or 19px bold); UI components, icons, and focus rings at least **3:1** against adjacent colors.
- Never convey meaning by color alone (add icon/text/pattern).
- Check **every** state: hover, focus, disabled, selected, error, and text over images/gradients ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).
- Support `prefers-color-scheme` and `forced-colors` where practical.

## 5. Images, media, motion

- Informative images: meaningful `alt`; decorative: `alt=""`; complex charts: a text summary or data table.
- Video: captions; audio: transcripts; no autoplay with sound; provide pause for moving content longer than 5 s.
- **Reduced motion:** honor `prefers-reduced-motion` (remove parallax, big transitions, shimmer); nothing essential depends on animation; nothing flashes more than 3 times per second ([`design-motion-principles`](../design-motion-principles/SKILL.md)).

## 6. Layout and size

- Touch/click targets at least 24x24 CSS px (WCAG 2.2 minimum) - aim for **44x44** on touch UIs ([`design-mobile-first-and-touch`](../design-mobile-first-and-touch/SKILL.md)).
- Content reflows at 320px width and 400% zoom without two-dimensional scrolling; text resizes to 200%; use relative units; do not disable zoom.
- Sticky headers must not hide focused elements (use `scroll-padding-top`).
- Do not rely on hover alone; hover content must be dismissible and persistent.

## 7. Forms and errors

Labels, error association, `role="alert"`, autocomplete, no placeholder-as-label, clear instructions, accessible authentication (allow paste, password managers) - [`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md).

## 8. Dynamic content

- Live regions for async updates (`aria-live="polite"`, `role="status"`); `role="alert"` for errors; `aria-busy` while loading ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
- On route change in an SPA: update `document.title`, move focus to the new page heading or main, and announce the navigation.

## 9. Testing

- **Automated:** axe (jest-axe, Playwright axe, browser extension), Lighthouse accessibility, ESLint a11y plugin. Catches roughly a third of issues.
- **Manual (every feature):** keyboard-only pass, screen reader smoke test (VoiceOver/NVDA/TalkBack), 200% zoom, reduced-motion, high-contrast, and a color-blindness simulation.
- Add a11y assertions to component tests ([`fe-testing-and-visual-qa`](../fe-testing-and-visual-qa/SKILL.md)).

## 10. Checklist

- [ ] Semantic landmarks, one h1, ordered headings, skip link, `lang`/`dir`.
- [ ] Fully keyboard operable; focus visible; modals trap and restore focus.
- [ ] Icon buttons named; ARIA only where needed; states exposed.
- [ ] Contrast 4.5:1 text / 3:1 UI in all states; no color-only meaning.
- [ ] Alt text, captions, reduced motion honored.
- [ ] Targets >= 24px (44px touch); reflow at 320px; zoom allowed.
- [ ] Axe clean + manual keyboard/screen-reader pass.
