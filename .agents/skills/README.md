# Khawarizm Academy — Agent Skills

Seven skills. Read the one that matches what you are doing.

| Skill | Use it when |
| :--- | :--- |
| **[khawarizm-code-style](khawarizm-code-style/SKILL.md)** | Writing, reviewing, or refactoring **any** `.ts` / `.tsx`. One-line comments, no if-chains, static data in JSON, no desktop/mobile duplication, repeated class strings → CSS, verification gates. |
| **[khawarizm-routing](khawarizm-routing/SKILL.md)** | Adding or changing a **route, path, redirect, nav tab, or query param** — or debugging a URL that renders the wrong thing. |
| **[khawarizm-navigation-cache](khawarizm-navigation-cache/SKILL.md)** | **Loading states, skeletons, caching, page transitions, scroll memory.** Read `references/page-loading-caching-guide.md` before touching a page. |
| **[khawarizm-frontend](khawarizm-frontend/SKILL.md)** | **Design system** — observatory tokens, Tailwind v4 concept classes (incl. `.auth-*`, `.catalog-*`, `.dash-*`), repeated-class extraction (§3.7), component catalog, RTL rules, directory placement. |
| **[khawarizm-page-builder](khawarizm-page-builder/SKILL.md)** | Building a **new page or feature end to end** — the 10-step protocol. |
| **[khawarizm-motion](khawarizm-motion/SKILL.md)** | **Animations & micro-interactions** — the Celestial Motion System: entrance cascades, hover lifts/tilts, sliding-puck switches (`SlidingSegmentedControl`), shine sweeps, `btn-attention` halos, countdowns, and their fill-mode caveats. |
| **[khawarizm-layout-edit](khawarizm-layout-edit/SKILL.md)** | **Fixing/editing existing pages** — content hugging one side, centering (`mx-auto`), two-column grids + sticky asides, actions pushed down by a taller column, slim top navigators, sticky offsets, CTA hierarchy, filling gaps. |

## The four rules that cause most rework

1. **Static data goes in `src/shared/json/`.** A `.ts` next to it may only add types or hydrate icon names.
2. **No `if` / `else` chains.** Every branch is a field in the config. `resolveActiveTab`, `findRoute`, `getDashboardNavItem` all exist so nothing needs to branch.
3. **One value, written once.** Paths come from `NAV_TARGETS`, Arabic labels from `localization.json`, nav tabs from `shellNav.json`.
4. **A class string you repeat is a missing concept class.** Extract it into the owning CSS file — `src/features/<feature>/<feature>.css` (e.g. `auth.css`, `catalog.css`, `dashboard.css`) for one-feature classes, `src/styles/globals.css` for shared ones — inside `@layer components` (so JSX utilities can still override it), use `var(--shadow-elev-2)` / `var(--color-overlay-scrim)` / `var(--shadow-glow-gold)` instead of literals, and check the class actually exists. `@apply` accepts real utilities only — plain global helpers (`animate-fade-in-up`, `animation-delay-100`, `group`) stay in the JSX `className`.
5. **Motion comes from the Celestial Motion System only** (`khawarizm-motion`): `animate-pop-in` + staggered `animationDelay` for entrances, `SlidingSegmentedControl` for every side-by-side switch, `btn-attention` on at most one hero CTA per screen, and never hand-roll keyframes for shared motion.
6. **Center wide content wrappers** (`khawarizm-layout-edit`): a `w-full max-w-[1280px]` wrapper inside an `items-start` flex column needs `mx-auto`, or the whole page hugs the RTL start edge and leaves the far side empty — and trailing action rows follow the *tallest* column, so anchor them in the primary column with `hidden lg:flex` / `lg:hidden` mounts.

## Before you finish

```bash
cd frontend
npm run build      # tsc -b + vite build
npx eslint src
```

Then verify **behavior**, not just types — print the old and new output for anything you refactored and confirm they match.
