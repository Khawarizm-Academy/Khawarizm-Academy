---
name: fe-component-architecture
description: Component design and reuse rules for React/Vue/Svelte-style frontends - audit-before-build, never rebuild an existing component, composition over duplication, props vs context, state placement, derived state, data boundaries, one shared implementation for desktop and mobile with surface data records, splitting a page into Desktop/Mobile view components with a context provider and hook, icon discipline, and component API conventions. Use when creating, splitting, or refactoring components or pages.
---

# Component Architecture & Reuse

Most of a screen should be **existing parts composed**. New code is the remainder.

## 1. Audit before you build

Before writing a component: search shared components, the feature folder, and the style system for one that already does it (buttons, cards, inputs, dropdowns, empty/error panels, skeletons, modals, search boxes, segmented controls, badges). Reuse or extend; do not clone.

| Need | Do not hand-roll | Reuse |
| --- | --- | --- |
| primary/secondary/subtle/icon action | utility soup on `<button>` | a `Button` component or button classes |
| content card | 60 lines of markup per card | one `Card` + typed props |
| empty/error panel | ad-hoc messages | one `StatePanel` |
| loading | grey boxes | skeleton primitives |
| side-by-side switch | custom toggle each time | one `SegmentedControl` |
| modal/drawer/toast | per-page overlays | shared overlay components |

## 2. Anti-duplication rules

1. A class string you typed twice for the same kind of element is a **missing concept** ([`fe-css-architecture`](../fe-css-architecture/SKILL.md)).
2. A literal that exists in config is imported, not retyped ([`core-code-style`](../core-code-style/SKILL.md) §5).
3. Two components that differ only by data are one component with props.
4. Two surfaces (desktop/mobile) of the same UI are **one component** with a surface record or CSS, not two copies ([§5](#5-desktop-and-mobile)).
5. Pages never render the app shell (header/footer/bottom bar); the layout does.

## 3. Component API conventions

- Props are typed; names say meaning (`onSelect`, `isOpen`, `tone="danger"`); booleans start with `is/has/can`.
- **Variants are data** (`tone`, `size`, `layout`), implemented as records: `const TONE: Record<Tone, string> = {...}`.
- Prefer **composition** (children/slots) over prop explosions (`<Card><Card.Media/><Card.Body/></Card>`).
- Components do one job: presentational pieces take data via props; **data boundaries** own fetching.
- Keep components small (a screenful); extract when markup, logic, and data mix.
- Stable keys (ids, not array indexes) for lists.
- Accept `className` for layout overrides where safe; do not leak internal structure.

## 4. State placement

| State | Home |
| --- | --- |
| server data | the data cache hook ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)) |
| view state worth sharing/bookmarking | the URL ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)) |
| form state | the form library/local state ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)) |
| UI state (open/closed, hover, tab) | local `useState`, as low as possible |
| cross-tree UI state (theme, auth user, a page's surface state) | context + hook, kept small and split by concern |

**Derive, do not copy.** Anything computable from props/state/URL is computed at render (`useMemo` only when measured). Never mirror props into state with an effect.

## 5. Desktop and mobile

Pick the lightest mechanism that works:

1. **CSS only** (`hidden lg:flex`, `lg:hidden`, responsive grid) when only layout differs. Never `if (isMobile)` to pick markup.
2. **One component + a surface record** when labels/classes/widths differ:
   ```tsx
   const TOP_BAR: Record<Surface, { className: string; backLabel: string }> = {
     desktop: { className: 'top-bar', backLabel: 'Back to home' },
     mobile:  { className: 'top-bar max-w-md mb-4', backLabel: 'Home' },
   };
   ```
3. **Flags in data** (`surfaces: ['desktop','mobile']`, `desktop: true`) for which items show where.
4. **Two view components** only when the markup genuinely differs: a folder named after the component, with `Desktop<Name>View` and `Mobile<Name>View`; the **page** becomes a thin orchestrator (provider -> both views -> shared overlays). Shared state flows through a **context + provider + hook**:
   - `context.ts`: `createContext`, the value type, and the `useX()` hook that **throws outside the provider** (fail loudly).
   - `Provider.tsx`: the component that owns state. Keep the hook and the component in separate files so fast-refresh lint rules pass.
   - Use plain props instead when only 2-3 values go to two views; do not prop-drill the same bundle through 4 levels.
5. Shared chrome (top bar, legal notice, toast, modal) exists **once** and is used by both views.

Moving between these: extract shared state first, then shared chrome, then split the views, slim the page, verify DOM parity before/after ([`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md) §2).

## 6. Data boundaries

Static controls (title, search box, filters, toolbar) live in the page. The dynamic list/grid/countdown lives in its own **data-section component** that calls the cache hook and renders loading/error/empty/content. Only that component re-renders when data changes.

## 7. Icons and assets

Use **one icon set** (e.g. `lucide-react`) with a consistent stroke width and sizes; no emoji, no ad-hoc inline SVGs for UI (except illustrations and third-party brand marks). Icon-only buttons need an accessible name ([`fe-accessibility`](../fe-accessibility/SKILL.md)). Logos/brand assets come from one source file and generated outputs ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)).

## 8. Self-contained workspaces

If a user is working inside a workspace (dashboard, editor), do not bounce them to another route for a routine action; resolve it in an in-page overlay/drawer so context and scroll are preserved.

## 9. Pitfalls

| Pitfall | Fix |
| --- | --- |
| rebuilding a card/button/panel | find and reuse |
| `if (isMobile)` markup branches | CSS, surface record, or two view components |
| props mirrored into state with an effect | derive at render |
| one 600-line page | data boundary + sections + views |
| context holding everything | split by concern; local state first |
| index as list key | stable ids |

## 10. Checklist

- [ ] Existing components searched and reused before any new one.
- [ ] Variants are data; composition over prop explosion.
- [ ] State lives at the lowest correct level; server data in the cache; shareable state in the URL.
- [ ] One implementation per UI idea; surfaces differ by CSS/data, or a clean Desktop/Mobile pair.
- [ ] Data boundary isolated; page is a thin composition; shell untouched.
