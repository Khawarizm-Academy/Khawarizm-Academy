# Events — الفعاليات والندوات

The events & seminars destination: a featured keynote plus a grid of every upcoming event, served by the API.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/events` |
| **Shell** | Standard |
| **Skeleton variant** | `default` |
| **Active tab** | `events` |
| **Entry** | `pages/EventsPage.tsx` |
| **Data source** | `GET /events` via `data/eventFetchers.ts` |
| **Styles** | `events.css` (concept classes `events-*`, `event-card-*`, `event-feature-desc`) |

## Purpose

Presents all academy events and seminars. The featured event (the one flagged `isFeatured`, else the first) is drawn with the shared `EventSection` overlay treatment; the remaining events render as a responsive card grid with badge, title, description, date, and format.

## Structure

```text
events/
├── pages/
│   └── EventsPage.tsx                 thin <main className="content-container">
├── components/
│   ├── hero/EventsHero.tsx            page header: badge, title, subtitle
│   ├── layout/EventsDataSection.tsx   useCachedData boundary + skeleton/empty/error states
│   └── cards/
│       ├── FeaturedEventCard.tsx      shared .event-feature overlay treatment
│       └── EventCard.tsx              grid card (artwork, badge, meta)
├── data/
│   └── eventFetchers.ts               GET /events → EventItem[]
├── events.css
└── README.md
```

## How it works

- `EventsDataSection` loads `['events-list']` with `useCachedData` (5 min stale, 30 min cache), then renders `DataSectionSkeleton` while loading and `StatePanel` on empty/error (with a retry action).
- `EventSection`'s visual grammar is reused through the shared `.event-feature` / `.event-overlay` concept classes and `EventArtwork` from `@/shared/components/Artwork/BrandVisuals` — no markup is duplicated.
- The hero and the section titles stay outside the data boundary, so only the data section re-renders.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/types/entities` | `EventItem` |
| `data/eventFetchers.ts` | `GET /events` |
| `@/shared/components/Artwork/BrandVisuals` | `EventArtwork` |
| `@/shared/components/Loading/DataSectionSkeleton` | Tier 2 grid skeleton |
| `@/shared/components/State/StatePanel` | empty / error chamber |

There are no mocks — the page renders only real API data.

## Related

- Reused section: `src/shared/components/Events/EventSection.tsx`
- Home events rail: `src/features/home/components/layout/HomeContent.tsx`
- Routing: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
