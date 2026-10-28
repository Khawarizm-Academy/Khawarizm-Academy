---
name: design-3d-web
description: 3D on the web - choosing between CSS 3D transforms, model-viewer, Three.js / React Three Fiber, Spline, and pre-rendered video or image sequences; glTF asset preparation (Draco/Meshopt/KTX2, polygon and texture budgets), lighting and materials, camera and controls that do not hijack scroll, performance (pixel ratio cap, demand rendering, instancing, disposal), lazy loading with posters, mobile limits, accessibility and reduced motion, and use cases (product viewers, hero scenes, data scenes). Use when adding any 3D element, product viewer, WebGL background, or interactive 3D scene.
---

# 3D on the Web

3D is expensive: download weight, GPU, battery, and accessibility. Use it where it **adds understanding or delight**, and always with a cheap fallback.

## 1. Choose the lightest tool that works

| Need | Use |
| --- | --- |
| a card tilting, a flipping panel, a layered parallax | **CSS 3D transforms** (`perspective`, `transform-style: preserve-3d`, `rotateX/Y`) |
| a product the user rotates/zooms (AR optional) | **`<model-viewer>`** web component (glTF/GLB, poster, AR) |
| a custom interactive scene, particles, shaders | **Three.js** or **React Three Fiber (R3F)** + drei |
| designer-authored interactive scene without code | Spline / Rive exports (check bundle weight) |
| cinematic hero loop | **pre-rendered video** (WebM/MP4 with poster) or a short image sequence |
| charts with depth | rarely; prefer 2D ([`design-dashboards-and-data-viz`](../design-dashboards-and-data-viz/SKILL.md)) |

If a video or a layered 2D parallax gives 90% of the effect, ship that.

## 2. CSS 3D (cheap and effective)

```css
.scene { perspective: 1000px; }
.card  { transform-style: preserve-3d; transition: transform .4s var(--ease-out); }
.card:hover { transform: rotateY(8deg) rotateX(-4deg) translateZ(0); }
.face-back { transform: rotateY(180deg); backface-visibility: hidden; }
```
Use `transform`/`opacity` only; avoid `perspective` on giant trees; remember a filled `transform` creates a containing block for `fixed` descendants ([`design-motion-implementation`](../design-motion-implementation/SKILL.md) §5). Hover-only effects need a touch/keyboard equivalent.

## 3. Asset preparation (where most performance is won)

- Format: **glTF 2.0 / GLB**. Author in Blender/CAD, then optimize with `gltf-transform` / `gltfpack`: dedupe, prune, quantize, **Draco or Meshopt** mesh compression, **KTX2/Basis** textures.
- Budgets (starting points): product model < ~1-2 MB, hero scene < ~3-5 MB total, mobile-first lower; polygons in tens of thousands, not millions; textures <= 2048 (1024 on mobile), power-of-two where required; few materials/draw calls.
- Bake lighting/AO into textures when possible; reuse geometry with **instancing** (`InstancedMesh`).
- Serve from a CDN with long caching and content hashes ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)).

## 4. Rendering setup (Three.js / R3F)

```tsx
<Canvas dpr={[1, 2]} frameloop="demand" camera={{ position: [0, 0, 4], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}>
  <Suspense fallback={<Poster />}>
    <Environment preset="studio" />          {/* image-based light: cheap and good-looking */}
    <Model url="/model.glb" />
    <OrbitControls enableZoom={false} enablePan={false} />   {/* do not hijack page scroll */}
  </Suspense>
</Canvas>
```
- **Cap pixel ratio** (`dpr` max 2, lower on weak devices); **render on demand** (`frameloop="demand"` + `invalidate()`) for static or interaction-driven scenes; pause when off-screen (`IntersectionObserver`) or tab hidden.
- Lighting: one key light + environment map beats many dynamic lights; real-time shadows are costly (bake or use contact shadows).
- Materials: PBR (`MeshStandardMaterial`/Physical) sparingly; avoid transmission/refraction on mobile unless required.
- Post-processing (bloom, DOF) costs fullscreen passes; use selectively and disable on low-end.
- **Dispose** geometries, materials, textures, and render targets on unmount; avoid creating objects in the render loop.
- Handle **WebGL context loss** and unsupported WebGL: fall back to the poster.

## 5. Loading and fallbacks

- **Lazy-load** the 3D chunk (dynamic import) when the section nears the viewport; never in the critical path ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).
- Show a **poster image** (same camera angle, correct dimensions) immediately; swap when the model is ready; reserve space to prevent CLS.
- Device/capability gating: skip or simplify on `prefers-reduced-motion`, data saver, low-memory devices, and non-WebGL browsers; the poster is the permanent fallback.
- Progressive: low-poly/low-res first, upgrade later (optional).

## 6. Interaction and UX

- Provide clear affordances ("Drag to rotate"), reset view, and zoom buttons; keep page scrolling working (touch-action rules, disable wheel zoom unless focused).
- Inertia/damping for a polished feel; keep frame rate steady (target 60fps desktop, 30-60 mobile).
- Hotspots/annotations for product viewers; color/material variants wired to the PDP ([`design-ecommerce`](../design-ecommerce/SKILL.md)).
- Audio off by default.

## 7. Accessibility and SEO

- Provide a text description and static alternative images; do not put essential content only in the canvas.
- Keyboard-operable controls for rotate/zoom; focus order and labels ([`fe-accessibility`](../fe-accessibility/SKILL.md)).
- Honor reduced motion: disable auto-rotate and camera flights.
- Search engines cannot read a canvas: keep headings, copy, and product data in HTML ([`seo-on-page-content`](../seo-on-page-content/SKILL.md)).

## 8. Art direction

Restrained palettes, soft studio lighting, consistent scale and camera angles, subtle motion; 3D should feel part of the brand system (colors from tokens, same easing) rather than a tech demo ([`design-frontend-execution-playbook`](../design-frontend-execution-playbook/SKILL.md) §5).

## 9. Testing

Profile with the browser Performance panel and `stats`/`r3f-perf`; test on a low-end phone, throttled CPU/GPU, and with battery saver; watch memory growth when navigating in and out; verify the fallback path.

## 10. Checklist

- [ ] The lightest technique chosen; a video/2D option was considered.
- [ ] GLB compressed (Draco/Meshopt, KTX2), within size and polygon budgets.
- [ ] `dpr` capped, demand rendering/pausing offscreen, disposal on unmount.
- [ ] Lazy-loaded with a poster; reserved space; WebGL-unavailable fallback.
- [ ] Controls do not hijack scroll; reduced motion honored; text alternative present.
- [ ] Verified on a low-end phone.
