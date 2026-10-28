---
name: design-frontend-execution-playbook
description: The process for turning a brief, mockup, or idea into a high-quality frontend result on the first try - gather references and constraints, define tokens before markup, build structure then states then polish, pick one strong visual idea, avoid generic template output, check at multiple viewports, and run a final quality pass. Use at the start of any UI or page build, redesign, or "make it look great" request, together with the design and frontend skills.
---

# Frontend Execution Playbook - how to get the best result

Great frontend work is **decisions made in the right order**. Skipping to markup produces generic output. Follow the sequence.

## 0. Prerequisites

Read the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)) for brand, tokens, stack, and conventions. Pick the matching domain skill: [`design-ecommerce`](../design-ecommerce/SKILL.md), [`design-restaurants-and-food`](../design-restaurants-and-food/SKILL.md), [`design-landing-pages-and-conversion`](../design-landing-pages-and-conversion/SKILL.md), [`design-dashboards-and-data-viz`](../design-dashboards-and-data-viz/SKILL.md), [`design-website-types-playbook`](../design-website-types-playbook/SKILL.md).

## 1. Frame the job (5 minutes, in writing)

- **Who** is the user and **what single outcome** must this screen achieve (buy, book, sign up, learn)?
- **Where** will it be used (phone in hand, desktop at work), in which language/direction, on what network?
- **Constraints:** brand, stack, performance budget, accessibility level, deadline.
- **One-sentence design idea:** the visual concept that makes it memorable and fits the brand ("a warm, tactile bakery menu", "a calm clinical dashboard"). Everything must serve it.

## 2. Gather references, then decide

- Collect 3-5 references in the same domain and 1-2 outside it; note **what** works (layout, hierarchy, density, motion), not just that it looks nice.
- If given a mockup/Figma/screenshot: extract spacing rhythm, type scale, color roles, component list, and breakpoints **before** coding; treat generated design-to-code HTML as rough structure, not final code.
- Audit what already exists in the codebase (components, classes, tokens) and reuse ([`fe-component-architecture`](../fe-component-architecture/SKILL.md)).

## 3. Tokens before markup

Define (or read) the system first: color roles, type scale, spacing scale, radius, shadows, motion durations, breakpoints ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md), [`design-typography`](../design-typography/SKILL.md), [`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)). A page built on tokens is consistent for free; a page built on ad-hoc values never converges.

## 4. Structure -> content -> states -> polish

1. **Skeleton layout:** the grid, containers, and regions at mobile width first; then expand to desktop ([`fe-responsive-layout-and-fixes`](../fe-responsive-layout-and-fixes/SKILL.md)).
2. **Real content, not lorem:** realistic text lengths (including long Arabic/English strings), real prices, real images. Design breaks on real data, not placeholders.
3. **Hierarchy:** one clear focal point per screen; size, weight, color, and space establish order ([`design-fundamentals`](../design-fundamentals/SKILL.md)).
4. **All states:** loading, empty, error, hover, focus, active, disabled, selected ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
5. **Interaction and motion:** purposeful, short, with reduced-motion fallback ([`design-motion-principles`](../design-motion-principles/SKILL.md)).
6. **Polish:** alignment, rhythm, icon weights, image treatment, microcopy ([`design-review-and-polish-checklist`](../design-review-and-polish-checklist/SKILL.md)).

## 5. Avoid the generic look

Signs of template output: default system fonts, centered hero with gradient blob, three identical feature cards with emoji, stock-photo handshake, uniform grey spacing, everything the same size. Instead:

- Commit to **one distinctive element** (a type pairing, a shape language, a color field, a layout asymmetry, a signature motion) and repeat it with discipline.
- Use **contrast of scale and weight**, generous whitespace, and a restrained palette (a dominant color, one accent).
- Make imagery specific and consistent (same lighting/crop style); craft empty states and 404s.
- Keep it **appropriate**: a clinic is not a game studio; restraint reads as quality.

## 6. Build quality rules

- Semantic HTML first; accessible by default ([`fe-accessibility`](../fe-accessibility/SKILL.md)).
- Mobile-first, fluid sizes, container-aware components.
- No repeated class strings; concept classes and tokens ([`fe-css-architecture`](../fe-css-architecture/SKILL.md)).
- Performance from the start: image dimensions, lazy loading, route splitting ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).
- RTL and i18n from the start when relevant ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).
- SEO basics on public pages: title, description, headings, structured data ([`seo-on-page-content`](../seo-on-page-content/SKILL.md)).

## 7. Verify like a reviewer

Screenshot at 390 / 768 / 1280 (and RTL/dark if relevant); keyboard through the page; throttle the network; run the gates ([`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md)); compare with the references and the one-sentence design idea. Fix what a critical reviewer would flag first: hierarchy, alignment, contrast, states.

## 8. Handoff

Explain the decisions briefly (idea, tokens, what was reused, what is new), list what you did **not** verify, and note follow-ups. Update the project profile if a durable convention was introduced.

## 9. Checklist

- [ ] Goal, audience, constraints, and a design idea written down.
- [ ] References analyzed; existing components/tokens audited.
- [ ] Tokens defined before markup; real content used.
- [ ] Mobile-first structure; all states; purposeful motion; accessible.
- [ ] Distinctive but appropriate; not template-generic.
- [ ] Verified across widths, keyboard, slow network; gates pass.
