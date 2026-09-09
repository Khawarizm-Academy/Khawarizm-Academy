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
- **Physical Shared Motion (No Abrupt Mount/Unmount):** Active states, indicators, and toggles do not abruptly disappear and reappear. They physically slide, glide, and morph across their tracks like mechanical pointers on an astronomical brass plate.
- **Color Blending & Atmospheric Harmony (Zero Component Isolation):** Components never sit as isolated, stark-bordered "islands" in a black void. Instead, ambient radial lighting washes bathe the canvas, borders are translucent (`border-[#1B3F80]/40`), and cards use soft frosted glass (`backdrop-blur-md bg-[#061A3A]/40`) to create a unified, eye-comforting whole.
- **Semantic Light Coding:**
  - **Celestial Gold (`#E5B65C` / `#C88A32`):** Conveys human triumph, wisdom, active deadlines, and prestigious scholarships. Radiates warm golden light (`box-shadow: 0 0 20px rgba(229, 182, 92, 0.45)`).
  - **Electric Tech Cyan (`#29A9FF` / `#167BDB`):** Conveys digital intelligence, AI courses, live broadcasts, and focus states. Radiates cool photonic energy (`box-shadow: 0 0 20px rgba(41, 169, 255, 0.40)`).
  - **Crimson Signal (`#D9534F`):** Dedicated exclusively to notification badges and urgent system alerts.

---

## 2. Implemented Motion & Particle Systems

### 2.1 Astronomical Landing Sequence (Entrance Choreography)
- **Concept:** Upon initial page arrival, the viewport does not abruptly pop in. Instead, elements descend and ascend in an orchestrated sequence:
  1. `0ms`: Navigation Header glides downward from `-20px` to `0px` (`animate-fade-in-down`).
  2. `100ms`: Hero Section & Smart Search ascend from `+22px` to `0px` (`animate-fade-in-up animation-delay-100`).
  3. `200ms`: Competition Announcement Banner ascends into view (`animate-fade-in-up animation-delay-200`).
  4. `300ms`: Twin Pillar Rails (Courses & Scholarships) reveal smoothly (`animate-fade-in-up animation-delay-300`).
  5. `400ms`: Events & Seminars Section arrives (`animate-fade-in-up animation-delay-400`).
  6. `500ms`: Footer ascends into view (`animate-fade-in-up animation-delay-500`).

### 2.2 Gyroscopic Astrolabe Preloader (`AstrolabeLoader.tsx`)
- **Visuals:**
  - Outer concentric ring: Brass dashed degree marks rotating clockwise (`animate-orbit-slow`, 60s cycle).
  - Middle concentric ring: Tech-cyan planetary orbit ring rotating counter-clockwise (`animate-counter-orbit-slow`, 45s cycle) with orbiting planet beacon.
  - Inner ring: Tilted 45-degree elliptical ecliptic coordinate ring.
  - Central Luminous Core: Dual-layer pulsating celestial star with lens flare.
  - Arabic Status: Shimmering `أكاديمية خوارزم — جاري رصد النجوم والبيانات...`.
- **Modes:** Full-screen modal overlay (`fullScreen={true}`) for route transitions, or inline container widget for lazy-loaded components.

### 2.3 Shared Sliding Layout Indicators

#### A. DesktopNavbar Sliding Golden Beam Underline
- **Mechanism:** Instead of mounting a separate border under each tab, a single 2.5px golden beam element is mounted inside `<nav>` and dynamically tracks the bounding client rect of the active tab.
- **Motion:** Translates with `transition: all 350ms cubic-bezier(0.16, 1, 0.3, 1)` and resizes its width to match the exact word length of the selected link. Emits continuous warm gold drop-shadow:
  ```css
  box-shadow: 0 0 10px #E5B65C, 0 0 20px rgba(229, 182, 92, 0.6);
  ```

#### B. SmartSearchBox Magnetic Gliding Pill (`دورة` ⟷ `منحة`)
- **Mechanism:** An absolute rounded indicator pill sits behind the two text buttons.
- **Motion:** When switching between `دورة` (Course, Cyan `#29A9FF`) and `منحة` (Scholarship, Gold `#E5B65C`), the pill slides across the track (`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`), seamlessly shifting its position from `right: 4px` to `right: 50%` and morphing its color and glow flare.

#### C. MobileBottomBar Fitted Centered Golden Chamber
- **Mechanism:** An absolute rounded chamber container dynamically sized to fit the active icon and label (`w-[66px] h-[52px]`), engineered with substantial depth (`bg-gradient-to-b from-[#092350] via-[#061A3A] to-[#040F24]`, `border-2 border-[#E5B65C]`, and `shadow-[0_0_16px_rgba(229,182,92,0.65),inset_0_1px_3px_rgba(255,255,255,0.15)]`).
- **Centering Mechanism:** Uses measured DOM bounding client rects (`tabRect.left - contRect.left + tabRect.width/2 - boxWidth/2`), guaranteeing absolute subpixel dead-center alignment over every tab icon regardless of viewport width or directionality.
- **Edge Margin Clearance:** Nav container uses `px-4 sm:px-6` so the first and last tabs never touch the screen edges, maintaining comfortable breathing room on all mobile devices.
- **Motion:** Smoothly glides underneath whichever icon the student taps with `transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1)` while the active icon scales to `110%` with gold illumination.
- **Visibility:** Permanently pinned to `fixed bottom-0 z-[100]`, remaining always visible on mobile viewports.

### 2.4 Real-Time Interval Countdown Engine (`CompetitionBanner.tsx`)
- **Implementation:** Integrated sub-second `setInterval` ticker calculating Days, Hours, Minutes, and Seconds.
- **Desktop Banner Layout:**
  - Timer is positioned **directly beside the "سجل الآن" button** on the left (End in RTL), forming a unified action cluster.
  - 4 substantial, thick 3D digit cards (`min-w-[54px] h-[48px] px-2.5 bg-[#040F24] border-2 border-[#1B3F80] rounded-xl`) with tabular 20px gold numerals and dedicated labels underneath (`أيام`, `ساعة`, `دقيقة`, `ثانية`).
- **Mobile Banner Layout:**
  - 4 prominent, thick 3D digit cards (`w-[62px] h-[54px] sm:w-[68px] sm:h-[58px] bg-[#071938] rounded-xl border-2 border-[#1B3F80]` with bold 24px-28px gold numerals) sitting directly above the "سجّل الآن" button with dedicated labels underneath.
- **Ambient Effect:** Animated shimmer beam sweeping across the golden gradient border every 5 seconds (`animate-shimmer`).

### 2.5 Atmospheric Lighting Washes & Color Blending (`HomePage.tsx`)
- **Implementation:** Fixed ambient light emitters placed at strategic astronomical coordinates across the page background:
  - Top-right cyan aura (`bg-[#29A9FF]/[0.045] blur-[140px]`)
  - Top-left gold aura (`bg-[#E5B65C]/[0.035] blur-[130px]`)
  - Mid-right indigo-blue wash (`bg-[#167BDB]/[0.035] blur-[150px]`)
  - Bottom-left event aura (`bg-[#E5B65C]/[0.03] blur-[160px]`)
- **Visual Impact:** Bathes cards, pillars, and hero elements in soft, cohesive starlight, preventing visual isolation and harsh contrast against the `#040F24` background.

### 2.6 Celestial Starfield Canvas Engine (`CelestialCanvas.tsx`)
- **Location:** Mounted in `HeroSection` (Desktop & Mobile).
- **Implementation:** HTML5 2D Canvas rendering loop decoupled from React state to ensure 60fps rendering without re-renders.
- **Physics & Behavior:**
  - Dynamic star density computed based on viewport area (`Math.floor((width * height) / 14000)`).
  - Multi-temperature star palette:
    - Pure Celestial White (`#FFFFFF`)
    - Desert Stardust Gold (`#E5B65C`)
    - Deep Space Cyan (`#29A9FF`)
    - Soft Stellar Ash (`#DCE5EE`)
  - Sinusoidal alpha twinkling cycle (individual random period between 3s and 7s).

### 2.7 Interactive 3D Card Hover & Accent Line Blooming
- **Components:** `CourseCard`, `ScholarshipCard`.
- **Resting State:**
  - Elevation: `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.30)`.
  - Border: `border-color: rgba(27, 63, 128, 0.4)`.
  - Background: `bg-[#061A3A]/40` frosted glass.
  - 2px Accent Bar: At the bottom of thumbnail (Cyan for Courses, Gold for Scholarships).
  - Top Accent Bar: 4px gold bar across the top of `ScholarshipCard` matching Figma.
- **Hover State:**
  - Lift: `transform: translateY(-4px)`.
  - Border bloom: Soft illumination to `#29A9FF`/50 or `#E5B65C`/50.
  - Shadow bloom: `box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 0 20px rgba(41,169,255,0.18)`.
  - Thumbnail zoom: `transform: scale(1.05)` with `transition-duration: 500ms`.
  - Accent Bar Glow: Bar emits ambient color flare (`group-hover:shadow-[0_0_10px_currentColor]`).

---

## 3. Keyframe Definitions (`globals.css`)

```css
/* Shimmer Light Sheen */
@keyframes shimmer-sweep {
  0% { transform: translateX(180%) skewX(-20deg); }
  40%, 100% { transform: translateX(-180%) skewX(-20deg); }
}

/* Atmospheric Nebula Breathing */
@keyframes celestial-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.05); }
}

/* Astrolabe Clockwise & Counter-Clockwise Orbits */
@keyframes orbit-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes counter-orbit-slow {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

/* Live Radar Ping */
@keyframes radar-ping {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(41, 169, 255, 0.8); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(41, 169, 255, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(41, 169, 255, 0); }
}

/* Astronomical Landing Staggered Reveals */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 4. Component-by-Component Application Matrix

| Component | Visual Effect / Animation | Primary Tokens | Timing / Trigger |
| :--- | :--- | :--- | :--- |
| **AstrolabeLoader** | Dual Counter-Rotating Rings + Core | `#E5B65C`, `#29A9FF`, `#FFFFFF` | Autonomous 60s / 45s loops |
| **DesktopNavbar** | Physical Sliding Gold Beam Underline | `#E5B65C`, `box-shadow: 0 0 10px` | Glides smoothly on tab selection (350ms) |
| **DesktopNavbar** | Brand Seal Astrolabe Gear Spin | `#E5B65C`, 45deg rotation | `group-hover:rotate-45` 700ms ease |
| **DesktopNavbar** | Action Buttons Scale | `#092557`, scale 1.05 | Hover micro-interaction (150ms) |
| **HeroSection** | Twinkling Starfield Canvas | 4-color palette, Canvas 2D | 60fps autonomous requestAnimationFrame |
| **HeroSection** | Central Nebula Breathing | `bg-radial`, opacity 0.35 -> 0.65 | 8s infinite `animate-celestial-pulse` |
| **HeroSection** | Headline Golden Glow | `drop-shadow(0 0 24px #E5B65C)` | Permanent luminous text shadow |
| **SmartSearchBox** | Sliding Magnetic Toggle Pill | `#29A9FF` (Cyan) ⟷ `#E5B65C` (Gold) | Glides between `دورة` and `منحة` (300ms) |
| **SmartSearchBox** | Glow Bloom on Focus | Border `#29A9FF`, Shadow 25px flare | `focus-within:border-[#29A9FF]` |
| **SmartSearchBox** | Compass Icon Gyro Rotation | Transform `rotate(45deg)` | `group-hover:rotate-45` 500ms ease |
| **CompetitionBanner** | Ticking Timer beside Registration CTA | Tabular digits, pulsing colons | Real-time 1000ms sub-second interval |
| **CompetitionBanner** | Shimmer Light Sweep | Diagonal gradient sweep | 5s infinite `animate-shimmer` |
| **CompetitionBanner** | Gold Button Glow & Scale | Gradient gold, scale 1.05 | Hover micro-interaction |
| **CourseCard** | Soft Frosted Glass & Lift | `translateY(-4px)` + Cyan glow | `hover:-translate-y-1` 300ms cubic-bezier |
| **CourseCard** | 2px Tech-Blue Accent Flare | `box-shadow: 0 0 10px #29A9FF` | `group-hover:shadow-[0_0_10px_#29A9FF]` |
| **CourseCard** | Rounded-Full Outline CTA | Border `#29A9FF`/40, text `#29A9FF` | Desktop course card action |
| **ScholarshipCard** | Top Gold Accent Bar & Soft Glass | `h-1 bg-gradient-to-r` + Gold glow | Top bar + `hover:-translate-y-1` 300ms |
| **ScholarshipCard** | Rounded-Full Gold CTA | Gradient gold, rounded-full | Primary scholarship apply button |
| **EventSection** | Live Beacon Radar Ping | Ping ring + White core | 2s infinite radar ping loop |
| **EventSection** | Soft Translucent Section Box | `bg-[#061A3A]/30 border-[#1B3F80]/40` | Atmospheric glass integration |
| **MobileBottomBar** | Physical Sliding Golden Chamber | `#040F24` bg + Gold border + Glow | Glides smoothly across 5 tabs (350ms) |
