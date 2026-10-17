# Competitions — المسابقات والتحديات

The competitions & challenges destination: the most urgent challenge highlighted with a live countdown banner, then a grid of every other competition.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/competitions` |
| **Shell** | Standard |
| **Skeleton variant** | `default` |
| **Active tab** | `competitions` |
| **Entry** | `pages/CompetitionsPage.tsx` |
| **Data source** | `GET /competitions` via `data/competitionFetchers.ts` |
| **Styles** | `competitions.css` (concept classes `competitions-*`, `competition-*`) |

## Purpose

Presents every academy competition as a real, actionable challenge. The most urgent one (fewest days, then fewest hours remaining) leads with the shared `CompetitionBanner` and its live countdown; the rest render as cards with badge, title, description, remaining time, and a real action button.

## Structure

```text
competitions/
├── pages/
│   └── CompetitionsPage.tsx             thin <main className="content-container">
├── components/
│   ├── hero/CompetitionsHero.tsx        page header: badge, title, subtitle
│   ├── layout/CompetitionsDataSection.tsx  useCachedData boundary + states + banner slot
│   └── cards/CompetitionCard.tsx        grid card (badge, timer, CTA)
├── data/
│   └── competitionFetchers.ts           GET /competitions → Competition[]
├── competitions.css
└── README.md
```

## How it works

- `CompetitionsDataSection` loads `['competitions-list']` with `useCachedData` (5 min stale, 30 min cache), then renders `DataSectionSkeleton` while loading and `StatePanel` on empty/error (with a retry action).
- The primary challenge is ranked by urgency (`rankByUrgency`) and rendered through the shared `CompetitionBanner` in both surface variants; only CSS picks which one shows, so the banner markup is never duplicated.
- Every CTA (`CompetitionBanner`'s register button and each card's action) navigates to `/dashboard?view=achievements`, where competitions are played — no dead buttons.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/types/entities` | `Competition` |
| `data/competitionFetchers.ts` | `GET /competitions` |
| `@/shared/components/Banners/CompetitionBanner` | urgent-challenge banner + countdown |
| `@/shared/lib/navigation` | `NAV_TARGETS.dashboard` (achievements route) |
| `@/shared/components/Loading/DataSectionSkeleton` | Tier 2 grid skeleton |
| `@/shared/components/State/StatePanel` | empty / error chamber |

There are no mocks — the page renders only real API data.

## Related

- Reused banner: `src/shared/components/Banners/CompetitionBanner.tsx`
- Dashboard arena view: `?view=achievements` → `CompetitionsCertificatesView`
- Routing: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
