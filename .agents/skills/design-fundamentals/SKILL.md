---
name: design-fundamentals
description: Core visual design rules for any interface - visual hierarchy, the spacing scale and 4/8px rhythm, grids and alignment, proximity and grouping, whitespace, contrast of size/weight/color, consistency, density, elevation and surfaces, borders and radius, imagery treatment, and the rules that separate polished from amateur. Use at the start of any design or UI task, when something "looks off", or when judging a layout.
---

# Design Fundamentals

Design is **organized decisions**. When a layout looks off, one of these is usually broken.

## 1. Hierarchy: one focal point per screen

The eye should know where to look first, second, third. Create order with:

| Lever | Stronger | Weaker |
| --- | --- | --- |
| Size | large | small |
| Weight | bold | regular |
| Color/contrast | high contrast, accent | muted |
| Space | isolated with whitespace | crowded |
| Position | top / start edge / center | bottom / corner |
| Depth | raised, shadowed | flat |

Rules: one primary action per section; do not make everything bold; squint test (blur your eyes - the hierarchy should still read).

## 2. Spacing system

- Use a **scale**, not arbitrary pixels: 4, 8, 12, 16, 24, 32, 48, 64, 96 (multiples of 4/8). Tokens: `space-1 ... space-12`.
- **Proximity = relationship:** related items are closer to each other than to unrelated items (label near its field; card title near its body; section gap > element gap).
- Rhythm: consistent vertical spacing between sections (e.g. 64-96 on desktop, 40-56 on mobile); consistent padding inside similar components.
- Whitespace is a feature; cramming is the most common amateur mistake. When unsure, add space.

## 3. Grid and alignment

- 12-column grid on desktop (4 on phones), consistent gutters (16-32), centered container with a max-width (~1200-1280 for apps, ~680-760 for reading text).
- **Align to edges:** elements share left/right edges; text blocks share baselines; icons align to text cap height.
- Break the grid on purpose (a full-bleed image, an offset heading) never by accident.
- Center what is centered-by-nature (hero, empty states); left/start-align long text and forms.

## 4. Typography and color (summary)

Two type families at most, a modular scale, line length 45-75 characters, body >= 16px ([`design-typography`](../design-typography/SKILL.md)). A dominant neutral base + one brand color + one accent + semantic colors, tested for contrast ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).

## 5. Surfaces, elevation, borders

- Define 3-4 **elevation levels** (page, card, raised/hover, overlay) with shadow + surface color; cards are *lighter/raised* than the canvas on dark UIs, and nested "wells" are darker/inset.
- Borders are low-contrast hairlines; use border **or** shadow, rarely both heavy.
- **One radius language:** pick a base (e.g. 8/12/20 + full for pills) and apply consistently; nested radii = outer radius minus padding.
- Overlays (modals, menus) are solid enough to read over scrims; glass/blur effects only where text contrast remains high.

## 6. Consistency beats cleverness

Same component = same look everywhere (buttons, inputs, cards, badges); same icon weight; same image aspect ratios and corner radius; same date/price/number formats. Inconsistency reads as low quality faster than anything else ([`design-system-and-tokens`](../design-system-and-tokens/SKILL.md)).

## 7. Density and scale

- Content-rich/professional tools: tighter spacing and smaller type, but keep touch targets sizeable on touch screens.
- Marketing/consumer: airy, large type, big imagery.
- Decide density per product and apply uniformly.

## 8. Imagery

Consistent crop, aspect ratio, lighting, and treatment; real, specific photos beat generic stock ([`design-imagery-and-media`](../design-imagery-and-media/SKILL.md)); text over images needs a scrim or contrast check; icons from one set at one weight ([`design-shapes-svg-and-iconography`](../design-shapes-svg-and-iconography/SKILL.md)).

## 9. Common amateur tells (and the fix)

| Tell | Fix |
| --- | --- |
| everything the same size/weight | establish hierarchy, scale up the key element |
| tiny, low-contrast grey text | raise size/contrast; check ratios |
| uneven spacing | adopt the scale; group by proximity |
| too many fonts/colors/radii | reduce to the token set |
| centered long paragraphs | start-align, limit line length |
| cramped cards, edge-to-edge text | add padding (16-24) |
| heavy borders + shadows + gradients together | pick one depth cue |
| misaligned icons/labels | align to baseline/center consistently |
| lorem ipsum layouts | design with real content |

## 10. Checklist

- [ ] One clear focal point and one primary action per section.
- [ ] Spacing from the scale; proximity groups related items.
- [ ] Grid and alignment consistent; wrappers centered.
- [ ] Surfaces/elevation/radius follow a small defined set.
- [ ] Type and color from tokens; contrast verified.
- [ ] Same thing looks the same everywhere.
