---
name: khawarizm-organization-and-imports
description: The canonical folder taxonomy and import system for Khawarizm Academy. Use whenever adding, moving, or importing any component file — deciding which category folder a feature component belongs in (layout, views, chrome, cards, hero, overlays, controls, states, filters, toolbar), or writing an import line (the @/ alias, direct-file imports, extension rules). Also the placement quick-reference for every file kind in this repo.
---

# Khawarizm Academy — Folder Organization & Import System

The standard for **where feature components live** and **how every import line is written**, so a folder name tells you what a component is for and a one-line import reads top-to-bottom with no `../../../` chains.

> Applies with [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) (data over branches, no duplication) and [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) (directory placement matrix). This skill *is* the folder taxonomy + import syntax those skills point at.

---

## 1. The `@/` alias — the only way to import

`@/` maps to `frontend/src/` (declared once in `vite.config.ts` `resolve.alias` and `tsconfig.app.json` `paths`). **Every internal import uses it. Relative chains are banned.**

```ts
// BAD — depth noise, breaks the instant a file moves
import { DashboardTopBar } from '../../../shared/components/...';
import { toArabic } from '../../lib/localization';

// GOOD — the path is self-locating from anywhere
import { DashboardTopBar } from '@/features/dashboard/components/chrome/DashboardTopBar';
import { toArabic } from '@/shared/lib/localization';
```

Rules:
1. **Direct file paths, no barrels.** Import a component from its exact file (`@/features/catalog/components/cards/CatalogCard`).
2. **`.ts` / `.tsx` are extensionless** in the specifier. **`.json` and `.css` keep their extension** (`@/shared/json/catalog.json`).
3. **Types use `import type`** (the repo runs `verbatimModuleSyntax`):
   ```ts
   import type { CatalogItem } from '@/shared/types/entities';
   import { CatalogCard, type CatalogCardProps } from '@/features/catalog/components/cards/CatalogCard';
   ```
4. **External packages stay bare** (`import { Trophy } from 'lucide-react'`).
5. New files import everything via `@/` from the first line — never add a relative import to a file that already has aliases.

---

## 2. Feature component folders — the taxonomy

Every file under `features/<feature>/components/` sits in **one lowercase plural category folder** that says what the component *is for*. A feature creates only the categories it actually uses — a one-file category is fine; an empty one is not.

| Folder | What lives there | Examples (after the refactor) |
| :--- | :--- | :--- |
| `layout/` | Page composition roots & shells, data-boundary sections | `DashboardShell`, `DashboardMain`, `CatalogResults`, `CatalogDataSection`, `HomeContent`, `TwinPillarRails`, `CourseAbout`, `CourseCurriculum`, `PlayerStage`, `PlayerPanels` |
| `views/` | Render-complete page surfaces; surface-pair folders go inside | `EnrolledCoursesView`, `SavedScholarshipsView`, `CertificateView`, `views/LoginView/`, `views/CourseLandingView/` |
| `chrome/` | Navigation & page furniture — bars, sidebars, sub-nav, rails, legal, breadcrumbs | `AuthTopBar`, `DesktopDashboardSidebar`, `DashboardTopBar`, `MobileDashboardTopBar`, `DashboardSubNavigation`, `DashboardStatsHeader`, `DashboardStatsSidebar`, `PlayerTopBar`, `LessonTabBar`, `CoursePathSidebar`, `CourseBreadcrumb` |
| `cards/` | Cards, card rows, list items, and their sub-visuals | `LoginCard`, `CatalogCard`, `PriorityContinueCard`, `EnrolledCourseCard`, `EnrolledCourseRow`, `NotificationListItem`, `RadialProgressRing`, `CurriculumModuleCard`, `InstructorCard`, `LiveSessionCard`, `ExamCalloutCard`, `CertificatePreview` |
| `hero/` | Hero banners & decorative artwork panels | `AuthHeroPanel`, `BrandSeal`, `CatalogHero`, `CourseHeaderBlock`, `HeroSection`, `ProfileHero` |
| `overlays/` | Modals, drawers, toasts — things that escape the flow | `AuthTermsModal`, `AuthToast`, `CourseWorkspaceModal`, `LiveClassroomModal`, `CompetitionArenaModal`, `ScholarshipApplicationModal`, `CertificatePreviewModal`, `NotificationsDrawer`, `ProfileToast`, `PlayerMiniPlayer`, `PlayerSyllabusDrawer`, `CourseToast` |
| `controls/` | Inputs, buttons, switches, toggles, action rows | `AuthSocialButton`, `CourseActionPanel`, `CoursePrimaryCta`, `CourseStickyCta`, `PlayerSettingsMenu`, `FieldText`, `ToggleSwitch`, `ProfileSaveActions` |
| `states/` | Skeletons, loading, empty/error states | `CatalogGridSkeleton`, `EmptyDashboardState`, `CourseLandingSkeleton`, `CoursePlayerSkeleton`, `CourseNotFound` |
| `filters/` | Filter & sort panels (any surface) | `CatalogFilterSidebar`, `CatalogFilterGroups`, `CatalogMobileFilterDrawer` |
| `toolbar/` | Toolbar & pagination strips | `CatalogToolbar`, `CatalogPagination` |

Real trees after the refactor:

```
features/catalog/components/
├── cards/CatalogCard.tsx
├── hero/CatalogHero.tsx
├── layout/{CatalogResults,CatalogDataSection}.tsx
├── filters/{CatalogFilterSidebar,CatalogFilterGroups,CatalogMobileFilterDrawer}.tsx
├── states/CatalogGridSkeleton.tsx
└── toolbar/{CatalogToolbar,CatalogPagination}.tsx

features/dashboard/components/
├── layout/{DashboardShell,DashboardMain}.tsx
├── views/{EnrolledCoursesView,CompetitionsCertificatesView,SavedScholarshipsView,NotificationsView}.tsx
├── chrome/{DesktopDashboardSidebar,DashboardTopBar,MobileDashboardTopBar,DashboardSubNavigation,DashboardStatsHeader,DashboardStatsSidebar}.tsx
├── cards/{PriorityContinueCard,LiveSessionPriorityCard,RadialProgressRing,EnrolledCourseCard,EnrolledCourseRow,NotificationListItem,ChallengeSpotlightCard}.tsx
├── overlays/{CourseWorkspaceModal,LiveClassroomModal,CompetitionArenaModal,ScholarshipApplicationModal,CertificatePreviewModal,NotificationsDrawer}.tsx
└── states/EmptyDashboardState.tsx

features/courses/components/
├── views/{CourseLandingView/,CoursePlayerView/,CertificateView.tsx}
├── layout/{CourseAbout,CourseOutcomes,CourseCurriculum,CoursePathModules,RelatedCoursesRail,PlayerStage,PlayerPanels}.tsx
├── chrome/{CourseBreadcrumb,PlayerTopBar,LessonTabBar,CoursePathSidebar}.tsx
├── cards/{CurriculumModuleCard,PathLessonRow,InstructorCard,LiveSessionCard,ExamCalloutCard,CertificatePreview}.tsx
├── controls/{CourseActionPanel,CoursePrimaryCta,CourseStickyCta,PlayerSettingsMenu}.tsx
└── states/{CourseLandingSkeleton,CoursePlayerSkeleton,CourseNotFound}.tsx
```

Existing volume is the guide: **dashboard** and **courses** split fully by purpose; **auth/profile/home/catalog** split the same way but smaller. Do not invent a new category name for a lone file — place it in the closest existing bucket.

---

## 3. Surface-pair folders go inside `views/`

A component with a Desktop + Mobile view keeps its **component-name folder** (see [`khawarizm-desktop-mobile-views`](../khawarizm-desktop-mobile-views/SKILL.md)), and that folder lives under `views/`:

```
features/auth/components/views/LoginView/
├── DesktopLoginView.tsx
└── MobileLoginView.tsx
```

Imported directly, no barrel:

```ts
import { DesktopLoginView } from '@/features/auth/components/views/LoginView/DesktopLoginView';
import { MobileLoginView } from '@/features/auth/components/views/LoginView/MobileLoginView';
```

---

## 4. Placement quick-reference (where every file kind lives)

| What | Where | e.g. |
| :--- | :--- | :--- |
| Shared component (2+ features) | `src/shared/components/<Category>/` | `Cards/CourseCard.tsx`, `Search/SmartSearchBox.tsx`, `State/StatePanel.tsx` |
| Feature component | `src/features/<feature>/components/<category>/` | `@/features/dashboard/components/cards/PriorityContinueCard` |
| Component with 2 surfaces | `…/components/views/<Component>/` | `views/LoginView/`, `views/CoursePlayerView/` |
| Page state shared per surface | `src/features/<feature>/context/` | `loginPageContext.ts` + `LoginPageProvider.tsx` |
| Page view | `src/features/<feature>/pages/` | `<Feature>Page.tsx` |
| Shared entity types | `src/shared/types/entities.ts` | `Course`, `Scholarship` |
| Feature view types | `src/features/<feature>/types.ts` | `LearningLevel`, `EnrolledCourse` |
| Shared hook | `src/shared/hooks/` | `useCachedData.ts`, `useCountdown.ts` |
| Feature hook | `src/features/<feature>/hooks/` | `useLiveCountdown.ts` |
| Feature data (non-JSON) | `src/features/<feature>/data/` | `dashboardFetchers.ts`, `radialRingColors.ts` |
| Feature styles | `src/features/<feature>/<feature>.css` | `auth.css` — imported by `globals.css` only |
| Static data | `src/shared/json/` | `routes.json`, `catalog.json` |
| Shared lib/helpers | `src/shared/lib/` | `navigation.ts`, `localization.ts`, `cacheManager.ts`, `apiClient.ts`, `authStorage.ts` |
| Tokens + shared styles | `src/styles/` | `tokens.css`, `globals.css` |
| Routes & root app | `src/app/` | `router.tsx`, `routes.tsx`, `pageLoads.ts`, `layouts/`, `pages/` |
| Brand assets | `src/assets/brand/` | `source/`, `generated/` |

The complete decision matrix lives in [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md).

---

## 5. Verification after moving or importing

```bash
cd frontend
npm run build      # tsc -b + vite build — catches every stale import path
npx eslint src
```

Mechanical moves are safe only when verified behaviorally: compare the built bundle or the rendered DOM before/after — a pure folder/import refactor must not change one byte of runtime behavior (identical JSX, identical chunk output for shared code).

---

## 6. Related skills & docs

- [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) — comments, data over branches, no duplication, verification gates.
- [`khawarizm-desktop-mobile-views`](../khawarizm-desktop-mobile-views/SKILL.md) — the folder-per-surface split that lives under `views/`.
- [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) — the full directory placement matrix and component catalog.
- [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md) — the 10-step flow for new pages, which uses this taxonomy.
- **Human-facing docs:** [`docs/02-architecture.md`](../../../docs/02-architecture.md) · [`docs/05-feature-directory.md`](../../../docs/05-feature-directory.md)
