# Dashboard — لوحتي

The post-login workspace. Every view is `IsAuthenticated` and every row is
scoped to `request.user`, so each learner sees only their own data and every
section returns the exact shapes the frontend expects.

## At a glance

| | |
| :--- | :--- |
| **App label** | `dashboard` |
| **Routes** | `GET /api/dashboard`, `GET /api/dashboard/enrolled`, `GET /api/dashboard/saved`, `GET /api/dashboard/competitions`, `GET /api/dashboard/notifications`, `POST /api/dashboard/notifications/:notification_id/read` |
| **Owns** | `Enrollment`, `PriorityContinue`, `ImminentLiveSession`, `DashboardStat`, `UpcomingEvent`, `DashboardNotification`, `NotificationItemData`, `SavedScholarship`, `FavoriteCourse`, `SavedCompetition`, `Certificate` |
| **Imports** | nothing from `auth` — the acting user is `request.user` |
| **Frontend twin** | `frontend/src/features/dashboard/` |

## Purpose

Serves: summary (stats, priority continue, imminent live session, upcoming
events), enrolled courses, saved (scholarships + favorite courses),
competitions+certificates, notifications (both `items` and `drawer` shapes), and
marking a notification as read.

## Structure

```text
dashboard/
├── apps.py           AppConfig (label "dashboard")
├── models.py         per-user projections that link to real content (enrollments, saved/favorites, competitions, certificates, notifications, stats, priority, live, upcoming)
├── serializers.py    enrolled_course, priority_continue, live_session_info, dashboard_stats, upcoming_event, drawer_notification, view_notification, saved_scholarship, favorite_course, competition_item, certificate_item
├── views.py          summary, enrolled, saved, competitions, notifications, notification_read
├── urls.py           /api/dashboard/*
├── admin.py          each model registered with user + key
├── migrations/       schema history
└── README.md
```

## How it works

- **User scope:** every view is `IsAuthenticated` and filters on
  `user = request.user`. Rows link to the owning `Course` / `Scholarship` /
  `Competition` record and store only per-user state, so no title is duplicated.
- **Two notification shapes:** `GET /api/dashboard/notifications` returns both
  `items` (for the notifications view) and `drawer` (for the notifications
  drawer). `POST /api/dashboard/notifications/:notification_id/read` marks the
  corresponding rows in **both** representations as read/unread.
- **One stats row per learner:** `DashboardStat` enforces
  `unique_together = ("learner",)` (a `OneToOne`-style constraint).
- **Small comments, easy to edit:** keys use clear names; `compact()` drops
  empty/`None` fields so the payload stays lean and close to the frontend
  types.

## Data

| Source | Provides |
| :--- | :--- |
| `Enrollment` | enrollment + progress + next live time + thumbnail + course slug |
| `PriorityContinue` | the "continue" card on the dashboard |
| `ImminentLiveSession` | a live session that is about to start |
| `DashboardStat` | attendance, GPA, points, rank note |
| `UpcomingEvent` | submission/exam/session events |
| `DashboardNotification` | drawer entries (unread/read) |
| `NotificationItemData` | list entries (unread flag) |
| `SavedScholarship` | saved scholarships |
| `FavoriteCourse` | favorite courses |
| `SavedCompetition` | competitions with status and action |
| `Certificate` | earned certificates |

## Related

- Auth (`IsAuthenticated`, the acting user): [`../auth/README.md`](../auth/README.md)
- Catalog/Scholarships/Courses (links from dashboard): [`../catalog/README.md`](../catalog/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
