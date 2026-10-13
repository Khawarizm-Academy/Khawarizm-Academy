# Competitions — المسابقات والتحديات

The competitions & challenges destination. Currently a staged placeholder; the arena itself is demonstrated inside the dashboard.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/competitions` |
| **Shell** | Standard |
| **Skeleton variant** | `default` |
| **Active tab** | `competitions` |
| **Entry** | `pages/CompetitionsPage.tsx` |
| **Styles** | shared only (no feature CSS) |

## Purpose

Guarantees the **Competitions** navbar tab resolves to a branded, localized "coming soon" screen. It announces the intended content — the annual algorithm challenge, the programming challenge arena, and science competitions.

## Structure

```text
competitions/
├── pages/
│   └── CompetitionsPage.tsx        renders <FeaturePlaceholder/>
└── README.md
```

There is no feature state, data, or component folder yet.

## How it works

- `CompetitionsPage` renders the shared `FeaturePlaceholder` with a competitions-specific icon (`Trophy`), title, and description.
- A functional **arena** already exists as the dashboard chamber `features/dashboard/components/overlays/CompetitionArenaModal.tsx` (live leaderboard, code editor, test runner) and as the home `CompetitionBanner`.

## Status & next steps

This is a **thin placeholder**, not a built feature. A full implementation would add:
- a competitions listing and a competition detail/arena route,
- team/registration, scoring, and submission flows,
- data sources under `data/` (API fetchers),
- its own view components and `competitions.css` concept classes.

## Related

- Placeholder component: `src/shared/components/Placeholder/FeaturePlaceholder.tsx`
- Dashboard arena chamber: `src/features/dashboard/components/overlays/CompetitionArenaModal.tsx`
- Routing: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
