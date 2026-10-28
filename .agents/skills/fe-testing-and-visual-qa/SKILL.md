---
name: fe-testing-and-visual-qa
description: Frontend testing and visual QA - the testing pyramid for UI, unit tests for pure logic, component tests with Testing Library, end-to-end tests with Playwright/Cypress, mocking the network, accessibility assertions, visual regression and screenshot review at multiple viewports, RTL and dark-mode checks, and flaky-test rules. Use when adding or changing UI behavior, before merging a feature, or when setting up a frontend test suite.
---

# Frontend Testing & Visual QA

Test what users do and what breaks silently. Keep tests fast, readable, and deterministic.

## 1. The pyramid

| Level | Tool examples | Covers | Share |
| --- | --- | --- | --- |
| Unit | Vitest/Jest | pure logic: formatters, route resolvers, filter functions, reducers | many, fast |
| Component | Testing Library | rendering, states, interaction, a11y of one component | many |
| End-to-end | Playwright/Cypress | a few critical journeys in a real browser | few, stable |
| Visual | Playwright screenshots, Storybook + visual service | layout regressions across viewports/themes | selective |

## 2. What to test

- **Logic that branches** (resolvers, filters, parsers, cache keys) - table-driven tests, one row per case.
- **All states of a data view:** loading, error with retry, empty, content ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
- **Interactions:** click, type, keyboard (Tab/Enter/Esc), form submit, validation messages ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).
- **Routing contracts:** each route resolves to the expected page, redirect, active tab, skeleton variant.
- **Critical journeys end to end:** sign in, search -> detail, add to cart -> checkout, create/edit/save.

## 3. Component test rules

- Query by role/label/text like a user (`getByRole('button', { name: /save/i })`), not by CSS class or test id unless nothing else works.
- Do not test implementation details (state variable names, internal calls).
- Mock at the **network boundary** (MSW or a fake fetcher), not by mocking your own hooks; wrap in the same providers (router, cache) the app uses.
- Add `axe` to key components: no serious violations ([`fe-accessibility`](../fe-accessibility/SKILL.md)).

## 4. Visual QA (every UI change)

Take screenshots at **390, 768, 1280** widths, light and dark if supported, **LTR and RTL**, with long text, empty data, and a loading state. Review for: overflow, misalignment, wrong centering, overlapping sticky chrome, inconsistent spacing, contrast, and focus visibility ([`design-review-and-polish-checklist`](../design-review-and-polish-checklist/SKILL.md)).

Automated visual regression: stable data and fixed time, disable animations (`prefers-reduced-motion` or injected CSS), wait for fonts/images, mask dynamic regions, set a small diff threshold, review diffs by a human.

## 5. Determinism and flakiness

- No real network, no real clock (fake timers), no random data without a seed, no reliance on test order.
- Wait for **conditions** (`findBy*`, `expect(...).toBeVisible()`), never fixed sleeps.
- Isolate state per test (fresh cache/store, cleared storage).
- A flaky test is a bug: fix it or delete it; do not retry-until-green.

## 6. Performance and bundle checks in CI

Fail the build on a bundle-size budget, run Lighthouse CI for key pages ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)), and check no console errors during E2E journeys.

## 7. Checklist

- [ ] Branching logic is covered by table-driven unit tests.
- [ ] Components tested in loading/error/empty/content states with user-like queries.
- [ ] Critical journeys have an E2E test; network mocked at the boundary elsewhere.
- [ ] Screenshots reviewed at three widths, RTL and dark where relevant.
- [ ] No sleeps, no flaky retries; accessibility assertions present.
