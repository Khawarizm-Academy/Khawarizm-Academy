# Home — الصفحة الرئيسية

Public landing page content. Curated rails (featured courses/scholarships),
the competition banner, events (mobile/desktop variants), and quick links.

## At a glance

| | |
| :--- | :--- |
| **App label** | `home` |
| **Routes** | `GET /api/home` |
| **Owns** | `HomeFeaturedCourse`, `HomeFeaturedScholarship`, `HomeCompetition`, `HomeEvent`, `HomeQuickLink` |
| **Imports** | `competition()` (competitions), `event()` (events) |
| **Frontend twin** | `frontend/src/features/home/` |

## Purpose

Serves one payload keyed exactly like the original mocks: `courses`,
`scholarships`, `competitionMobile`, `competitionDesktop`, `eventMobile`,
`eventDesktopFeatured`, `eventDesktopWorkshop`, `quickLinks`.

## Structure

```text
home/
├── apps.py           AppConfig (label "home")
├── models.py         curated home rails (with presentation keys)
├── serializers.py    featured_course, featured_scholarship, quick_link
├── views.py          home_view
├── urls.py           /api/home
├── admin.py          all home models registered
├── tests.py          models, serializers, and routes
├── migrations/
└── README.md
```

## How it works

The `HomeCompetition` and `HomeEvent` rows include a `key` (`mobile`,
`desktop` / `mobile`, `desktopFeatured`, `desktopWorkshop`) to represent the
surface split. The view builds a dict keyed by that value and returns the five
surface-specific entries. The shared `competition()` and `event()` serializers
live in `features.competitions` and `features.events` respectively so the shape
stays identical across contexts.

## Data

| Source | Provides |
| :--- | :--- |
| `HomeFeaturedCourse` | curated course cards for the home rail |
| `HomeFeaturedScholarship` | curated scholarship cards for the home rail |
| `HomeCompetition` | competition banner content (two surfaces) |
| `HomeEvent` | event/workshop content (three surfaces) |
| `HomeQuickLink` | shortcut rail items |

## Related

- Competitions: [`../competitions/README.md`](../competitions/README.md)
- Events: [`../events/README.md`](../events/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
