# Courses — الدورات التدريبية

The full course lifecycle: catalog summary, landing page, in-browser player
curriculum, practice problems, enroll/progress, and certificate metadata.

## At a glance

| | |
| :--- | :--- |
| **App label** | `courses` |
| **Routes** | `GET /api/courses/:slug`, `GET /api/courses/:slug/problems`, `GET /api/problems`, `GET /api/courses/:slug/related`, `POST /api/courses/:slug/enroll`, `POST /api/courses/:slug/favorite`, `POST /api/courses/:slug/progress`, `GET /api/courses/:slug/certificate` |
| **Owns** | `Course`, `CourseModule`, `CourseLesson`, `CourseLiveSession`, `CourseProblem`, `CourseProblemOption` |
| **Frontend twin** | `frontend/src/features/courses/` |

## Purpose

Owns the course domain. `Course` carries both the **card/summary** fields (used
by catalog) and the **detail** fields (tagline, about, instructor bio, outcomes,
exam, related IDs). Modules, lessons and live sessions describe the player.
Problems describe the reusable practice set.

## Structure

```text
courses/
├── apps.py           AppConfig (label "courses")
├── models.py         Course, CourseModule, CourseLesson, CourseLiveSession, CourseProblem, CourseProblemOption
├── serializers.py    course_catalog_item, module, lesson, live_session, course_detail, course_problem
├── views.py          course detail/problems/related/enroll/favorite/progress/certificate; problems_list
├── urls.py           /api/courses/* and /api/problems
├── admin.py          Course/Module/Problem with inlines
├── migrations/       schema history
└── README.md
```

## How it works

- **One row, two serializations:** `course_catalog_item(course)` returns the
  `CatalogItem` with `type: 'course'` (for the catalog and related rail).
  `course_detail(course)` merges that base with detail fields to produce the
  merged record the landing/player expect.
- **Nested reads:** `module()` and `lesson()` serialize `course.modules.all()`
  and each module's `lessons.all()`; `live_session()` serializes
  `course.live_sessions.all()`. The 404 on a missing course returns the Arabic
  message `الدورة غير موجودة`.
- **Problems are shared:** `problems_list` and `course_problems_view` both
  return the same `CourseProblem` set with prefetched options. The related rail
  filters `Course` by `slug__in(course.related_ids)`.
- **Mutations persist for a signed-in learner:** `enroll` does
  `get_or_create` on `dashboard.Enrollment`; `progress` writes `progress`,
  `last_lesson` and `is_completed` onto that row; `favorite` toggles a
  `dashboard.FavoriteCourse`. The dashboard models are imported *inside* the
  view so `courses` never depends on `dashboard` at module load. A visitor
  keeps the old acknowledgement — `enroll` and `progress` echo the course id
  back and `favorite` answers `{favorited: false, requiresAuth: true}`. All
  three 404 first on a missing course.

## Data

| Source | Provides |
| :--- | :--- |
| `Course` | title, category, thumbnail, rating, duration, lessons, instructor, level, price, language, tagline, about, instructor details, review/enrolled counts, outcomes, exam params, related IDs |
| `CourseModule`/`CourseLesson` | curriculum |
| `CourseLiveSession` | weekly live review sessions |
| `CourseProblem` + `CourseProblemOption` | practice set |

## Related

- Catalog (browse): [`../catalog/README.md`](../catalog/README.md)
- Dashboard (enrollments): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
