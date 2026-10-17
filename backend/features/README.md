# Backend Features — الميزات

Every product feature lives in its own folder under `backend/features/` and owns
a README. This page is the index **and the guideline**: what each feature does,
which routes it serves, and the rules every feature follows — mirroring
`frontend/src/features/`.

---

## Feature map

| Feature | App label | Routes | Owns | README |
| :--- | :--- | :--- | :--- | :--- |
| **common** | `common` | — | shared abstract models, choices, `seed_demo` | [`common/README.md`](common/README.md) |
| **Auth** | `accounts` | `/api/auth/*` | `User`, `StudentProfile`, `InstructorProfile`, `UserSession`, `AuthEvent` | [`auth/README.md`](auth/README.md) |
| **Catalog** | `catalog` | `/api/catalog*` | `Category`, `FilterGroup`, `FilterOption` | [`catalog/README.md`](catalog/README.md) |
| **Courses** | `courses` | `/api/courses/*`, `/api/problems` | `Course`, `CourseModule`, `CourseLesson`, `CourseLiveSession`, `CourseProblem`, `CourseProblemOption` | [`courses/README.md`](courses/README.md) |
| **Scholarships** | `scholarships` | `/api/scholarships/*` | `Scholarship` | [`scholarships/README.md`](scholarships/README.md) |
| **Dashboard** | `dashboard` | `/api/dashboard/*` | learner-scoped projections | [`dashboard/README.md`](dashboard/README.md) |
| **Home** | `home` | `/api/home` | `Home*` rails | [`home/README.md`](home/README.md) |
| **Events** | `events` | `/api/events` | `EventItem` | [`events/README.md`](events/README.md) |
| **Competitions** | `competitions` | `/api/competitions` | `Competition` | [`competitions/README.md`](competitions/README.md) |
| **Profile** | — | `/api/profile` | — (edits `accounts.User`) | [`profile/README.md`](profile/README.md) |
| **Admin console** | `adminconsole` | `/api/admin/*` | — (reads across features) | [`adminconsole/README.md`](adminconsole/README.md) |

`common` and `adminconsole` are installed apps. `profile` is model-less and is
mounted in `config/urls.py` without being installed. Every other folder is a
Django app added to `INSTALLED_APPS` and mounted in `config/urls.py`.

---

## The folder contract

A feature is one folder whose files always mean the same thing:

```text
features/<feature>/
├── apps.py           AppConfig — sets the app label
├── models.py         the feature's tables
├── serializers.py    ORM row → camelCase JSON
├── views.py          thin function views
├── urls.py           the feature's routes
├── admin.py          admin registration (data editor)
├── tests.py          tests for the feature's models, serializers, and routes
├── migrations/       schema history
└── README.md         what it does, routes, data, how it works
```

A feature creates only the files it needs — a model-less feature (like
`profile`) skips `models.py`/`migrations/`. An empty file is not allowed; a
single-purpose file is fine.

---

## The rules

### 1. One feature = one app = one folder
The folder name is the product feature. The Django **app label** defaults to the
folder name; `auth` uses `accounts` so it never collides with
`django.contrib.auth`. Declare it in `apps.py`:

```python
class CoursesConfig(AppConfig):
    name = "features.courses"
    label = "courses"
    verbose_name = "Courses"
    default_auto_field = "django.db.models.BigAutoField"
```

### 2. camelCase JSON at the boundary — only in serializers
Views return `Response(serializer(row))`. The serializer is the **only** place a
snake_case model field becomes a camelCase key. Use
`features.common.serializers.compact(**fields)` to drop empty/`None` values, so
payloads stay lean and match the frontend types. Never map shapes inside a view.

### 3. Views stay thin
A view resolves the learner (when needed), queries the feature's models, and
serializes. No business logic, no field mapping, no long branches:

```python
@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(course_detail(course))
```

### 4. Data over branches
No `if / else` chains, no `switch`. A set of alternatives is a **record** or a
**list of rows**, not a ladder. See `features/catalog/filters.py`: every filter
is a row in `FILTERS`, every sorter a key in `SORTERS` — adding one never means
adding a branch. Allowed `if`s are early returns, missing-row guards, and
loading/empty/error branches that cannot be expressed as data.

```python
FILTERS = (
    ("type", "all", lambda item, value: value == "all" or item["type"] == TYPE_ALIAS[value]),
    ...
)
```

### 5. One value, written once
If a choice value, a not-found message, or a JSON key appears twice, one of them
is wrong. Enum values live in `features/common/choices.py`; the learner shape in
`features/auth/serializers.py`; the event/competition shapes in their owning
features and are imported by `home`.

### 6. Comments — one line, why not what
Match the frontend standard: a single `#` or docstring line per idea. No
`====` banners, no numbered steps, no commented-out code.

```python
# Good
"""A `CatalogItem` with `type: 'course'`."""
# Bad — an essay
"""
This serializer converts a Course model instance into a dictionary...
"""
```

### 7. Models stay readable — and editable
- **Group fields with a one-line comment:** summary vs detail, eligibility vs
  deadline. A reader should find a field in seconds.
- **New tables get a UUID primary key** from `features/common/models.py`
  (`UUIDModel` / `TimeStampedModel`), so ids are opaque and unguessable and no
  two features invent their own id scheme.
- **Catalog rows keep `slug` as their business key.** It equals the frontend id
  and the route param, so a catalog link and `/courses/:slug` resolve to the
  same row; the serializer emits it as `id`.
- **`unique_together` for natural keys** (`("learner", "course_id")`) so a row
  is impossible to duplicate.
- **A `help_text` when a field name is not obvious** (e.g. `key = "mobile or
  desktop"`).
- **Register every model in `admin.py`** with `list_display`, `list_filter`,
  `search_fields`, and inlines for children — the admin is the data editor.

### 8. Lean payloads, exact keys
`compact()` drops empties. Never rename a camelCase key to match a model field;
the frontend types are the contract (`shared/types/entities.ts` and each
feature's `types.ts`).

### 9. Fail loudly
A missing row returns a 404 with the Arabic message (`الدورة غير موجودة`), never
an empty 200. A missing `VITE_API_BASE_URL` throws on the frontend. Bad config
should surface, not render wrong.

### 10. Every feature ships tests
`tests.py` covers the feature's models, serializers, and routes. Build on the
shared kit in `features/common/testing.py` — never hand-roll an API client or a
row with required fields left blank:

- `ApiTestCase` — a `TestCase` whose client passes the origin middleware.
- `api_client()` / `FakeRequest()` — a DRF client and a stand-in request that
  carry a realistic user agent and IP.
- `make_user()`, `make_admin()`, `make_course()`, `make_scholarship()` — ready
  rows with every required field filled.
- `authenticate(client, user)` — opens a real session and authorizes a client
  with its access token.

```bash
python manage.py test              # every feature
python manage.py test features.<feature>
```

---

## Wiring a new feature

```
1.  Create the folder:        features/<feature>/ with apps.py, __init__.py
2.  Set the AppConfig:        name = "features.<feature>", label = "<feature>"
3.  Add models:               models.py (choices from features.common.choices)
4.  Add serializers:          serializers.py (camelCase, compact)
5.  Add views:                views.py (thin: resolve → query → serialize)
6.  Add routes:               urls.py
7.  Register in settings:     "features.<feature>" in INSTALLED_APPS
8.  Mount in config/urls.py:  path("api/", include("features.<feature>.urls"))
9.  Register in admin:        admin.py
10. Generate migrations:      python manage.py makemigrations <feature>
11. Verify:                   check + makemigrations + migrate + test + curl
12. Document:                 the feature's README.md and this table
```

---

## Verification gate

```bash
cd backend
source .venv/bin/activate
python manage.py check           # framework sanity
python manage.py makemigrations  # must report "No changes detected"
python manage.py migrate
python manage.py test            # every feature's tests must pass
```

Then start the server and curl the feature's routes **with an allowed Origin**
header (the middleware rejects origin-less `/api/` calls):

```bash
python manage.py runserver 127.0.0.1:8000
curl -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/<route>
```

---

## Related

- Backend entry point & endpoints: [`../README.md`](../README.md)
- Backend architecture guide: [`../../docs/08-backend-architecture.md`](../../docs/08-backend-architecture.md)
- Frontend feature directory: [`../../docs/05-feature-directory.md`](../../docs/05-feature-directory.md)
