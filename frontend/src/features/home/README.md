# Home — الصفحة الرئيسية

The public landing page. It presents the platform's two pillars with equal weight and funnels discovery into the catalog.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/` |
| **Shell** | Standard (navbar + footer + bottom bar) |
| **Skeleton variant** | `home` |
| **Active tab** | `home` |
| **Entry** | `pages/HomePage.tsx` |
| **State provider** | `context/HomeProvider.tsx` |
| **Styles** | `home.css` (concept classes `quick-*`) |

## Purpose

Home answers "what is this platform and where do I go next?" in one scroll: a hero with a smart search that routes straight into the catalog, a quick-access rail, a competition banner with a live countdown, twin rails of featured courses and scholarships, and an events/workshops section. It is intentionally state-light — search and navigation intent is delegated to the catalog through URL parameters.

## Structure

```text
home/
├── pages/
│   └── HomePage.tsx                 thin orchestrator: HomeProvider + HomeContent
├── components/
│   ├── chrome/
│   │   └── QuickAccessRail.tsx      shortcut rail to dashboard/catalog surfaces
│   ├── hero/
│   │   └── HeroSection.tsx          celestial hero + SmartSearchBox
│   └── layout/
│       ├── HomeContent.tsx          page composition root
│       ├── SurfaceSlot.tsx          renders one of a desktop/mobile node per breakpoint
│       └── TwinPillarRails.tsx      side-by-side course + scholarship rails
├── context/
│   ├── homeContext.ts               HomeContext + useHome() hook + search types
│   └── HomeProvider.tsx             owns featured data, navigation, search submit
├── home.css                         feature concept classes
└── README.md
```

## How it works

- `HomeProvider` owns all home state and exposes it through `useHome()`:
  - `coursesData` and `scholarshipsData` fetched with `useCachedData` (10-minute stale time).
  - `navigateTo(target)` for internal navigation via `NAV_TARGETS`.
  - `submitSearch(query, type)` maps `CatalogSearchType` (`course` / `scholarship` / `all`) to a catalog tab and navigates to `/catalog?type=…&q=…`.
- `SurfaceSlot` mounts both a desktop and a mobile node; CSS breakpoints choose which one is visible. Five sections ship desktop + mobile variants (hero, competition, twin rails, events).
- `TwinPillarRails` is a 50/50 desktop grid (two cards each) and a stacked, horizontally scrollable set of rows on mobile.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/mocks/homepage` | featured `mockCourses`, `mockScholarships`, competition (desktop/mobile), events (desktop featured/workshop, mobile), `quickLinks` (mock mode) |
| `data/homeFetcher.ts` | one payload — mock rails, or live `GET /home` when `VITE_USE_MOCK_API=false` |
| `context/HomeProvider.tsx` | loads the payload once and shares it with every home section |
| `@/shared/hooks/useCachedData` | cached featured data |
| `@/shared/hooks/useHorizontalScroll` | drag/wheel scrolling for the mobile rails |
| `@/shared/lib/navigation` | `NAV_TARGETS`, `resolveIcon`, route constants |
| `@/shared/lib/localization` | `toArabic` display labels |

## Reused components

| Component | Role |
| :--- | :--- |
| `Search/SmartSearchBox` | Hero search with type switcher (desktop + mobile variants) |
| `Artwork/CelestialCanvas` | Animated starfield hero background |
| `Banners/CompetitionBanner` | Competition promo with live countdown |
| `Banners/CountdownDigits` | Countdown digits (inside the banner) |
| `Events/EventSection` | Featured event + workshop block |
| `Cards/CourseCard` / `Cards/ScholarshipCard` | Twin rail cards |

## Notes

- The competition "register" action is a placeholder (native alert); the real flow belongs to the competitions feature.
- Search never filters on Home — it only navigates to the catalog with the correct `type` and `q`.

## Related

- Design and layout: [`docs/01-design-system.md`](../../../../docs/01-design-system.md)
- Routing: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Feature index: [`docs/05-feature-directory.md`](../../../../docs/05-feature-directory.md)
- Catalog (the search destination): [`../catalog/README.md`](../catalog/README.md)
