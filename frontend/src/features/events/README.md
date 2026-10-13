# Events — الفعاليات والندوات

The events & seminars destination. Currently a staged placeholder so the tab never renders empty.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/events` |
| **Shell** | Standard |
| **Skeleton variant** | `default` |
| **Active tab** | `events` |
| **Entry** | `pages/EventsPage.tsx` |
| **Styles** | shared only (no feature CSS) |

## Purpose

Guarantees the **Events** navbar tab resolves to a branded, localized "coming soon" screen instead of a blank page or a broken route. It announces the intended content — the annual Khawarizm conference, technology workshops, and specialized scientific seminars.

## Structure

```text
events/
├── pages/
│   └── EventsPage.tsx        renders <FeaturePlaceholder/>
└── README.md
```

There is no feature state, data, or component folder yet.

## How it works

- `EventsPage` renders the shared `FeaturePlaceholder` with an events-specific icon (`CalendarDays`), title, and description.
- `FeaturePlaceholder` draws the orbital emblem and starfield stage (shared `Placeholder` components).

## Status & next steps

This is a **thin placeholder**, not a built feature. A full implementation would add:
- an events listing (upcoming/past) and an event detail view,
- registration/RSVP,
- data sources under `data/` (API fetchers),
- its own `EventsPage` view components and `events.css` concept classes.

## Related

- Placeholder component: `src/shared/components/Placeholder/FeaturePlaceholder.tsx`
- Routing: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Home already surfaces events via `shared/components/Events/EventSection.tsx`.
