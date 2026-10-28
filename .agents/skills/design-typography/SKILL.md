---
name: design-typography
description: Web typography - choosing and pairing fonts (including Arabic and Latin), modular type scales, fluid type with clamp, line-height and measure, weights, hierarchy, headings vs body vs UI text, numerals, letter-spacing, loading fonts fast (subset, WOFF2, swap, preload, fallback metrics), and typographic details (quotes, ellipsis, hyphenation). Use when setting up fonts, building a type scale, fixing readability, or when text looks unprofessional.
---

# Typography

Most of an interface is text. Good type is the cheapest way to look professional.

## 1. Pairing

- **One display/heading family + one body family** (or one family used in several weights). Three is a smell.
- Pair by contrast with shared proportions (geometric + humanist), not by similarity.
- **Arabic + Latin:** pick an Arabic face and a Latin face with matching x-height/weight feel (e.g. IBM Plex Sans Arabic + IBM Plex Sans, Noto Sans Arabic + Noto Sans, Tajawal/Cairo/Almarai for body). Test mixed strings (numbers, Latin brand names inside Arabic).
- A monospace family only for code and numerals that must align.
- Prefer a variable font to cut requests and gain fine weight control.

## 2. Scale

Use a modular scale (ratio 1.2 minor-third to 1.25 major-third for UI; 1.333+ for editorial). Example tokens: `12, 14, 16, 18, 20, 24, 30, 36, 48, 60`.

```css
:root {
  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-3: clamp(2rem, 1.5rem + 2.5vw, 3.25rem);   /* fluid hero heading */
}
```
Fluid sizes with `clamp()` remove most breakpoint overrides.

## 3. Readability rules

| Property | Guidance |
| --- | --- |
| Body size | >= 16px (mobile too) |
| Line length (measure) | 45-75 characters (`max-width: 65ch`) |
| Line-height | Latin body 1.5-1.65; headings 1.1-1.3; **Arabic body 1.7-1.9** |
| Paragraph spacing | about 0.75-1 line; consistent |
| Alignment | start-aligned for reading; avoid justified on the web unless hyphenation and width are controlled |
| Contrast | 4.5:1 minimum ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)) |
| Weight | 400 body; 500-600 UI emphasis; 700 headings; avoid 100-300 for small text |

## 4. Hierarchy

Three levels do most of the work: **display/heading**, **body**, **meta/caption**. Differentiate by size + weight + color, not by ten different styles. Define roles as tokens: `heading-1..4`, `body`, `body-sm`, `label`, `caption`, `code`.

## 5. Arabic and RTL specifics

- Larger sizes and more line-height than Latin; **no `letter-spacing`**, **no uppercase transform**, avoid italics and fake bold (use real weights).
- Do not break connected letters (no per-letter spans/animations).
- Numerals: choose Western or Eastern Arabic-Indic digits consistently ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md) §3).
- `text-align: start`; `dir="auto"` for user text.
- Diacritics need extra line-height; check clipping.

## 6. UI text rules

Buttons: sentence case, 2-3 words, verb first. Labels: short nouns. Do not truncate important text; truncate with ellipsis only in dense lists and give the full text on hover/focus/detail. Numbers in tables use tabular figures (`font-variant-numeric: tabular-nums`) and align to the end edge.

## 7. Loading fonts without hurting speed

- **Self-host**, WOFF2, **subset** to needed scripts (Arabic + Latin ranges via `unicode-range`), 1-2 families, 2-3 weights.
- `@font-face { font-display: swap; }` (or `optional` for non-critical); **preload** only the one or two critical files with `crossorigin`.
- Fallback stack with matching metrics: `font-family: 'Brand', system-ui, -apple-system, 'Segoe UI', sans-serif;` and `size-adjust`/`ascent-override` to cut shift ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md) §5).
- Avoid render-blocking third-party font CSS when you can self-host.

## 8. Details that signal quality

- Real typographic characters: curly quotes, en/em dashes, the real ellipsis, non-breaking spaces before units/currency.
- `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs (progressive enhancement).
- `hyphens: auto` with a correct `lang` for narrow columns.
- Optical sizing for variable fonts; `font-feature-settings` only when needed.
- Consistent icon/text alignment (icons centered to cap height).

## 9. Checklist

- [ ] <= 2 families; roles defined as tokens; modular/fluid scale.
- [ ] Body >= 16px, measure 45-75ch, suitable line-height (more for Arabic).
- [ ] Hierarchy by size/weight/color with few levels.
- [ ] Arabic: no letter-spacing/uppercase/italics; digits consistent.
- [ ] Fonts self-hosted, subset, swap, one preloaded, fallback metrics set.
