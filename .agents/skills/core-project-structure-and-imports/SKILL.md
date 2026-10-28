---
name: core-project-structure-and-imports
description: Where files live and how imports are written in any feature-based web project (frontend and backend). Use whenever adding, moving, or importing a file - covers the feature-first layout, the shared-vs-feature rule (2+ features means shared), a component category taxonomy (layout, views, chrome, cards, hero, overlays, controls, states, filters, toolbar), alias imports instead of relative chains, import ordering, and a placement matrix for every file kind.
---

# Project Structure & Imports

A folder name should tell you what a file is for, and an import line should read top to bottom without `../../../`. Confirm alias names and root folders in the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)); the rules below are the defaults.

## 1. The golden rules

1. **Feature-first.** Code that belongs to one product feature lives inside that feature's folder.
2. **Two or more features -> shared.** The moment a second feature needs it, it moves to `shared/`.
3. **Mirror front and back.** Backend feature folders carry the same names as the frontend ones, one-for-one, so a feature is easy to find on both sides.
4. **One home per file kind** (matrix below). If you cannot decide, the closest existing folder wins; do not invent a new category for a lone file.

## 2. Default layout

```
src/
  app/                 root app, router, layouts, page loaders
  features/<feature>/
    components/<category>/   UI used only by this feature
    pages/                   top-level screens
    hooks/  data/  context/  feature-only logic
    types.ts                 feature-only types
    <feature>.css            feature-only style classes (if the project uses concept classes)
  shared/
    components/<Category>/   used by 2+ features
    hooks/  lib/  types/  json/ (static data)
  styles/              tokens + global styles
  assets/
```

## 3. Component category taxonomy

Inside `features/<feature>/components/`, every file sits in **one lowercase plural category** that says what it is *for*. Create only the categories the feature uses.

| Folder | What lives there |
| --- | --- |
| `layout/` | page composition roots, shells, data-boundary sections |
| `views/` | render-complete surfaces; Desktop/Mobile pairs go in a component-name folder here |
| `chrome/` | navigation and page furniture: bars, sidebars, breadcrumbs, rails |
| `cards/` | cards, rows, list items, and their sub-visuals |
| `hero/` | hero banners and decorative artwork panels |
| `overlays/` | modals, drawers, toasts, popovers - things that escape the flow |
| `controls/` | inputs, buttons, switches, toggles, action rows |
| `states/` | skeletons, loading, empty, and error states |
| `filters/` | filter and sort panels |
| `toolbar/` | toolbars and pagination strips |

A one-file category is fine; an empty one is not. A different project may rename categories, but it must keep the idea: *purpose folders, not type folders* (avoid `components/buttons`, `components/divs`).

## 3.1 Surface pairs

A component with genuinely different Desktop and Mobile markup gets a **component-name folder** with two files (`views/LoginView/DesktopLoginView.tsx`, `MobileLoginView.tsx`). A single-surface component stays one flat file. See [`fe-component-architecture`](../fe-component-architecture/SKILL.md).

## 4. Imports

1. **Use the alias for every internal import** (`@/` -> `src/` is the common one). Relative chains (`../../../`) are banned; they break the instant a file moves.
2. **Direct file paths.** Import from the exact file. Barrel (`index.ts`) files are a project decision: they hide dependencies, slow builds, and can break tree-shaking, so the default is *no barrels*; a package's public API entry point is the one reasonable exception.
3. `.ts`/`.tsx` extensionless; `.json` and `.css` keep the extension.
4. **Type-only imports** use `import type` when the compiler requires it (`verbatimModuleSyntax`).
5. External packages stay bare (`import { Trophy } from 'lucide-react'`).
6. Order: external packages, then alias imports, then siblings, then styles. Let the formatter/linter enforce it.
7. No circular imports. If two modules need each other, extract the shared part to a third.

```ts
// BAD
import { TopBar } from '../../../shared/components/chrome/TopBar';
// GOOD
import { TopBar } from '@/shared/components/chrome/TopBar';
import type { CatalogItem } from '@/shared/types/entities';
```

## 5. Placement matrix

| What | Where |
| --- | --- |
| Shared component (2+ features) | `shared/components/<Category>/` |
| Feature component | `features/<f>/components/<category>/` |
| Page / screen | `features/<f>/pages/<F>Page` |
| Shared entity types | `shared/types/entities` |
| Feature-only types | `features/<f>/types` |
| Shared hook / feature hook | `shared/hooks/` / `features/<f>/hooks/` |
| Shared helper | `shared/lib/` |
| Static data (lists, labels, config) | `shared/json/` (or `data/` in the feature) |
| Feature styles / shared styles + tokens | `features/<f>/<f>.css` / `styles/` |
| Routes, root shell, lazy page loaders | `app/` |
| Backend feature | `<backend>/features/<f>/` (mirrors frontend) |

## 6. Moving files safely

Moves must not change runtime behavior. After moving: run the build/typecheck (it catches every stale path), the linter, and compare a before/after rendered output or bundle. See [`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md).

## 7. Checklist

- [ ] The file is in the feature if one feature uses it, in `shared/` if two or more do.
- [ ] The folder category says what the file is *for*.
- [ ] Every import uses the alias; no relative chains; no new barrel.
- [ ] Types use `import type`; no circular import was introduced.
- [ ] The backend twin folder (if any) has the same feature name.
