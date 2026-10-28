---
name: design-ux-patterns-and-microcopy
description: UX patterns and microcopy for web products - information architecture, navigation depth, onboarding, search and filters, empty/error/success states, confirmation and undo, progressive disclosure, trust and feedback, notifications, permission requests, and writing buttons, errors, empty states, and confirmations (including Arabic tone). Use when planning flows, naming actions, writing UI text, or reviewing usability.
---

# UX Patterns & Microcopy

Reduce thinking, prevent errors, and explain outcomes in few words.

## 1. Information architecture

- Organize by user goals and mental models, not by your org chart or database tables.
- Keep primary navigation to **5-7** items; depth <= 3 clicks to important content; every page answers "where am I, what can I do here, where next".
- Card-sort or tree-test when labels are debated. Use the words users use (search queries are a source).
- URL structure mirrors the IA ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md), [`seo-on-page-content`](../seo-on-page-content/SKILL.md)).

## 2. Core interaction principles

| Principle | Practice |
| --- | --- |
| Visibility of status | loading, progress, saved/synced indicators |
| Recognition over recall | show options, recent items, autocomplete |
| Error prevention > error messages | constraints, defaults, confirmation for destructive actions |
| Forgiveness | **undo** over "are you sure?" where possible; keep user input |
| Consistency | same action, same label, same place |
| Progressive disclosure | essentials first; advanced behind "More" |
| Fitts/Hick | big, near targets for key actions; fewer choices at once |

## 3. Search and filters

Prominent search with suggestions and recent queries; filters grouped, with counts, applied-filter chips, and a clear "Reset"; results update without a full reload and keep scroll; no-results state suggests fixes; filter and sort state lives in the URL ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).

## 4. Onboarding

Ask the minimum; delay sign-up until value is shown; empty state teaches the first action; checklists with progress for multi-step activation; skippable tours, not forced; remember dismissals.

## 5. Feedback patterns

- **Success:** confirm what happened and what is next ("Course saved. Continue to lesson 2").
- **Error:** what went wrong + how to fix + keep input ([`core-error-handling`](../core-error-handling/SKILL.md)).
- **Destructive:** name the object and consequence ("Delete 'Python 101'? Students will lose access."), primary button repeats the verb ("Delete course"), offer undo/soft-delete.
- **Permissions (notifications, location, camera):** ask in context after explaining the benefit, never on first load.
- Notifications: only actionable ones; group; user controls frequency.

## 6. Trust and reassurance

Show real social proof near decisions (ratings, counts, logos), transparent pricing/fees early, clear policies (returns, privacy), secure-payment cues, real contact info, response-time promises you can keep ([`design-ecommerce`](../design-ecommerce/SKILL.md), [`design-landing-pages-and-conversion`](../design-landing-pages-and-conversion/SKILL.md)).

## 7. Microcopy rules

- **Be specific and short.** Lead with the verb. Sentence case. No jargon, no blame.
- Buttons name the outcome: "Add to cart", "Book a table", "Start lesson" - not "Submit", "OK", "Click here".
- Labels are nouns; helper text answers "why do you need this / what format".
- Error messages: cause + fix, polite, no codes shown to users.
- Empty states: why it is empty + the next action.
- Confirmation: restate the object and effect.
- Placeholders show an example, never the label.
- Consistent terminology: pick one word per concept (course vs class) everywhere; maintain a glossary.

| Instead of | Write |
| --- | --- |
| Error 500 | Something went wrong on our side. Try again in a moment. |
| Invalid input | Enter a valid email like name@example.com |
| Submit | Create account |
| No data | No lessons yet. Add your first lesson. |
| Are you sure? | Delete this course? This cannot be undone. |

## 8. Arabic and bilingual UI voice

Choose a register (Modern Standard Arabic with a friendly tone, or a light dialect for informal products) and keep it consistent; address the user consistently (second person); avoid literal translations of English idioms; keep button labels short; plan for text expansion; keep brand names and technical terms consistent; store all copy in dictionaries ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)). Have a native speaker review marketing copy.

## 9. Flows to design explicitly

Sign up / sign in / forgot password; first-run; search -> detail -> action; checkout/booking; error recovery; empty -> first item; settings -> save; account deletion and data export; offline/slow network.

## 10. Checklist

- [ ] Navigation <= 7 primary items, clear location cues, shallow depth.
- [ ] Destructive actions have undo or explicit consequence text.
- [ ] Every button names its outcome; errors say how to fix; empty states have an action.
- [ ] One term per concept; copy in dictionaries; Arabic reviewed.
- [ ] Permissions asked in context; trust cues near decisions.
