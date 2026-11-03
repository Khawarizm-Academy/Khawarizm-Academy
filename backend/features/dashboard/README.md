# Dashboard — لوحتي

The post-login learner workspace. All reads are per-learner (via
`accounts.Learner`) and every section returns the exact shapes the frontend
expects.

## At a glance

| | |
| :--- | :--- |
| **App label** | `dashboard` |
| **Routes** | `GET /api/dashboard`, `GET /api/dashboard/enrolled`, `GET /api/dashboard/saved`, `GET /api/dashboard/competitions`, `GET /api/dashboard/notifications`, `GET /api/dashboard/notifications/unread-count`, `POST /api/dashboard/notifications/:id/read` |
| **Owns** | `EnrolledCourse`, `PriorityContinue`, `ImminentLiveSession`, `DashboardStat`, `UpcomingEvent`, `DashboardNotification`, `NotificationItemData`, `SavedScholarshipItem`, `FavoriteCourseItem`, `CompetitionItem`, `CertificateItem` |
| **Imports** | `get_demo_learner` from `auth` |
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
├── models.py         Learner-scoped projections (enrollments, saved/favorites, competitions, certificates, notifications, stats, priority, live, upcoming)
├── serializers.py    enrolled_course, priority_continue, live_session_info, dashboard_stats, upcoming_event, drawer_notification, view_notification, saved_scholarship, favorite_course, competition_item, certificate_item
├── notifications.py  sole notification writer, preference gate, cache, and reminders
├── event_receiver.py event consumers and parent integration hooks
├── services.py       summary assembly + notification reads (the views only serialize)
├── views.py          summary, enrolled, saved, competitions, notifications, unread_count, notification_read
├── urls.py           /api/dashboard/*
├── admin.py          each model registered with learner + key
├── migrations/       schema history
└── README.md
```

## How it works

- **Learner scope:** every queryset filters `learner = get_demo_learner()`.
- **Two notification shapes:** `GET /api/dashboard/notifications` returns both
  `items` (for the notifications view) and `drawer` (for the notifications
  drawer). `POST /api/dashboard/notifications/:notification_id/read` marks the
  corresponding rows in **both** representations as read/unread.
- **Storage decision:** keep `DashboardNotification` and `NotificationItemData`
  for this compatibility window. `notifications.notify()` is the sole writer,
  creates both projections transactionally with the same dedupe id, and uses
  `bulk_create(ignore_conflicts=True)` for retry-safe fan-out. No destructive
  unification migration is introduced; a later release can replace the two
  projections after clients stop depending on their separate shapes.
- **Preferences and cache:** `StudentProfile.notifications` gates the live
  reminder, weekly progress summary, and recommended-opportunity kinds. The
  unread-count endpoint uses a per-user cache with an exact 15-second TTL and
  writes/read changes invalidate the affected user.
- **Event hooks:** sources that are not already signal-backed should call the
  `receive_*` functions in `event_receiver.py` after commit. The existing
  announcement, quiz, and live-session signals are connected at app startup.
  Run `python manage.py send_reminders` from self-hosted cron; the existing
  maintenance endpoint/cron surface still needs a parent integration change.
- **One stats row per learner:** `DashboardStat` enforces
  `unique_together = ("learner",)` (a `OneToOne`-style constraint).
- **Small comments, easy to edit:** keys use clear names; `compact()` drops
  empty/`None` fields so the payload stays lean and close to the frontend
  types.

## Data

| Source | Provides |
| :--- | :--- |
| `EnrolledCourse` | enrollment + progress + next live time + thumbnail + slug |
| `PriorityContinue` | the "continue" card on the dashboard |
| `ImminentLiveSession` | a live session that is about to start |
| `DashboardStat` | attendance, GPA, points, rank note |
| `UpcomingEvent` | submission/exam/session events |
| `DashboardNotification` | drawer entries (unread/read) |
| `NotificationItemData` | list entries (unread flag) |
| `SavedScholarshipItem` | saved scholarships |
| `FavoriteCourseItem` | favorite courses |
| `CompetitionItem` | competitions with status and action |
| `CertificateItem` | earned certificates |

## Related

- Auth (get_demo_learner): [`../auth/README.md`](../auth/README.md)
- Catalog/Scholarships/Courses (links from dashboard): [`../catalog/README.md`](../catalog/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
