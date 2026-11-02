# Access Upgrade — Phase 3: Course Lifecycle and Studio (result)

**Branch:** `Feature/CourseLifecycle` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** additive course ownership/lifecycle schema, Studio authoring and review APIs, learner visibility, cache consistency, and the minimal lifecycle-aware landing experience.

## What landed

| Area | Result |
| :--- | :--- |
| Course data model | Added `CourseStatus` (`draft`, `in_review`, `published`, `archived`), nullable `Course.owner`, explicit `CourseStaff`, ordered modules/lessons, lesson video/free-preview/content fields, `LessonResource`, and lifecycle timestamps. Existing courses retain published behavior by default; the migration does not guess owners from legacy instructor text. |
| Lifecycle services | Added draft creation, edit/staff/curriculum policy, publish checklist, submit/review/publish/request-changes/unpublish/archive/delete transitions, stable slug rules, optimistic timestamp checks against freshly locked rows, locked lesson-stat recomputation, video/resource linking, progress and enrollment guards, and course audit events. Course-row locks serialize lifecycle changes against enrollments, favorites, and curriculum updates. |
| Studio API | Added authenticated, private/no-store `/api/studio/*` overview, course list/create/detail, staff, module/lesson CRUD/reorder, video linking, HTTPS resources, and checklist routes. Writes use the scoped Studio throttle and delegate business rules to course/access services. Added reviewer queue, approve, and request-changes routes. |
| Public and learner visibility | Catalog/search/home/related rails are published-only; published and archived detail remains public, with archived courses non-enrollable. Draft/in-review detail requires editor access and staff-safe serialization; staff responses are `private, no-store`. Learner saved, certificate, priority, and live-session projections omit private lifecycle states; enrolled archives remain visible. Course detail stays within four queries, and unlinked lessons emit `videoSlug: null`. |
| Existing admin editor | Added async `user_ref` for course ownership and synchronized the explicit owner staff row on create, reassignment, and clear; display instructor text is derived only when blank. Generic content-editor course creation starts in draft, lifecycle state is not editable there, and course deletion delegates to the enrollment-protected service. |
| Learner frontend | Added optional typed lifecycle and lesson payload fields, safe multi-instructor display with a legacy fallback, an Arabic in-review preview notice, and an archived-only unavailable notice/CTA behavior. No Studio authoring UI was in scope. |
| Documentation | Updated project profile, backend feature map, course and Studio feature guides, learner course guide, backend contract, and backend architecture map. |

## Verification

| Gate | Result |
| :--- | :--- |
| Backend `python manage.py test --parallel` | **543 tests passed; 1 skipped.** |
| `ruff check .` / `ruff format --check .` | Pass. |
| `python manage.py check` | Pass; no issues. |
| `python manage.py makemigrations --check --dry-run` | Pass; no changes detected. |
| `python manage.py spectacular --fail-on-warn` | Pass; zero schema warnings. |
| Frontend `npm test` | **105 tests passed in 14 files.** |
| Frontend `npm run lint` / `npm run build` | Pass. Vite emitted the existing non-blocking large-chunk advisory. |
| Focused Phase 3 suite | **35 tests passed** across lifecycle, Studio, course wrapper, and admin content owner-sync coverage. |
| Public parity | **17 public endpoint snapshots** compared against the Phase 1 baseline; after removing only allowlisted additive course fields, all remaining payloads matched. |
| Browser visual audit | Not run for Phase 3; the changed learner lifecycle states have component tests and a passing production build. Studio is API-only in this phase. |

## Integration closeout

- Feature commit: `57f7d31` on `Feature/CourseLifecycle`.
- PR [#49](https://github.com/Khawarizm-Academy/Khawarizm-Academy/pull/49) was squash-merged into `Feature/AccessStudio` on 2026-11-02 as `8b5797d484cf5f2736b0704fc06436afc3938cea`.
- At merge time, GitHub showed zero failing checks, one successful check, and six pending checks. Following the owner's instruction to avoid unnecessary waits, integration proceeded after all local backend/frontend gates and public parity checks passed; this note does not claim the pending remote checks completed.
- The local `Feature/AccessStudio` branch is fast-forwarded to the merge commit.
- The public `main` branch and its protection settings remain unchanged; Phase 3 targets the project integration branch `Feature/AccessStudio`.
