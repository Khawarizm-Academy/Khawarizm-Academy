---
name: fe-rtl-and-i18n
description: Right-to-left (Arabic, Hebrew, Persian, Urdu) and internationalization rules for frontends - dir attribute, CSS logical properties, flex/grid order in RTL, icons and directional arrows, mirroring rules, bidirectional text and numbers, Arabic typography and fonts, form inputs, localization keys (English keys internally, translated at display), dictionaries, pluralization, dates/numbers/currency with Intl, and URL/SEO considerations. Use for any Arabic or multilingual UI, or any time text direction matters.
---

# RTL & Internationalization

Build direction-agnostic layouts and keep text out of the code.

## 1. Direction basics

- Set `<html lang="ar" dir="rtl">` (per page language); the browser then mirrors flow, text alignment, and flex/grid start/end.
- Use **CSS logical properties** so one stylesheet works for both directions:

| Physical (avoid) | Logical (use) |
| --- | --- |
| `margin-left/right`, `padding-left/right` | `margin-inline-start/end`, `padding-inline-*` (Tailwind: `ms-*`, `me-*`, `ps-*`, `pe-*`) |
| `left/right` | `inset-inline-start/end` (`start-*`, `end-*`) |
| `text-align: left` | `text-align: start` (`text-start`) |
| `border-left`, `border-top-left-radius` | `border-inline-start`, `border-start-start-radius` |
| `float: left` | `float: inline-start` |

- In flex/grid, **child #1 sits at the start edge**: in RTL that is the **right**. A right-hand sidebar in RTL is the **first** DOM child; do not reverse the DOM to "fix" it.
- Icon + label rows: icon first (right in RTL), label second. Avoid `justify-between` for nav items where you want them grouped at the start.

## 2. What to mirror and what not

| Mirror in RTL | Do not mirror |
| --- | --- |
| back/forward arrows, chevrons, "next" and "previous", progress direction, sliders, carousels, sidebar side, breadcrumbs separators | logos, photos, video controls (play), clocks, checkmarks, music notation, phone numbers, charts' time axis conventions (usually keep), most universal symbols |

Directional icon rule: arrows point **along the reading flow** (`<-` means next in RTL). Use `rtl:rotate-180` / `[dir=rtl] .icon-flip { transform: scaleX(-1); }` for directional icons only.

## 3. Bidirectional text and numbers

- Mixed LTR in RTL (Latin names, code, URLs, emails, phone numbers): wrap in `<bdi>` or set `dir="ltr"` on the fragment so punctuation does not jump.
- Inputs: free text `dir="auto"`; email/URL/phone/code/password fields `dir="ltr"` with `text-align: start` handled per design.
- Numbers: decide Western (0-9) vs Eastern Arabic-Indic digits per product/locale and apply consistently via `Intl.NumberFormat('ar-EG')` or `-u-nu-latn`. Never mix randomly.
- Avoid string concatenation of translated fragments; use whole sentences with placeholders.
- Truncation (`text-overflow: ellipsis`) works with `direction`; check that the ellipsis lands on the end edge.

## 4. Arabic typography

- Use fonts designed for Arabic with a good Latin companion (e.g. IBM Plex Sans Arabic, Tajawal, Cairo, Noto Sans Arabic, Almarai); pick **one display + one body** face and define them as tokens ([`design-typography`](../design-typography/SKILL.md)).
- Arabic needs **more line-height** than Latin (about 1.6-1.9 for body) and slightly larger sizes; never apply `letter-spacing` to Arabic (it breaks letter joining).
- No `text-transform: uppercase` for Arabic; avoid italics (use weight/color).
- Subset fonts and `font-display: swap`; preload the main face ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 5. Localization architecture

1. **English (ASCII) keys in code and URLs; translated text only at display time.** State is `'courses' | 'scholarships'`, never Arabic strings.
2. All copy lives in dictionaries (JSON per locale); components call `t(category, key)` / `toArabic(...)`. One source of truth ([`core-code-style`](../core-code-style/SKILL.md) §5).
3. Missing key -> **fail loudly in dev** (throw/log) and fall back to the default locale in production.
4. **Pluralization** with ICU/`Intl.PluralRules` (Arabic has six plural categories: zero, one, two, few, many, other).
5. Dates, numbers, currency, relative time: `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat` with the locale and calendar the product needs.
6. Keep room for text expansion (German/Finnish) and for Arabic being taller; never fix widths on labels.
7. Do not bake text into images; if unavoidable, provide per-locale assets.

## 8. Layout checks for RTL

Sidebars, drawers (slide from the start edge), toasts (usually end edge), breadcrumbs, pagination arrows, progress bars (fill from the start), form icon placement, tooltips/popovers (placement uses logical sides), scroll rows (initial scroll position at the start edge), and carousels.

## 9. URLs and SEO

Locale in the URL path (`/ar/...`) or subdomain, with `hreflang` alternates and `lang`/`dir` set per page; no auto-redirect by IP only. See [`seo-international-arabic-rtl`](../seo-international-arabic-rtl/SKILL.md).

## 10. Checklist

- [ ] `lang` + `dir` set; logical properties used; no left/right hard-coding.
- [ ] Directional icons flip; neutral icons do not.
- [ ] LTR fragments isolated (`bdi`/`dir=ltr`); inputs have the right `dir`.
- [ ] Arabic font tokens, line-height, no letter-spacing/uppercase.
- [ ] English keys in code/URLs; dictionaries; plural rules and `Intl` formatting.
- [ ] Missing translations are caught in dev.
