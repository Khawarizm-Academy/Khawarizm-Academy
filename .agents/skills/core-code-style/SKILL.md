---
name: core-code-style
description: Language-agnostic code style and quality standard for any project (TypeScript, JavaScript, Python, SQL, CSS). Use whenever writing, reviewing, or refactoring code - covers short why-comments, no clever code, data-driven lookups instead of growing if/else chains, static data in data files, one source of truth, types over casts, real booleans in config, naming, function size, dead code, and a self-review checklist.
---

# Core Code Style & Quality

The standard every file follows, in any language. Project-specific values (paths, aliases, commands) come from the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)); the principles below never change.

## 1. Comments - one line, say why

```ts
// GOOD - explains a non-obvious reason
/** Charts the browser gives us, or skips when it has none. */

// BAD - restates the code
// loop over the items
// BAD - banner / numbered noise
// ==========  Step 1: Helpers  ==========
```

1. One line per comment. If it needs two, shorten it or delete it.
2. **Why, not what.** The code already says what.
3. No banners, no `// 1.` `// 2.` numbering, no commented-out code (version control remembers).
4. Public functions/classes get a one-line docstring only when the name cannot carry the meaning.
5. A `TODO` carries an owner or ticket, or it is deleted.

## 2. No clever code

Write the obvious version. A new teammate must not pause on a line.

- Banned without a comment explaining why: nested ternaries, bit tricks, comma operators, chained `?.`/`??`/`||` mixes, string slicing that fakes a type conversion, one-liners that need decoding.
- Prefer two plain lines over one dense line.
- Name things for what they are: `isExpired`, `retryDelayMs`, `userById` - not `flag`, `tmp`, `data2`.
- Magic numbers and strings become named constants (`const CACHE_TTL_SECONDS = 300`).

## 3. Data over branching

When a decision grows a new `else if` every time a variant is added, the decision belongs in data.

```ts
// BAD - a new branch per status
const label = status === 'draft' ? 'Draft' : status === 'live' ? 'Live' : status === 'archived' ? 'Archived' : 'Unknown';

// GOOD - a record the compiler checks for exhaustiveness
const STATUS_LABEL: Record<Status, string> = { draft: 'Draft', live: 'Live', archived: 'Archived' };
const label = STATUS_LABEL[status];
```

```python
# GOOD - filters are rows, not a ladder
FILTERS = (
    ("type", "all", lambda item, v: v == "all" or item["type"] == v),
    ("level", "all", lambda item, v: v == "all" or item["level"] == v),
)
def matches(item, params):
    return all(check(item, params.get(key, default)) for key, default, check in FILTERS)
```

| Instead of | Use |
| --- | --- |
| `if/else` or `switch` picking a value | a record/dict keyed by the discriminator |
| a chain picking a component/handler | a record of components/handlers |
| a chain deciding show/hide per surface | flags in config (`desktop: true, mobile: false`) |
| a chain of validators | a list of rule rows run by one loop |

**Allowed `if`s:** early returns/guards, loading/empty/error branches, and rules that cannot be expressed as data. When a chain resists data, the answer is usually a new field in the config, not another `else`.

## 4. Static data lives in data files

Lists, labels, option sets, nav items, copy, and config maps live in JSON/YAML/TS-constant files, not inline in components or views.

- A module next to a data file may only (a) import it, (b) add types/casts, (c) hydrate names into real objects (icon name -> component).
- JSON cannot hold components or functions - store a *name* and hydrate it in one place.
- Cross-feature record types live in one shared types module.

## 5. One source of truth

If a label, path, color, or list appears in two files, one of them is wrong. Derive, do not retype.

- Paths come from one route/target map. Copy from one dictionary. Tabs from one list.
- Class strings are values too: the same run of utilities written twice for the same kind of element is a missing component/class (see [`fe-css-architecture`](../fe-css-architecture/SKILL.md)).
- Before typing a literal, ask: does this already exist in config? Then import it.

## 6. Types over casts - cast once, at the boundary

- Untyped input (JSON, API responses, env, form data, `unknown`) is validated/narrowed **once** at the boundary; inside the app everything is typed.
- A cast inside a component/view means the boundary is in the wrong place.
- Prefer `satisfies`/typed constants over `as`. Never use `any` to silence an error you do not understand.

## 7. Config must be real

```json
{ "enabled": "false" }   // WRONG - a non-empty string is truthy
{ "enabled": false }     // RIGHT
```

Real booleans and numbers in JSON/YAML/env parsing. Parse env strings in one typed helper (`env_bool`, `env_int`, `env_list`), never at call sites.

## 8. Fail loudly

Bad config stops the build or the boot, not the user. Throw with a message naming the exact thing to fix. See [`core-error-handling`](../core-error-handling/SKILL.md).

## 9. Size, shape, and hygiene

- Functions do one thing; if you need "and" to describe it, split it. Rule of thumb: a function that does not fit on a screen deserves a second look.
- Components/modules that mix data loading, business rules, and markup get split along those lines.
- Early returns beat deep nesting; avoid more than 2-3 levels.
- No dead code, unused imports, unused parameters, or unreferenced files. Turn on the compiler/linter flags that catch them.
- No duplicated logic between two surfaces (desktop/mobile, web/admin): one implementation, two thin callers.
- Immutability by default; mutate only inside the function that owns the value.
- Dependencies: add one only if it removes real code; check size, maintenance, and license first.

## 10. Python/backend mapping

The same rules apply to `.py` (and any backend language): one-line comments, no clever code, data-driven filters, one source of truth, fail loudly. Frontend-only parts (CSS concept classes, JSON UI config) simply do not apply.

## 11. Self-review checklist

- [ ] Every comment is one line and explains why.
- [ ] No banners, no commented-out code, no stale TODO.
- [ ] No new `if/else/switch` chain where a lookup would do.
- [ ] No line a new teammate would have to decode.
- [ ] New static data is in a data file; no literal duplicated from config.
- [ ] A class string/value I typed twice is extracted.
- [ ] Casts live at the boundary only; no `any`.
- [ ] Config uses real booleans/numbers.
- [ ] Verified by [`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md) - behavior, not just types.
