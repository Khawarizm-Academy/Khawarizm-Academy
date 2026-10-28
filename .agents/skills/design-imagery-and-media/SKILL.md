---
name: design-imagery-and-media
description: Images, photography, and video on the web - art direction and consistency, responsive images (srcset, sizes, picture), modern formats (AVIF/WebP), aspect-ratio and CLS prevention, LCP image priority, lazy loading, placeholders (blur-up, dominant color), CDN transforms, compression targets, alt text, OG/social images, background and hero video rules, and licensing. Use when adding or optimizing any image or video, directing photography, or fixing slow or shifting media.
---

# Imagery & Media

Images are usually the heaviest bytes and the best persuaders. Make them **specific, consistent, small, and stable**.

## 1. Art direction

- One visual style per product: lighting, color grade, crop, perspective, subject distance. Consistency makes cheap photos look designed.
- Real, specific imagery (your product, people, place, process) beats generic stock; if stock is unavoidable, grade it to match and avoid cliches (handshakes, pointing at screens).
- Decide aspect ratios per context (cards 4:3 or 4:5, hero 16:9 or 21:9, avatars 1:1) and keep them.
- Focal point management: crop with `object-fit: cover` + `object-position` set per image so faces/subjects are not cut off; provide separate mobile crops when composition changes (art direction with `<picture>`).
- Text over images: add a scrim/gradient and verify contrast ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md)).
- Use people and faces ethically: consent, diversity that matches the audience, no misleading edits.

## 2. Responsive, modern markup

```html
<picture>
  <source type="image/avif" srcset="hero-480.avif 480w, hero-960.avif 960w, hero-1600.avif 1600w" sizes="(min-width: 1024px) 50vw, 100vw">
  <source type="image/webp" srcset="hero-480.webp 480w, hero-960.webp 960w, hero-1600.webp 1600w" sizes="(min-width: 1024px) 50vw, 100vw">
  <img src="hero-960.jpg" width="1600" height="900" alt="Chef plating a grilled sea bass" decoding="async" fetchpriority="high">
</picture>
```
- Provide **`width` and `height`** (or CSS `aspect-ratio`) on every image to reserve space (prevents CLS, [`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md) §7).
- `sizes` must reflect the real rendered width, otherwise the browser downloads too much.
- Formats: **AVIF** (smallest), **WebP** (wide support), JPEG/PNG fallback; **SVG** for logos/icons/illustrations; **MP4/WebM instead of GIF**.

## 3. Priority and lazy loading

| Image | Attributes |
| --- | --- |
| LCP/hero image | **no** `loading="lazy"`, `fetchpriority="high"`, preload if discovered late |
| Above the fold, not LCP | eager (default), normal priority |
| Below the fold | `loading="lazy"`, `decoding="async"` |
| Carousel slides after the first | lazy |

Never lazy-load the LCP image. Do not use JS lazy-loaders when native `loading="lazy"` suffices.

## 4. Placeholders

Dominant-color background, or a tiny blurred preview (LQIP/BlurHash/ThumbHash, a few hundred bytes) shown until the image decodes; transition with opacity. Reserve the space regardless.

## 5. Compression targets (starting points)

Hero < ~150-250 KB, card thumbnails < ~30-60 KB, avatars < ~10-20 KB. Quality ~60-80 for AVIF/WebP, ~75-82 for JPEG; strip metadata; do not upload 6000px camera originals - generate variants at build/upload time ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)) or use an image CDN that resizes on the fly.

## 6. Delivery

CDN with long immutable caching and **content-hashed filenames**; correct `Content-Type`; HTTP/2+; `Vary: Accept` if negotiating formats on the fly; preconnect to the image host ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md) §3).

## 7. Alt text and accessibility

- Informative image: describe what matters in context (not "image of"); product photos: name + key attribute; charts: summarize the takeaway; decorative: `alt=""`.
- Linked images: alt describes the destination/action.
- Captions for complex or editorial images; transcripts/captions for video ([`fe-accessibility`](../fe-accessibility/SKILL.md)).
- Descriptive file names help SEO (`grilled-sea-bass.jpg`), alt text helps image search ([`seo-on-page-content`](../seo-on-page-content/SKILL.md)).

## 8. Video

- Background/hero video: muted, loop, `playsinline`, short (5-15 s), tiny bitrate (WebM/H.264, ~1-2 MB), **poster image** as LCP element, `preload="metadata"`/`none`, pause when offscreen and under reduced-motion/data-saver, never essential content.
- Content video: adaptive streaming (HLS) for long videos ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)), captions, controls, no autoplay with sound, a facade (thumbnail + play button) instead of loading heavy third-party embeds until click.
- Provide a static fallback for devices that block autoplay.

## 9. Social and meta images

Open Graph/Twitter card image 1200x630, readable text at small sizes, brand-consistent, per-page where it matters (product, article); favicons/app icons from one master ([`design-shapes-svg-and-iconography`](../design-shapes-svg-and-iconography/SKILL.md) §9).

## 10. Licensing and rights

Use licensed, owned, or properly attributed images; keep a record of sources and licenses; get releases for identifiable people; avoid scraping competitors' photos; respect AI-generated content policies and disclose where required.

## 11. Checklist

- [ ] Consistent style, ratios, crops; text-over-image contrast verified.
- [ ] Responsive `srcset`/`sizes`, AVIF/WebP + fallback, width/height set.
- [ ] LCP image eager + high priority; others lazy; placeholders present.
- [ ] Sizes within budget; CDN hashed immutable caching.
- [ ] Meaningful alt text or `alt=""`; video has poster, captions, reduced-motion/data-saver handling.
- [ ] Licenses recorded.
