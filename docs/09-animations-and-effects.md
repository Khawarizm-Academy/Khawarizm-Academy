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
- **Atmospheric Luminescence:** In a deep dark navy UI (`#040F24` to `#092557`), elements without light sources become flat and lifeless. We employ multi-layered radial glows, twinkling starfields, illuminated 2px accent bars, and border luminescence to establish physical depth.
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

#### C. MobileBottomBar Sliding Golden Chamber
- **Mechanism:** An absolute rounded chamber container (`w-[calc(20%-10px)]`) tracks the active bottom tab index (`right: calc(index * 20% + 5px)`).
- **Motion:** Smoothly glides underneath whichever of the 5 icons the student taps, accompanied by a 1.05x micro-scale and gold drop-shadow.

### 2.4 Real-Time Interval Countdown Engine (`CompetitionBanner.tsx`)
- **Implementation:** Integrated sub-second `setInterval` ticker calculating Days, Hours, Minutes, and Seconds.
- **Desktop Banner:**
  - Includes a dedicated 4-unit digital chamber: `أيام` : `ساعة` : `دقيقة` : `ثانية`.
  - Ticking seconds with high-visibility `tabular-nums` and pulsing separators.
- **Mobile Banner:**
  - 4-unit real-time digital boxes with live seconds and pulsating colons.
- **Ambient Effect:** Animated shimmer beam sweeping across the golden gradient border every 5 seconds (`animate-shimmer`).

### 2.5 Celestial Starfield Canvas Engine (`CelestialCanvas.tsx`)
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
  - Micro-drift vertical displacement simulating the slow rotation of the earth relative to the heavens.

### 2.6 Live Beacon Radar Ping (`animate-radar-ping`)
- **Component:** "ندوة حية" (Live Seminar) badge in `EventSection`.
- **Visual:** A dual-layer concentric indicator:
  - Inner solid white beacon dot.
  - Outer expanding ripple ring scaling from `0.95` to `1.0` while dissipating from 80% opacity to 0% over a 2-second loop.

### 2.7 Interactive 3D Card Hover & Accent Line Blooming
- **Components:** `CourseCard`, `ScholarshipCard`.
- **Resting State:**
  - Elevation: `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.40)`.
  - Border: `border-color: rgba(27, 63, 128, 0.8)`.
  - 2px Accent Bar: At the bottom of the card thumbnail (Cyan for Courses, Gold for Scholarships).
- **Hover State:**
  - Lift: `transform: translateY(-4px)`.
  - Border bloom: Border illuminates to `#29A9FF`/70 or `#E5B65C`/70.
  - Shadow bloom: `box-shadow: 0 12px 36px rgba(0,0,0,0.65), 0 0 22px rgba(41,169,255,0.25)`.
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
| **CompetitionBanner** | Real-Time Ticking Countdown Timer | Tabular digits, pulsing colons | Real-time 1000ms sub-second interval |
| **CompetitionBanner** | Shimmer Light Sweep | Diagonal gradient sweep | 5s infinite `animate-shimmer` |
| **CompetitionBanner** | Gold Button Glow & Scale | Gradient gold, scale 1.05 | Hover micro-interaction |
| **CourseCard** | Card Elevation & Lift | `translateY(-4px)` + Cyan glow | `hover:-translate-y-1` 300ms cubic-bezier |
| **CourseCard** | 2px Tech-Blue Accent Flare | `box-shadow: 0 0 10px #29A9FF` | `group-hover:shadow-[0_0_10px_#29A9FF]` |
| **CourseCard** | Thumbnail Zoom | `scale(1.05)` | 500ms ease-out |
| **ScholarshipCard** | Card Elevation & Gold Flare | `translateY(-4px)` + Gold glow | `hover:-translate-y-1` 300ms cubic-bezier |
| **ScholarshipCard** | 2px Gold Accent Flare | `box-shadow: 0 0 10px #E5B65C` | `group-hover:shadow-[0_0_10px_#E5B65C]` |
| **EventSection** | Live Beacon Radar Ping | Ping ring + White core | 2s infinite radar ping loop |
| **EventSection** | Panoramic Stage Zoom | `scale(1.05)` on artwork | 700ms ease-out |
| **MobileBottomBar** | Physical Sliding Golden Chamber | `#040F24` bg + Gold border + Glow | Glides smoothly across 5 tabs (350ms) |
