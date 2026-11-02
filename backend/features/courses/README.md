# Courses — الدورات التدريبية

The course domain owns the public catalog/detail payload, learner enrollment and progress, and the additive course-authoring lifecycle. Instructors author through the model-less [`studio`](../studio/README.md) API; this feature remains the source of course models, permissions, and mutation rules.

## At a glance

| | |
| :--- | :--- |
| **App label** | `courses` |
| **Public routes** | `GET /api/courses/:slug`, `GET /api/courses/:slug/problems`, `GET /api/problems`, `GET /api/courses/:slug/related`, `POST /api/courses/:slug/enroll`, `POST /api/courses/:slug/favorite`, `POST /api/courses/:slug/progress`, `GET /api/courses/:slug/certificate` |
| **Authoring routes** | `/api/studio/*` (owned by the model-less `studio` app) |
| **Models** | `Course`, `CourseStaff`, `CourseModule`, `CourseLesson`, `LessonResource`, `CourseLiveSession`, `CourseProblem`, `CourseProblemOption` |
| **Frontend twin** | `frontend/src/features/courses/` |

## Lifecycle and visibility

`Course.status` is `draft`, `in_review`, `published`, or `archived`; existing rows default to `published`. New Studio and generic admin-editor courses start as drafts so course creation cannot bypass the publish checklist. Ownership is explicit through `Course.owner` and `CourseStaff`; legacy free-text instructor names are never used to guess an owner. Assigning or changing an owner through the admin content editor also synchronizes the owner staff row and fills the catalog instructor name only when that display field is blank.

Catalog, search, filters, related rails, and home-featured courses include only published rows. Published and archived detail records remain public; archived detail has `enrollable: false`. Draft and in-review detail returns 404 except to an authorized course editor, who receives `isPreview: true` and unpublished lesson metadata with `Cache-Control: private, no-store`. Archived courses already enrolled learners can still open remain in their dashboard, but new enrollment/progress cannot create access; learner favorites, certificate cards, and priority/live-session summaries omit private lifecycle states. The course detail response retains its four-query bound.

Publishing validates the course and published lessons, checks linked video readiness, records the lifecycle audit event, and lets the existing cache-invalidation registry bump catalog/home versions on commit. Unpublishing a course with enrollments archives it; an unenrolled course returns to draft. Courses with enrollments cannot be hard-deleted, including through the generic admin content route, which delegates course deletion to the lifecycle service.

## Authoring data

- `CourseStaff` has one row per course/user, with `owner`, `co_instructor`, or `assistant` kind. The partial unique constraint permits at most one explicit owner; legacy owner fields remain nullable until assigned deliberately.
- `CourseModule` and `CourseLesson` have stable string IDs and `updated_at` values. Reorders require the complete ordered ID list and use bulk updates; cross-module lesson moves use the Studio `moves` contract. Studio writes serialize on the course row, and `expectedUpdatedAt` is checked against a freshly locked row to prevent stale overwrites.
- Lessons add `kind`, `content`, `is_free_preview`, `is_published`, optional `video_asset`, and derived duration seconds. Linking is permitted while video processing; publication requires readiness.
- `LessonResource` stores HTTPS links only. Hosted file uploads are not supported by this feature.
- `recompute_course_stats()` derives published lesson count, total seconds, and the legacy Arabic duration display from lesson rows.

## Structure and services

```text
courses/
├── models.py         Course, staff, curriculum, resources, sessions, problems
├── serializers.py    stable public catalog/detail and lesson payloads
├── services.py       lifecycle, ownership, authorization, curriculum, progress
├── views.py          public detail/problems/related/enroll/favorite/progress/certificate
├── urls.py           /api/courses/* and /api/problems
├── admin.py          registered models, course/module/lesson inline editing
├── migrations/       additive lifecycle schema; no heuristic owner backfill
└── README.md
```

Business rules live in `services.py`; views resolve request data and serialize. `course_detail_relations()` loads curriculum, staff profiles, and sessions in three bounded queries in addition to the course row. Public instructor objects contain only `{id, name, headline, avatarUrl}` and never account email or credential data.

## Related

- Catalog (published browse): [`../catalog/README.md`](../catalog/README.md)
- Dashboard (archived enrollments): [`../dashboard/README.md`](../dashboard/README.md)
- Studio API: [`../studio/README.md`](../studio/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
