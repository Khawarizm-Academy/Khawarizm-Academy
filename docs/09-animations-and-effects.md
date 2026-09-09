# Khawarizm Academy — Master Motion, Animations & Atmospheric Effects Specification

> **Document ID:** `docs/09-animations-and-effects.md`  
> **Status:** Production Reference & Live Implementation Manual  
> **Target Platform:** React 19 + Tailwind CSS v4 + HTML5 Canvas Motion  
> **Aesthetic Mandate:** "Observatory at Night" (المرصد الفلكي الليلي) — ancient astronomical brass instruments fused with cutting-edge futuristic technology. Deep space (`#040F24` / `#061A3A`), celestial gold (`#E5B65C`), electric cyan (`#29A9FF`), and quiet geared precision. Never static, never generic flat SaaS.

---

## 1. Design & Motion Philosophy

### 1.1 The "Observatory at Night" Principle
The platform must feel like standing in an ancient mountain observatory under an infinite starlit Arabian desert sky:
- **Quiet Celestial Precision:** Motion simulates the geared rotation of a brass astrolabe, celestial coordinates, and planetary dials. Transitions use weighted cubic bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`) rather than cartoonish bouncy springs.
- **Atmospheric Luminescence:** In a deep dark navy UI (`#040F24` to `#092557`), elements without light sources become flat and lifeless. We employ multi-layered radial glows, twinkling starfields, illuminated 2px accent bars, and border luminescence to establish physical depth.
- **Semantic Light Coding:**
  - **Celestial Gold (`#E5B65C` / `#C88A32`):** Conveys human triumph, wisdom, active deadlines, and prestigious scholarships. Radiates warm golden light (`box-shadow: 0 0 20px rgba(229, 182, 92, 0.45)`).
  - **Electric Tech Cyan (`#29A9FF` / `#167BDB`):** Conveys digital intelligence, AI courses, live broadcasts, and focus states. Radiates cool photonic energy (`box-shadow: 0 0 20px rgba(41, 169, 255, 0.40)`).
  - **Crimson Signal (`#D9534F`):** Dedicated exclusively to notification badges and urgent system alerts.

---

## 2. Implemented Motion & Particle Systems

### 2.1 Celestial Starfield Canvas Engine (`CelestialCanvas.tsx`)
- **Location:** Mounted in `HeroSection` (Desktop & Mobile) and available across atmospheric sections.
- **Implementation:** Custom HTML5 2D Canvas rendering loop decoupled from React state to ensure 60fps rendering without re-renders.
- **Physics & Behavior:**
  - Dynamic star density computed based on viewport area (`Math.floor((width * height) / 14000)`).
  - Multi-temperature star palette:
    - Pure Celestial White (`#FFFFFF`)
    - Desert Stardust Gold (`#E5B65C`)
    - Deep Space Cyan (`#29A9FF`)
    - Soft Stellar Ash (`#DCE5EE`)
  - Sinusoidal alpha twinkling cycle (individual random period between 3s and 7s).
  - Micro-drift vertical displacement simulating the slow rotation of the earth relative to the heavens.
  - Native resize observer and window cleanup on unmount.

### 2.2 Atmospheric Nebula Breathing Glow (`animate-celestial-pulse`)
- **Implementation:** Radial gradient overlay behind the hero headline with sinusoidal opacity and scale transformation:
  ```css
  @keyframes celestial-pulse {
    0%, 100% {
      opacity: 0.35;
      transform: scale(1);
    }
    50% {
      opacity: 0.65;
      transform: scale(1.05);
    }
  }
  ```
- **Cycle Duration:** 8 seconds, ease-in-out, infinite.

### 2.3 Shimmer Sweep Light Sheen (`animate-shimmer`)
- **Component:** `CompetitionBanner` (Desktop).
- **Visual:** A 45-degree angled translucent light sheen gliding across the outer gold border and banner surface every 5 seconds.
- **Keyframe Specification:**
  ```css
  @keyframes shimmer-sweep {
    0% {
      transform: translateX(180%) skewX(-20deg);
    }
    40%, 100% {
      transform: translateX(-180%) skewX(-20deg);
    }
  }
  ```

### 2.4 Astrolabe Planetary Orbit (`animate-orbit-slow`)
- **Component:** `BrandVisuals` (Space Astrolabe, Brand Crest).
- **Behavior:** The celestial coordinate ellipses and planetary rings rotate continuously at an imperceptible, dignified speed (60 seconds per 360-degree rotation) to evoke living time.

### 2.5 Live Beacon Radar Ping (`animate-radar-ping`)
- **Component:** "ندوة حية" (Live Seminar) badge in `EventSection`.
- **Visual:** A dual-layer concentric indicator:
  - Inner solid white beacon dot.
  - Outer expanding ripple ring scaling from `0.95` to `1.0` while dissipating from 80% opacity to 0% over a 2-second loop.

### 2.6 Interactive 3D Card Hover & Accent Line Blooming
- **Components:** `CourseCard`, `ScholarshipCard`.
- **Resting State:**
  - Elevation: `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.40)`.
  - Border: `border-color: rgba(27, 63, 128, 0.8)`.
  - 2px Accent Bar: At the bottom of the card thumbnail (Cyan for Courses, Gold for Scholarships), semi-transparent gradient.
- **Hover State:**
  - Lift: `transform: translateY(-4px)`.
  - Border bloom: Border illuminates to `#29A9FF`/70 or `#E5B65C`/70.
  - Shadow bloom: `box-shadow: 0 12px 36px rgba(0,0,0,0.65), 0 0 22px rgba(41,169,255,0.25)`.
  - Thumbnail zoom: `transform: scale(1.05)` with `transition-duration: 500ms`.
  - Accent Bar Glow: Bar emits ambient color flare (`box-shadow: 0 0 10px currentColor`).

### 2.7 Smart Search Focus Illumination & Toggle Sliding
- **Component:** `SmartSearchBox` (Desktop & Mobile).
- **Resting State:** Subtle translucent glass backdrop with `#1B3F80` outline.
- **Focus-Within State:**
  - Outline illuminates to `#29A9FF`.
  - Deep atmospheric flare: `box-shadow: 0 0 25px rgba(41,169,255,0.35), 0 8px 32px rgba(9,37,87,0.60)`.
- **Segment Pills:**
  - Active pill receives illuminated border, high-contrast text, and soft radial flare.
  - Hovering over the compass icon causes a smooth 45-degree rotation (`group-hover:rotate-45`).

### 2.8 Navigation Active Gold Underline
- **Component:** `DesktopNavbar`.
- **Visual:** A 2.5px pill underline under the active tab with an intense multi-layered drop shadow:
  ```css
  box-shadow: 0 0 10px #E5B65C, 0 0 20px rgba(229, 182, 92, 0.6);
  ```

---

## 3. Component-by-Component Application Matrix

| Component | Visual Effect / Animation | Primary Tokens | Timing / Trigger |
| :--- | :--- | :--- | :--- |
| **DesktopNavbar** | Active Gold Line Glow | `#E5B65C`, `box-shadow: 0 0 10px` | Instant on tab change, glowing drop-shadow |
| **DesktopNavbar** | Brand Seal Astrolabe Gear Spin | `#E5B65C`, 45deg rotation | `group-hover:rotate-45` 700ms ease |
| **DesktopNavbar** | Action Buttons Scale | `#092557`, scale 1.05 | Hover micro-interaction (150ms) |
| **HeroSection** | Twinkling Starfield Canvas | 4-color palette, Canvas 2D | 60fps autonomous requestAnimationFrame |
| **HeroSection** | Central Nebula Breathing | `bg-radial`, opacity 0.35 -> 0.65 | 8s infinite `animate-celestial-pulse` |
| **HeroSection** | Headline Golden Glow | `drop-shadow(0 0 24px #E5B65C)` | Permanent luminous text shadow |
| **SmartSearchBox** | Glow Bloom on Focus | Border `#29A9FF`, Shadow 25px flare | `focus-within:border-[#29A9FF]` |
| **SmartSearchBox** | Compass Icon Gyro Rotation | Transform `rotate(45deg)` | `group-hover:rotate-45` 500ms ease |
| **CompetitionBanner** | Shimmer Light Sweep | Diagonal gradient sweep | 5s infinite `animate-shimmer` |
| **CompetitionBanner** | Digital Countdown Digit Tick | Tabular numbers `#E5B65C` | Real-time interval update |
| **CompetitionBanner** | Gold Button Glow & Scale | Gradient gold, scale 1.05 | Hover micro-interaction |
| **TwinPillarRails** | Section Border Lines | Blue-900 `#1B3F80`, 4px accent borders | Static architectural framing |
| **CourseCard** | Card Elevation & Lift | `translateY(-4px)` + Cyan glow | `hover:-translate-y-1` 300ms cubic-bezier |
| **CourseCard** | 2px Tech-Blue Accent Flare | `box-shadow: 0 0 10px #29A9FF` | `group-hover:shadow-[0_0_10px_#29A9FF]` |
| **CourseCard** | Thumbnail Zoom | `scale(1.05)` | 500ms ease-out |
| **ScholarshipCard** | Card Elevation & Gold Flare | `translateY(-4px)` + Gold glow | `hover:-translate-y-1` 300ms cubic-bezier |
| **ScholarshipCard** | 2px Gold Accent Flare | `box-shadow: 0 0 10px #E5B65C` | `group-hover:shadow-[0_0_10px_#E5B65C]` |
| **EventSection** | Live Beacon Radar Ping | Ping ring + White core | 2s infinite radar ping loop |
| **EventSection** | Panoramic Stage Zoom | `scale(1.05)` on artwork | 700ms ease-out |
| **MobileBottomBar** | Active Tab Golden Chamber | `#040F24` bg + Gold border + Glow | Active tab indicator (`scale-105`) |

---

## 4. Performance & Accessibility Standards

1. **Hardware Acceleration:** All CSS animations strictly animate `transform`, `opacity`, and `filter`. No layout-triggering properties (`width`, `height`, `top`, `margin`) are animated.
2. **`prefers-reduced-motion` Compliance:**
   Users requesting reduced motion experience static starfields, disabled shimmer sweeps, and simple opacity cross-fades without camera movement or scale shifts.
3. **Canvas Cleanup:** `CelestialCanvas` removes its window resize listeners and calls `cancelAnimationFrame` upon unmounting to eliminate CPU memory leaks.
4. **Mobile Optimization:** Particle count dynamically scales down on mobile viewports based on screen width/height to guarantee zero battery drain and butter-smooth scrolling.
