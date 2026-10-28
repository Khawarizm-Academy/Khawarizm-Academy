---
name: design-color-and-contrast
description: Color systems and contrast for interfaces - building palettes (brand, neutral, semantic), 9-11 step ramps, the 60-30-10 rule, color roles, WCAG contrast ratios, checking every state, color-blind safety, gradients, glass and overlays, dark-mode color, charts, imagery overlays, and cultural color meaning. Use when choosing or auditing colors, building a theme, designing buttons/badges/charts, or fixing low-contrast text.
---

# Color & Contrast

Color is communication first, decoration second. Pick few colors, assign roles, verify contrast.

## 1. Build a palette

1. **Neutral ramp** (9-11 steps from near-white to near-black) - 80% of the UI. Tint it slightly toward the brand hue for cohesion.
2. **Brand/primary ramp** - actions, links, key highlights.
3. **Accent** (optional, one) - the second voice: highlights, secondary CTAs, premium cues.
4. **Semantic:** success (green), warning (amber), danger (red), info (blue) - each with a background tint, border, and strong text step.
5. **60-30-10:** about 60% dominant neutral, 30% secondary/surface, 10% accent/CTA.

Generate ramps with a perceptual space (OKLCH/HCT) so steps look evenly spaced and keep contrast predictable. Name steps `50...950`.

## 2. Roles, not hexes

Map ramps to roles: `bg, surface, surface-raised, border, text, text-muted, primary, primary-hover, on-primary, accent, success/warning/danger/info (+ -bg, -border), focus-ring, overlay` ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)). Components use roles only.

## 3. Contrast (WCAG 2.x)

| Element | Minimum ratio |
| --- | --- |
| Body text | **4.5:1** |
| Large text (>= 24px, or >= 19px bold) | 3:1 |
| UI components, icons, borders that convey meaning, focus rings | **3:1** |
| Disabled controls / purely decorative | exempt, but keep legible |

Check **every state**: hover, active, disabled, selected, error, placeholder (placeholder text also needs adequate contrast), text on gradients and photos (test the worst spot, or add a scrim), text over glass/blur.

Tools: browser devtools contrast picker, axe, Stark, WebAIM checker. APCA is a useful second opinion for large/light-weight text but WCAG ratios are the compliance baseline.

## 4. Never rely on color alone

Errors: color + icon + text. Charts: patterns/labels/shapes besides hue. Links in body text: underline or other non-color cue. Status badges: text label. Simulate protanopia/deuteranopia/tritanopia and greyscale.

## 5. Buttons and interactive color

- Primary action = highest-contrast saturated color; one per section.
- Secondary = outline/subtle; tertiary = text link.
- Hover/active = shift lightness a step (not hue), keep contrast >= the base.
- Focus ring = distinct 2px outline with 3:1 vs both the element and the background.
- Disabled = reduced contrast **and** `aria-disabled`/cursor change, never the only signal for important states.

## 6. Dark mode

Do not invert. Use dark surfaces with slight blue/brand tint (not pure black except OLED-specific cases), **desaturate** brand colors and raise lightness for text/accents, elevate with lighter surfaces instead of heavy shadows, re-check every contrast pair, avoid large pure-white blocks.

## 7. Gradients, glass, overlays

- Gradients: two to three close hues (analogous), subtle angle; avoid banding by adding slight noise or using more stops; never put body text over busy gradients without a scrim.
- Glass (`backdrop-filter: blur`): needs a solid-enough tint; verify text contrast on the *lightest/darkest possible background* beneath.
- Image overlays: linear-gradient scrims (e.g. `rgba(0,0,0,.55)` to transparent) behind headings.

## 8. Data viz color

Sequential (one hue ramp) for magnitude, diverging (two hues around a neutral midpoint) for +/-, categorical (<= 6-8 distinct, color-blind-safe palette) for groups; label directly; consistent color per entity across charts ([`design-dashboards-and-data-viz`](../design-dashboards-and-data-viz/SKILL.md)).

## 9. Meaning and context

Color meaning is cultural and contextual (red = danger in most UIs; but also luck/celebration in some cultures; green = success/go, also Islamic associations in parts of the world). Choose for the audience; confirm with local stakeholders for global products. Brand colors anchor trust: finance/health lean blue/green; food lean warm; luxury lean deep neutrals with a metallic accent.

## 10. Checklist

- [ ] Neutral + brand (+ accent) ramps; semantic colors with bg/border/text steps.
- [ ] Components consume role tokens only.
- [ ] 4.5:1 text, 3:1 UI/focus verified in every state and on images.
- [ ] Color never the only signal; color-blind and greyscale checked.
- [ ] Dark theme is designed, not inverted.
- [ ] One primary CTA color; limited accent usage.
