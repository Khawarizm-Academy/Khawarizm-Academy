# Khawarizm Academy — Design Tokens & CSS Classes Reference

This reference provides a comprehensive lookup of all design tokens, gradients, CSS variables, and concept-oriented classes defined in `src/styles/globals.css` and `tokens.css`.

---

## 1. CSS Custom Properties (`tokens.css`)

```css
:root {
  /* Dark Cosmic Palette */
  --color-navy-950: #040F24;
  --color-navy-900: #061A3A;
  --color-navy-800: #092557;
  --color-navy-700: #123168;
  --color-navy-600: #1B3F80;

  /* Tech Cyan Accents */
  --color-blue-500: #167BDB;
  --color-blue-400: #29A9FF;

  /* Warm Celestial Gold */
  --color-gold-600: #C88A32;
  --color-gold-400: #E5B65C;
  --color-orange-300: #E5B65C;

  /* Neutrals & Text */
  --color-white-000: #F5F8FC;
  --color-white-100: #DCE5EE;
  --color-slate-400: #8299B5;
  --color-slate-600: #5C7291;

  /* Status Colors */
  --color-success-500: #3FAE6B;
  --color-warning-500: #E0A23B;
  --color-danger-500: #D9534F;

  /* Typography */
  --font-display: 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif;
  --font-body: 'Tajawal', system-ui, -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Inter', monospace;

  /* Radii Scale */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* Elevation Shadows */
  --shadow-elev-1: 0 2px 8px rgba(0, 0, 0, 0.35);
  --shadow-elev-2: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-glow-gold: 0 0 24px rgba(229, 182, 92, 0.25);
  --shadow-glow-blue: 0 0 24px rgba(41, 169, 255, 0.25);
}
```

---

## 2. Gradients & Atmosphere Classes

```css
.gradient-gold {
  background: linear-gradient(135deg, #C88A32 0%, #E5B65C 100%);
}

.gradient-tech {
  background: linear-gradient(135deg, #167BDB 0%, #29A9FF 100%);
}

.gradient-navy {
  background: linear-gradient(180deg, #061A3A 0%, #092557 100%);
}

.space-stars-bg {
  background-image: 
    radial-gradient(1.5px 1.5px at 15% 25%, rgba(229, 182, 92, 0.45) 50%, transparent),
    radial-gradient(1.5px 1.5px at 80% 18%, rgba(41, 169, 255, 0.55) 50%, transparent),
    radial-gradient(1.2px 1.2px at 35% 60%, rgba(220, 229, 238, 0.45) 50%, transparent),
    radial-gradient(1.5px 1.5px at 65% 80%, rgba(229, 182, 92, 0.4) 50%, transparent),
    radial-gradient(2px 2px at 50% 30%, rgba(41, 169, 255, 0.35) 50%, transparent);
}
```

---

## 3. Comprehensive CSS Class Index

### Layout Primitives
- `.page-wrapper`: Root container with `bg-[#040F24]`, `text-[#DCE5EE]`, selection styling.
- `.content-container`: Main content wrapper (`max-w-[1280px]`, responsive padding, flex column).
- `.flex-center`, `.flex-between`, `.flex-start`, `.flex-end`, `.flex-col-center`, `.flex-col-between`.
- `.horizontal-scroll-row`: Horizontal flex swipe row with `-mx-4 px-4 overflow-x-auto` and hidden scrollbar.

### Surfaces & Cards
- `.glass-panel`: Glassmorphic panel with `#061A3A/40`, blur, and `#1B3F80/40` border.
- `.glass-panel-deep`: Opaque glassmorphic panel (`#040F24/90`).
- `.glass-navbar`: Sticky top desktop navigation bar with bottom cyan glow line.
- `.glass-mobile-header`: Sticky mobile top header with bottom shadow.
- `.glass-mobile-bottom-bar`: Fixed mobile bottom navigation with safe-area padding.
- `.card-interactive`: Card with subtle border, 20px shadow, hover `-translate-y-1`.
- `.card-interactive-blue`: Card with hover cyan glow (`#29A9FF`).
- `.card-interactive-gold`: Card with hover gold glow (`#E5B65C`).
- `.card-media-box`: Media image container with `#092557/60` backdrop.
- `.card-icon-box`: Icon box with hover scale.
- `.card-accent-blue` / `.card-accent-gold`: Glowing 2px bottom strip.
- `.card-title`, `.card-title-lg`, `.card-subtitle`, `.card-meta-row`.

### Buttons & Links
- `.btn-gold`: Primary CTA button with gold gradient, active press scale, and drop shadow.
- `.btn-outline-blue`: Secondary CTA button with cyan outline and subtle hover fill.
- `.btn-pill-subtle`: Dark navy button with slate border.
- `.btn-icon-box`: 36x36 squircle button with border.
- `.btn-icon-circle`: 40x40 circle button with border.
- `.link-action-blue` & `.link-action-gold`: Action link with hover background and arrow.

### Forms & Search
- `.search-form-desktop`: 64px rounded pill search bar with `#061A3A/85` glass and blue focus ring.
- `.search-form-mobile`: 56px rounded pill search bar for mobile.
- `.search-pills-container`: Inner capsule holding type filter pills.
- `.btn-search-submit`: Gradient submit button with pulse effect.

### Badges & Tags
- `.badge-gold`: Gold text on `#040F24/85` pill with gold border.
- `.badge-blue`: Cyan text on `#040F24/85` pill with cyan border.
- `.badge-gold-subtle`: Soft gold badge for scholarship coverage.
- `.tag-box`: Rectangular tag with `#092557/40` fill.

### Scrollbar Hiding
- `.no-scrollbar` and `[data-no-scrollbar]`:
  - `scrollbar-width: none !important;`
  - `-ms-overflow-style: none !important;`
  - `::-webkit-scrollbar { display: none !important; width: 0 !important; }`
