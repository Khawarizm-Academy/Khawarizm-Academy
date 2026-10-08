---
name: khawarizm-code-style
description: Code style and code quality standard for Khawarizm Academy frontend. Use whenever writing, reviewing, or refactoring any TypeScript or TSX file. Covers short one-line comments, no clever code, no if/else chains, data-driven lookups instead of branching, static data in JSON, no duplication between desktop and mobile, and extracting repeated class strings into CSS concept classes.
---

# Khawarizm Academy — Code Style & Quality Standard

This skill is the **definitive standard** for how code is written in Khawarizm Academy. It applies to every `.ts` and `.tsx` file, in both `src/app/`, `src/features/`, and `src/shared/`.

> These rules exist because they were learned the hard way during the routing and navigation refactor. Every one of them replaced a real bug or a real maintenance problem.

---

## 1. Comments — One Line, Short, Simple

```tsx
// GOOD
/** Every icon a JSON config may reference. */
/** Views rendered on their own, without the two-column grid. */
/** Charts the browser gives us, or skips when it has none. */

// BAD — multi-line prose essay
/**
 * Universal key-to-Arabic converter.
 * Converts any English key to its Arabic display label.
 * If the value is already in Arabic or unknown, returns it safely without crashing.
 * Example: convertKeyToAr('available') -> 'متاح'
 */

// BAD — banner comments
// ============================================================================
// 3. Reverse Dictionary (Arabic-to-English)
// ============================================================================
```

**Rules:**
1. **One line per comment.** If it needs two lines, it is too long — shorten it or delete it.
2. **Say why, not what.** `// render the chart` is noise. `// Charts the browser gives us, or skips when it has none` earns its place.
3. **No `====` banners.** No `// 1.`, `// 2.`, `// Step 1:` numbering inside files. The file order says it already.
4. **JSX comments** follow the same rule: `{/* Sidebar renders first so RTL puts it on the right */}`.
5. **No commented-out code.** Delete it. Git remembers it.
6. **Section headers are allowed only as a single `/** … */` line** when a file has clearly distinct parts.

---

## 2. No Clever Code

Write the obvious version. Cleverness costs a reader more than it saves a writer.

```ts
// BAD — clever cast the reader must decode
export const CATALOG_COURSES_ROUTE = (CATALOG_COURSES_ROUTE.split('?')[0] as string);
const x = (a && b) || (c ?? d);

// GOOD — plain and obvious
export const CATALOG_COURSES_ROUTE = NAV_TARGETS.courses;
const x = a && b ? a && b : c ?? d;
```

**Banned without a comment explaining *why*:**
- Nested ternaries inside JSX props or className strings.
- Bit tricks, comma operators, `!` as a statement.
- Chained optional access mixed with `??` and `||` on the same expression.
- Clever string slicing to fake a type conversion.
- Self-describing one-liners that need a comment to be understood.

**The test:** if a new teammate would pause on this line, rewrite it. Use two lines.

---

## 3. No `if` / `else` Chains — Use Data

This is the single most important rule in this skill. Branches are where bugs hide and where duplication starts.

```tsx
// BAD — the chain grows a branch every time someone adds a nav item
const label = view === 'enrolled' ? 'دوراتي'
  : view === 'saved' ? 'لوحتي'
  : view === 'achievements' ? 'إنجازاتي'
  : 'الرئيسية';

// GOOD — data answers it
const label = VIEW_HEADERS[view].title;
```

**Replace every chain with:**

| Instead of | Use |
| :--- | :--- |
| `if (x === 'a') … else if (x === 'b') …` | a record: `const M = { a: …, b: … }[x]` |
| A chain that picks a component | a record of components, or a map of icon names |
| A chain that picks a payload object | a record keyed by the same discriminator |
| A chain that only shows/hides things | a `surfaces` or `desktop`/`mobile` flag in data |
| `switch` on a view/tab/status | a `Record<Union, T>` so the compiler checks exhaustiveness |

**Allowed `if`s:** early returns for genuinely different work (`if (!canvas) return`), loading/empty/error branches in a component, and feature guards that cannot be expressed as data.

**When a chain resists data**, the answer is usually a new field in the config — not another `else`.

---

## 4. Static Data Lives in `src/shared/json/`

Every list, label, record, and config map goes in a JSON file under `frontend/src/shared/json/`.

```
src/shared/json/
├── auth.json                    # login mode options (short/long labels per surface)
├── catalog.json                 # page titles, sort options, filter groups
├── dashboardChambers.json       # in-dashboard modal content (workspace, arena, scholarship…)
├── dashboardNav.json            # dashboard sidebar items
├── dashboardNotifications.json  # notification type -> payload
├── dashboardViews.json          # per-view title, subtitle, chips
├── footer.json                  # tagline, link columns, copyright
├── localization.json            # every EN -> AR dictionary
├── mockCatalog.json             # mock course + scholarship records
├── mockDashboard.json           # mock dashboard records
├── mockHomepage.json            # mock homepage records
├── routes.json                  # paths, redirects, titles, shell flags
└── shellNav.json                # NAV_TARGETS paths + one tab list
```

**JSON cannot hold a component or a type.** So it stores the *name*, and a `.ts` file next to it hydrates:

```ts
// JSON stores a name because a component is not serializable
{ "key": "courses", "icon": "BookOpen" }

// navigation.ts turns the name into a component
export function resolveIcon(name: string): LucideIcon {
  const icon = ICONS[name];
  if (!icon) throw new Error(`[navigation] Unknown icon "${name}".`);
  return icon;
}
```

**The `.ts` next to a JSON file may only:**
1. Import the JSON.
2. Add a type or cast (`as EnrolledCourse[]`).
3. Hydrate names into components.

If it holds data of its own, that data belongs in the JSON.

**Rule: a `.ts` file next to JSON is allowed to add types and hydrate. Nothing else.**

---

## 5. One Source of Truth — Never Write a Value Twice

If a label, path, or list appears in two files, one of them is wrong.

```tsx
// BAD — the top bar drifts from the navbar the moment a tab is added
const navLinks = [
  { label: 'الرئيسية', path: '/' },
  { label: 'الدورات', path: CATALOG_COURSES_ROUTE },
  // ...restated by hand
];

// GOOD — derived from the one list
{DASHBOARD_TOP_BAR_TABS.map((tab) => (
  <button onClick={() => navigate(NAV_TARGETS[tab.key])}>{toArabicNav(tab.key)}</button>
))}
```

**Before writing a literal, ask:** does this value already exist in a config or a helper? Then import it, do not retype it.

**Applies to:** paths, Arabic labels, icon choices, filter options, sort options, footer links, status labels, mock records, and CSS class strings for the same kind of element.

**Class strings are values too.** The same utility run written twice for the same kind of element is duplicated data — extract it into a concept class and use the short name in JSX. Placement follows the 2+ features rule: **`src/features/<feature>/<feature>.css`** for one-feature classes, **`src/styles/globals.css`** for shared ones (it imports every feature CSS). Declare it in `@layer components` so JSX utilities can still override it; check the class actually exists (a typo like `animate-spin-very-slow` renders nothing). Full rule: `khawarizm-frontend` §3.7.

**What `@apply` accepts.** Real Tailwind utilities only. Plain custom classes (`.flex-center`), marker classes (`group`), and plain global helpers (`animate-fade-in`, `animate-fade-in-up`, `animation-delay-100`) cannot be `@apply`-ed — keep `group` and the global animation helpers in the JSX `className`, or mirror an animation with a raw `animation:` property inside the class (keyframes in `globals.css` stay global).

---

## 6. No Duplication Between Desktop and Mobile

Two variants of the same UI render **one component**. What differs is data or CSS, never a JS branch.

```tsx
// BAD — two components that drift apart
<CatalogFilterSidebar />      {/* 263 lines, hardcoded options */}
<CatalogMobileFilterDrawer /> {/* 213 lines, the same options again */}

// GOOD — one component, two surfaces
<CatalogFilterGroups surface="desktop" tab={type} filters={filters} />
<CatalogFilterGroups surface="mobile"  tab={type} filters={filters} />
```

**How to express the difference:**
- **Layout only** → let CSS handle it (`hidden md:flex`, `md:hidden`). Never `if (isMobile)`.
- **Which items show** → a `surfaces: ["desktop", "mobile"]` field, or `desktop: true` / `mobile: false` flags.
- **Which accent** → a `tone` field, plus `mobileTone` only when mobile truly differs.
- **How many** → one list the page slices.

**Never** write `if (isMobile)` or `isDesktop ? … : …` to pick markup. If desktop and mobile genuinely need different markup, extract the shared part and let each surface compose it.

---

## 7. Types Over Casts — But Cast JSON Once

JSON imports widen every literal to `string`, which breaks unions. Fix it **once**, at the boundary, with a named type — never sprinkle `as` through the components.

```ts
// GOOD — declare the shape, cast once, stay safe everywhere after
interface Dictionaries {
  nav: Record<NavTabKey, string>;
  courseLevels: Record<CourseLevelKey, string>;
}
export const EN_TO_AR = enToArJson as unknown as Dictionaries;
```

- Name the raw shape (`RawRoute`, `FilterGroupConfig`) instead of casting inline.
- Prefer `satisfies` for tables you author in TS.
- A cast in a component means the boundary is in the wrong place. Move it.

---

## 8. Booleans in JSON Must Be Real Booleans

```json
{ "isExternalRoute": "false" }   // WRONG — a non-empty string is truthy
{ "isExternalRoute": false }     // RIGHT
```

A quoted `"false"` silently flips behavior. Write real JSON booleans and numbers.

---

## 9. Fail Loudly on Bad Config

Config errors should stop the build, not reach the browser.

```ts
if (!page) throw new Error(`[routes] "${route.path}" has no page and no redirect.`);
```

Throw when a name is unknown, a required field is missing, or a route is half-defined. A wrong config that renders is worse than one that crashes.

---

## 10. Verification Before You Call It Done

```bash
cd frontend
npm run build      # tsc -b + vite build — must be clean
npx eslint src     # must be clean
```

`tsconfig.app.json` runs `noUnusedLocals` and `noUnusedParameters`, so removing data from a component usually means removing an import too. Expect that.

**Also verify behavior, not just types.** For a refactor, print the old and new output side by side — routes resolved per URL, nav items per view, filter groups per tab — and confirm they match before committing.

---

## 11. Quick Self-Review Checklist

Run through this before finishing any change:

- [ ] Every comment is one line and explains *why*.
- [ ] No `====` banners, no commented-out code.
- [ ] No new `if`/`else`/`switch` chain where a lookup would do.
- [ ] No clever line that needs a comment to decode.
- [ ] New static data is in `src/shared/json/`, not inline in a component.
- [ ] Any literal I typed already exists somewhere in config → import it instead.
- [ ] A class string I caught myself repeating is a concept class in the owning CSS file, not retyped.
- [ ] Desktop and mobile share one component.
- [ ] Casts live at the JSON boundary, not inside components.
- [ ] JSON booleans are real booleans.
- [ ] `npm run build` and `npx eslint src` are clean.
- [ ] Behavior verified, not assumed.

---

## 12. Related Skills

- **Routing and URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) — the route table, `NAV_TARGETS`, query params, shell flags.
- **Data boundaries and loading:** [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md) — skeletons, SWR caching, page transitions.
- **Design and component reuse:** [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) — tokens, class catalog, directory rules.
- **Adding a page:** [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md) — the full 10-step flow.
