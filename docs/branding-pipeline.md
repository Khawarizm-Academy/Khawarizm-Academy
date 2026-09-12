# Khawarizm Academy — Brand Asset Pipeline

This document outlines the automated brand asset generation and management workflow for Khawarizm Academy.

---

## 1. Single Source of Truth

The master academy logo is located at:

```
frontend/src/assets/brand/source/KhawarizmLogo.jpg
```

- **DO NOT** edit or overwrite generated assets manually.
- To update the academy branding, simply replace the master logo file above.
- The pipeline preserves original colors, proportions, and visual motifs (astrolabe circular seal, gold emblem, deep navy field).

---

## 2. Generated Brand Assets

Running the brand generator produces all standard platform assets in:

```
frontend/src/assets/brand/generated/
```

| Asset File | Dimensions / Format | Purpose | Platform Integration |
| :--- | :--- | :--- | :--- |
| `logo.png` | Max 800px width (PNG) | Master high-resolution logo | Landing pages, auth, headers |
| `logo.webp` | Max 800px width (WebP) | Web-optimized master logo | Performance-critical web views |
| `icon-512.png` | 512 × 512 (Square PNG) | High-res app / PWA icon | PWA manifest, app stores |
| `icon-192.png` | 192 × 192 (Square PNG) | Standard PWA icon & Seal | Navbar seal, Mobile header, Footer |
| `apple-touch-icon.png`| 180 × 180 (Square PNG) | iOS Home Screen icon | `index.html` (`<link rel="apple-touch-icon">`) |
| `favicon-32.png` | 32 × 32 (Square PNG) | Standard browser favicon | `index.html` (`<link rel="icon">`) |
| `favicon-16.png` | 16 × 16 (Square PNG) | Compact browser favicon | `index.html` (`<link rel="icon">`) |
| `favicon.svg` | Vector SVG (192 × 192 viewBox) | Modern browser vector favicon | `index.html` (`<link rel="icon" type="image/svg+xml">`) |
| `favicon.ico` | Fallback ICO / 32 × 32 | Legacy browser root favicon | `public/favicon.ico` |
| `loading-logo.png` | Max 300px (PNG) | Loading / splash logo | Preloader (`AstrolabeLoader.tsx`) |
| `og-image.jpg` | 1200 × 630 (JPEG) | Social share / Open Graph | `index.html` (`og:image`, `twitter:image`) |

Public root icons (`favicon.svg`, `favicon.ico`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.jpg`) are also automatically mirrored to `frontend/public/` so web crawlers, search engines, and browsers can resolve them directly at the site root.

---

## 3. Regenerating Assets

From the `frontend` directory, run:

```bash
npm run brand:generate
```

This runs:
```bash
node ./src/scripts/generate-brand-assets.mjs
```

The script is fully idempotent: running it again safely regenerates and synchronizes the entire asset set.

---

## 4. Format Considerations

- **Master Source:** The current master logo is a high-resolution raster JPEG (`KhawarizmLogo.jpg`).
- **Aspect Ratio & Proportions:** Aspect ratios are strictly preserved (`fit: "inside"` for logos, `fit: "cover"` with center alignment for square icons) with zero stretching or distortion.
- **Future Recommendation:** For crisp resolution-independent scaling on 4K/retina displays, obtaining an official vector SVG or transparent PNG source from the brand designer is recommended for future iterations, but not required for current production usage.
