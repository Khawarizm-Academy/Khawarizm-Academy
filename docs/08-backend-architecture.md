# 08 · Backend Architecture

How the Django service is organised, why it is folded into **one app per
feature**, and the rules that keep models, serializers, and views easy to read
and edit. Read this before adding a feature or changing a model.

> Agent twin: [`/.agents/skills/khawarizm-backend/SKILL.md`](../.agents/skills/khawarizm-backend/SKILL.md).
> The human guides are [07 · Backend Contract](07-backend-contract.md) (the API
> surface) and this page (the internal shape).

---

## 1. One feature = one app = one folder

The backend mirrors `frontend/src/features/`. Every product feature is a Django
app under `backend/features/<feature>/`, and it owns its own models,
serializers, views, routes, admin, migrations, tests, and README.

```text
backend/features/<feature>/
├── apps.py           AppConfig — sets the app label
├── models.py         the feature's tables
├── serializers.py    ORM row → camelCase JSON
├── views.py          thin function views (resolve → query → serialize)
├── urls.py           the feature's routes
├── admin.py          admin registration (the data editor)
├── tests.py          tests — models, serializers, routes
├── migrations/       schema history
└── README.md         what it does, routes, data, how it works
```

A feature creates only what it needs. `profile` owns no models, so it has no
`models.py` or `migrations/`. `common` **is** an installed app: it holds the
shared abstract models (`UUIDModel`, `TimeStampedModel`), the choice enums, and
`management/commands/seed_demo.py`. `adminconsole` owns no tables either — it
reads across the other features.

| Feature | App label | Owns |
| :--- | :--- | :--- |
| `auth` | `accounts` | `User`, `StudentProfile`, `InstructorProfile`, `UserSession`, `AuthEvent` |
| `catalog` | `catalog` | `Category`, `FilterGroup`, `FilterOption` |
| `courses` | `courses` | `Course`, `CourseModule`, `CourseLesson`, `CourseLiveSession`, `CourseProblem`, `CourseProblemOption` |
| `scholarships` | `scholarships` | `Scholarship` |
| `dashboard` | `dashboard` | learner-scoped projections |
| `home` | `home` | `HomeFeaturedCourse`, `HomeFeaturedScholarship`, `HomeCompetition`, `HomeEvent`, `HomeQuickLink` |
| `events` | `events` | `EventItem` |
| `competitions` | `competitions` | `Competition` |
| `profile` | — | — (edits `accounts.User`; mounted, not installed) |
| `adminconsole` | `adminconsole` | — (staff analytics across features) |

**Why `accounts`?** The auth folder keeps the product name (`auth`) but the app
label cannot be `auth` — Django reserves that label for `django.contrib.auth`.
`apps.py` sets `label = "accounts"` and foreign keys use `"accounts.User"`.

### Identity

Two rules, and every table obeys one of them:

- **UUID primary keys.** New tables inherit `UUIDModel` / `TimeStampedModel`
  from `features/common/models.py`, so ids are opaque, unguessable, and no two
  features invent their own scheme. Users, sessions, auth events, filter
  groups/options, and the home/dashboard projections all work this way.
- **Catalog rows keep `slug` as their business key.** It equals the frontend id
  and the route param, so a catalog link and a `/courses/:slug` request resolve
  to the same row; the serializer emits it as `id` and the frontend ids never
  changed.

---

## 2. The three files that matter

### models.py — the data, grouped and commented
Fields are grouped with a one-line comment (summary vs detail, eligibility vs
deadline), primary keys are UUIDs from `features/common/models.py`, natural
keys use `unique_together`, and a `help_text` explains a non-obvious field.

```python
class Course(UUIDModel):
    """One course: the card summary and the full detail record share this row."""

    # Business key — equals the frontend id and the /courses/:slug route param.
    slug = models.CharField(max_length=80, unique=True)

    # Summary fields — the CatalogItem and course card.
    title = models.CharField(max_length=200)
    rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)

    # Detail fields — the landing page and player.
    tagline = models.CharField(max_length=240, blank=True)
    outcomes = models.JSONField(default=list, blank=True, help_text="List of learning outcomes")
```

### serializers.py — the only camelCase boundary
A serializer turns a row into the exact JSON the frontend types declare. Use
`features.common.serializers.compact(**fields)` to drop empty/`None` values.
Never map shapes in a view or a model.

```python
def course_catalog_item(course: Course) -> dict[str, Any]:
    """A `CatalogItem` with `type: 'course'`."""
    return compact(id=course.slug, type="course", title=course.title, ...)
```

### views.py — thin
Resolve the learner (when needed), query the feature's models, serialize. No
field mapping, no long branches.

```python
@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response({"detail": "الدورة غير موجودة"}, status=404)
    return Response(course_detail(course))
```

---

## 3. Data over branches

No `if / else` chains, no `switch`. Alternatives are a **record** or a **list of
rows**. `features/catalog/filters.py` is the reference: every filter is a row in
`FILTERS`, every sorter a key in `SORTERS`.

```python
FILTERS = (
    ("type", "all", lambda item, value: value == "all" or item["type"] == TYPE_ALIAS[value]),
    ("field", "all", lambda item, value: value == "all" or item.get("categorySlug") == value),
    ...
)
```

Allowed `if`s: early returns, missing-row guards, and loading/empty/error
branches that cannot be expressed as data.

---

## 4. One value, written once

- Enum-style values live in `features/common/choices.py` and are imported, never
  re-typed as literals.
- The account shape lives in `features/auth/serializers.py::user_profile`; the
  device shape in `session_payload` / `session_with_user`. `auth`, `profile`,
  `dashboard`, and `adminconsole` all import them — the console renders the
  same row the learner sees.
- The event and competition shapes live in `features/events` and
  `features/competitions`; `home` imports them for its curated rows instead of
  re-declaring the keys.
- A not-found message is defined once per feature and reused.

---

## 5. Wiring and verification

Wiring a new feature:

```
1.  Create features/<feature>/ with apps.py + __init__.py
2.  Set name = "features.<feature>", label = "<feature>"
3.  models.py  → choices from features.common.choices
4.  serializers.py → camelCase, compact
5.  views.py   → thin
6.  urls.py    → the routes
7.  settings.py → add "features.<feature>" to INSTALLED_APPS
8.  config/urls.py → include the feature's urls under "api/"
9.  admin.py   → register the models
10. makemigrations + migrate
11. tests.py   → ApiTestCase + factories (models/serializers/routes)
12. README.md  → document the feature
```

Verification gate:

```bash
cd backend
source .venv/bin/activate
python manage.py check            # framework sanity
python manage.py makemigrations   # must say "No changes detected"
python manage.py migrate
python manage.py test             # every feature's tests must pass
python manage.py runserver 127.0.0.1:8000
curl -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/<route>
```

The origin header matters: `config/middleware.py` rejects origin-less `/api/`
requests, so a bare `curl` returns 403.

---

## 6. Editing the data

A development database is filled by one command, and the Django admin is the
data editor for everything else. Every model is registered in its feature's
`admin.py` with `list_display`, `list_filter`, `search_fields`, and inlines for
children (modules under a course, options under a problem, filter options under
a group).

```bash
python manage.py seed_demo      # demo catalog + the demo learner + the admin
python manage.py createsuperuser
python manage.py runserver
# http://127.0.0.1:8000/admin/
```

`seed_demo` is idempotent and development-only in spirit — a production
database starts empty and is filled through the admin.

---

## 7. Accounts and sessions

Authentication is layered so each file has exactly one job:

| File | Job |
| :--- | :--- |
| `auth/firebase.py` | verify a Firebase ID token → an identity dict |
| `auth/tokens.py` | mint/decode the HS256 access token; hash the refresh token |
| `auth/services.py` | `open_session` / `rotate_session` / `upsert_firebase_user` / `record_event` |
| `auth/authentication.py` | Bearer header → a live `UserSession`, or a coded 401 |
| `auth/permissions.py` | `IsAdminRole` |
| `auth/serializers.py` | the payloads every other feature imports |

Three behaviours are worth knowing before you touch any of them:

- **One device at a time.** `open_session` revokes every other active session
  for that user with reason `signed_in_elsewhere` before opening the new one.
- **Refresh tokens are single-use.** `/api/auth/refresh` rotates both tokens, so
  a replayed token is rejected with `session_invalid`.
- **A 401 explains itself.** `AccessTokenAuthentication.authenticate_header`
  returns `"Bearer"` so DRF keeps 401 (not 403), and `SessionAuthError` renders
  `{"code": ..., "detail": ...}` — the SPA maps `code` to its sign-out copy.
  Admin rights are Django's `is_staff`, so the built-in admin site and
  `ModelBackend` permissions keep working unchanged.

Development signs in with a synthetic `dev:<email>` token when
`FIREBASE_ALLOW_DEV_TOKENS` is on and no `FIREBASE_PROJECT_ID` is set, so the
whole flow is testable without a Firebase project.

### Configuring Firebase

One project, configured once, on the backend. The SPA never holds a key:
`GET /api/auth/config` serves the web config and `AuthProvider` calls
`initializeApp()` with it, so changing projects is an env edit and not a
frontend rebuild.

| Half | Where it lives | Secret? |
| :--- | :--- | :--- |
| Web config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`) | `FIREBASE_*` env vars → `/api/auth/config` → the browser | No — it ships in the bundle by design |
| Admin SDK (`projectId`, plus an optional service account for privileged calls) | `FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS_PATH` / `FIREBASE_CREDENTIALS` | The service account **is** — keep it in the host environment |

`settings.py` treats `FIREBASE_PROJECT_ID` as the switch: set it and `dev:`
tokens stop being accepted, clear it and they come back. A project id without
an `apiKey`/`authDomain` raises `ImproperlyConfigured` at boot — a half config
would otherwise only surface as a failed sign-in in the browser.

---

## Related

- API surface & entities: [07 · Backend Contract](07-backend-contract.md)
- Feature map & folder contract: [`backend/features/README.md`](../backend/features/README.md)
- Backend skills: [`/.agents/skills/khawarizm-backend/SKILL.md`](../.agents/skills/khawarizm-backend/SKILL.md) and [`khawarizm-backend-feature`](../.agents/skills/khawarizm-backend-feature/SKILL.md)
