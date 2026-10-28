---
name: design-review-and-polish-checklist
description: A structured design critique and polish checklist for any UI - first-impression and hierarchy review, layout and spacing, typography, color and contrast, component consistency, states, responsive behavior, RTL, motion, accessibility, performance, content and microcopy, plus how to triage findings by severity and write actionable feedback. Use before handing off any page, when reviewing someone else's UI, when something looks "off", or as the final pass of a build.
---

# Design Review & Polish Checklist

Review in passes, from big to small. Fix structure before pixels.

## 0. Setup

Open the page at **390, 768, and 1280** widths (and RTL/dark if relevant), with real content, on a throttled network. Take screenshots. Compare with the stated goal and design idea ([`design-frontend-execution-playbook`](../design-frontend-execution-playbook/SKILL.md)).

## 1. First impression (5 seconds)

- [ ] I can say what this page is, who it is for, and what to do next.
- [ ] One focal point; the squint test keeps hierarchy.
- [ ] The look matches the brand and audience (not generic template, not off-tone).

## 2. Layout and spacing ([`design-fundamentals`](../design-fundamentals/SKILL.md))

- [ ] Content wrapper centered with a consistent max-width; no side hugging.
- [ ] Spacing from the scale; related items grouped by proximity; section rhythm consistent.
- [ ] Alignment: shared edges/baselines; icons aligned to text.
- [ ] No cramped cards, no edge-to-edge text, no accidental overlaps.
- [ ] Columns collapse properly; action rows anchored correctly ([`fe-responsive-layout-and-fixes`](../fe-responsive-layout-and-fixes/SKILL.md)).

## 3. Typography ([`design-typography`](../design-typography/SKILL.md))

- [ ] <= 2 families; clear scale; body >= 16px; measure 45-75ch; line-height suited (more for Arabic).
- [ ] Headings in order, one h1; no orphan words in headings; real punctuation.

## 4. Color and contrast ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md))

- [ ] 4.5:1 text, 3:1 UI/focus in every state and over images.
- [ ] One primary CTA color; accent used sparingly; no color-only meaning.

## 5. Components and consistency ([`design-ui-components`](../design-ui-components/SKILL.md))

- [ ] Same component looks and behaves the same everywhere; one icon set/weight; consistent radii/shadows.
- [ ] Buttons name outcomes; primary action is unambiguous; secondary is quieter.
- [ ] No leftover prototype tabs, debug controls, or placeholder text.

## 6. States ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md))

- [ ] Loading (skeleton, no layout jump), empty (with action), error (with retry), success.
- [ ] Hover, focus-visible, active, disabled, selected are all designed.
- [ ] Long text, missing images, huge numbers, and zero results do not break the layout.

## 7. Responsive and touch ([`design-mobile-first-and-touch`](../design-mobile-first-and-touch/SKILL.md))

- [ ] No horizontal scroll; targets >= 44px; sticky bars respect safe areas and do not hide content.
- [ ] Mobile layout is designed, not just squeezed desktop.

## 8. RTL and i18n ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md))

- [ ] Layout mirrors correctly; directional icons flip; mixed-direction text isolated; numbers consistent.

## 9. Motion ([`design-motion-principles`](../design-motion-principles/SKILL.md))

- [ ] Every animation has a purpose; only transform/opacity; one hero effect per screen.
- [ ] Reduced-motion variant works; nothing above the fold is delayed.

## 10. Accessibility ([`fe-accessibility`](../fe-accessibility/SKILL.md))

- [ ] Keyboard-only pass works with visible focus; modals trap/restore focus.
- [ ] Names for icon buttons, alt text, labels, error association, landmarks.

## 11. Performance and SEO ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md), [`seo-on-page-content`](../seo-on-page-content/SKILL.md))

- [ ] LCP image prioritized; images sized; fonts subset; no layout shift.
- [ ] Title, description, canonical, headings, structured data where relevant.

## 12. Content and microcopy ([`design-ux-patterns-and-microcopy`](../design-ux-patterns-and-microcopy/SKILL.md))

- [ ] Real content; specific headlines; consistent terms; errors helpful; no lorem ipsum.

## 13. Triage and feedback

| Severity | Meaning | Examples |
| --- | --- | --- |
| **Blocker** | breaks the task, accessibility, or trust | unreadable contrast, unreachable CTA, broken mobile layout, no error state |
| **Major** | clearly hurts quality or conversion | weak hierarchy, inconsistent components, slow LCP, layout shift |
| **Minor** | polish | spacing off by 4px, icon weight mismatch |
| **Idea** | optional upgrade | extra micro-interaction |

Write feedback as **observation -> impact -> specific fix** ("The primary and secondary buttons look identical, so the main action is unclear; make secondary an outline and keep primary filled"). Praise what works so it is preserved. Fix blockers and majors first, re-check, then polish.

## 14. Final pass

Run the gates ([`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md)); remove debug code; confirm nothing was verified only by assumption and say what was not checked.
