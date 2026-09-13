---
name: khawarizm-frontend
description: Master design, engineering, and architecture playbook for Khawarizm Academy frontend. Use whenever creating, styling, refactoring, or extending pages, features, UI components, animations, or state in Khawarizm Academy. Covers the observatory celestial design system, directory placement matrix, anti-duplication rules, component reuse, Tailwind v4 @apply semantic classes, RTL localization, and page creation blueprints.
---

# Khawarizm Academy — Master Frontend Engineering & Design Skill

This skill is the **definitive operational guide and standard** for developing the Khawarizm Academy web platform. It ensures you know:
1. **How to use everything in the design** (Observatory celestial theme, tokens, and Tailwind v4 `@apply` concept classes).
2. **Where every file belongs** (Directory & placement rules).
3. **How to avoid repeating code** (Strict anti-duplication rules and component reuse).
4. **How to assemble any new page/feature in minutes** without writing redundant markup.

---

## 1. Deep Project Analysis & Mental Model

### 1.1 The Dual-Pillar Observatory Architecture
The Khawarizm Academy platform is built on two core educational pillars sharing an identical geometric design grammar:
- **Courses Pillar (الدورات التدريبية):** Identified by Cyber-Cyan accents (`#167BDB` / `#29A9FF`), code brackets, technology tracks, and practical skill verification.
- **Scholarships & Opportunities Pillar (المنح والفرص الدولية):** Identified by Brass Gold accents (`#C88A32` / `#E5B65C`), global academic opportunities, prestigious degree sponsorships, and deadline countdowns.
- **The Visual Theme:** "Observatory & Cyber-Intelligence" (المرصد الفلكي الذكي) — dark space canvas (`#040F24`, `#061A3A`, `#092557`), glowing brass astrolabes, starlight elevation, and clean typography.

### 1.2 Core Technology Stack
- **Framework:** React 19 + TypeScript (Strict mode) + Vite.
- **Styling Engine:** Tailwind CSS v4 (`@import "tailwindcss"`) augmented with `@import "./tokens.css"` and concept-oriented `@apply` classes in `src/styles/globals.css`.
- **Localization Engine:** English domain keys internally + `toArabic(category, key)` / `toArabicNav(key)` in `src/shared/lib/localization.ts`.
- **Master Branding:** Official logo `src/assets/brand/source/KhawarizmLogo.jpg`. Run `npm run brand:generate` to regenerate all app icons and favicons.

---

## 2. Directory & File Placement Matrix

Always follow this exact mapping when creating or moving files:

| What are you adding? | Target Directory | File Pattern |
| :--- | :--- | :--- |
| **Shared Component (2+ features)** | `src/shared/components/<Category>/` | `<Component>.tsx` (e.g. `Navbar/DesktopNavbar.tsx`, `Cards/CourseCard.tsx`) |
| **Feature Component (1 feature only)**| `src/features/<feature>/components/` | `<Component>.tsx` (e.g. `CatalogFilterSidebar.tsx`) |
| **Page View** | `src/features/<feature>/pages/` | `<Feature>Page.tsx` (e.g. `CatalogPage.tsx`, `HomePage.tsx`) |
| **Shared Domain Entity Types** | `src/shared/types/` | `entities.ts` (e.g. `Course`, `Scholarship`, `Event`) |
| **Feature View Types** | `src/features/<feature>/` | `types.ts` (e.g. `CatalogTab`, `FilterDomain`) |
| **Shared Hook** | `src/shared/hooks/` | `use<Name>.ts` (e.g. `useHorizontalScroll.ts`) |
| **Feature Hook** | `src/features/<feature>/hooks/` | `use<FeatureHook>.ts` |
| **Shared Mock Data** | `src/shared/data/` | `mock<Name>Data.ts` (e.g. `mockHomepageData.ts`) |
| **Shared Utility / Helpers** | `src/shared/lib/` | `<name>.ts` (e.g. `localization.ts`, `apiClient.ts`) |
| **Styles & Tokens** | `src/styles/` | `tokens.css` (variables), `globals.css` (utilities) |
| **Routes & Root App** | `src/app/` | `router.tsx`, `App.tsx` |

> 📖 **Full Directory Rules & Flowchart:** Read `references/code-reuse-and-directory-rules.md`.

---

## 3. Strict Anti-Duplication Rules & Component Reuse

### 3.1 Buttons
**Never write raw utility strings for buttons.** Reuse the standard semantic classes:
- **Primary Action (Gold):** `<button className="btn-gold">تقدم الآن</button>` (One per section/screen).
- **Secondary Action (Cyan Outline):** `<button className="btn-outline-blue">استكشف التفاصيل</button>`.
- **Filter Chips / Selector Pills:** `<button className={active ? "btn-gold py-1.5 px-4 text-xs" : "btn-pill-subtle py-1.5 px-4 text-xs"}>...</button>`.
- **Squircle Icon Action (36x36):** `<button className="btn-icon-box"><BookmarkIcon /></button>`.
- **Circular Icon Action (40x40):** `<button className="btn-icon-circle"><ShareIcon /></button>`.
- **Search Submit Button:** `<button className="btn-search-submit"><CompassIcon /></button>`.
- **Action Link:** `<a className="link-action-blue">عرض الكل ←</a>`.

### 3.2 Cards
- **Course Card:** `<CourseCard course={course} layout="desktop" | "mobile" />`
- **Scholarship Card:** `<ScholarshipCard scholarship={scholarship} layout="desktop" | "mobile" />`
- **Custom Cards:** If assembling a custom card (e.g., Problem Set or Quiz), wrap with `.card-interactive-blue` or `.card-interactive-gold`, nesting `.card-media-box`, `.card-title`, `.card-subtitle`, and `.card-meta-row`.

### 3.3 Search & Inputs
- **Smart Search Box:** `<SmartSearchBox variant="desktop" | "mobile" onSearch={(query, type) => ...} />`.
- **Form Containers:** `.search-form-desktop`, `.search-form-mobile`, `.search-pills-container`.

### 3.4 Banners & Countdown Timers
- **Competition Banner:** `<CompetitionBanner competition={data} />`.
- **Event Keynote & Workshop:** `<EventSection featuredEvent={e1} workshopEvent={e2} />`.
- **Timer Digits:** `.digit-box`, `.digit-box-active`, `.digit-text`, `.sliding-chamber-indicator`.

### 3.5 App Shell & Navigation
- Top navigation: `<DesktopNavbar />` (desktop) + `<MobileHeader />` (mobile).
- Bottom navigation: `<MobileBottomBar />`.
- Page wrapper: `.page-wrapper`.
- Main content: `.content-container`.
- Global footer: `<Footer />`.

> 📖 **Full Catalog & Prop APIs:** Read `references/component-catalog.md`.

---

## 4. Universal Page Creation Blueprint (Zero-From-Scratch)

Whenever asked to create any new page:
1. **Analyze Design:** Identify what can be reused directly from the Component Catalog (usually 80%+ of the page!).
2. **Setup Types & Localization:** Keep internal state in English; register display labels in `localization.ts`.
3. **Assemble Subcomponents:** Build any unique feature sidebar or toolbar using existing concept classes.
4. **Compose Page Shell:** Use the standard 5-layer layout template (Atmosphere → Top Nav → Content Container → Bottom Nav → Footer).
5. **Verify:** Run `npm run build` inside `frontend/` to confirm zero TypeScript and CSS errors.

> 📖 **Full Page Blueprint & Catalog Walkthrough:** Read `references/page-creation-blueprint.md`.

---

## 5. Reference Documents Quick-Links

- **Directory Placement & Anti-Duplication:** [`references/code-reuse-and-directory-rules.md`](references/code-reuse-and-directory-rules.md)
- **Component & Class Catalog:** [`references/component-catalog.md`](references/component-catalog.md)
- **Page Creation Blueprint & Real Case Study:** [`references/page-creation-blueprint.md`](references/page-creation-blueprint.md)
- **Design Tokens & CSS Variables Dictionary:** [`references/design-tokens-and-classes.md`](references/design-tokens-and-classes.md)
- **Loading, Caching & Routing Architecture:** [`references/loading-caching-routing-guide.md`](references/loading-caching-routing-guide.md)
