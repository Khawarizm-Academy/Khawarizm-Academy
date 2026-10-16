---
name: khawarizm-backend
description: Master engineering playbook for the Khawarizm Academy backend (Django + DRF). Use whenever creating, reading, refactoring, testing, or extending any backend feature app, model, serializer, view, route, admin, migration, or test. Covers the one-app-per-feature layout that mirrors the frontend, the camelCase JSON contract, thin views, data-over-branches filters, one-line comments, readable/editable models, the admin data editor, the shared testing kit, and the verification gate.
---

# Khawarizm Academy — Master Backend Engineering Skill

The **definitive operational standard** for the Django + DRF backend. It tells you:
1. **Where every file belongs** (one app per feature, mirroring the frontend).
2. **How the three core files are written** (models, serializers, views).
3. **How to keep the camelCase contract** the frontend already depends on.
4. **How to keep the database and models readable and editable.**

> Human-facing twins: [`docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md)
> and [`docs/07-backend-contract.md`](../../../docs/07-backend-contract.md). This
> skill stays the canonical source for agents.
> Folder map & folder contract: [`backend/features/README.md`](../../../backend/features/README.md).
> Building a whole new feature: [`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md).

---

## 1. Mental model

The backend exists to serve the frontend. It owns **all record data**; the
frontend keeps presentation config and copy. So every decision has one test:
**does the payload match the frontend's declared types?**

```
frontend/src/features/<name>/   ←→   backend/features/<name>/
```

One product feature = one Django app = one folder, and the names line up
one-for-one. The frontend's `entities.ts` + per-feature `types.ts` are the
contract: the backend returns those exact camelCase keys, so the UI never casts.

### Stack
Django 6.1 · DRF 3.18 (function-based views) · django-cors-headers · SQLite
locally / Postgres via `DATABASE_URL` · no auth yet (one demo learner).

### The two invariants
1. **Slug = id.** `slug` equals the frontend id and is the primary key and route
   param, so a catalog link and `/courses/:slug` resolve to the same row.
2. **camelCase at the boundary only.** snake_case is the model; camelCase is the
   serializer output. Nothing else converts.

---

## 2. The feature folder contract

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

Create only the files a feature needs. `profile` owns no models → no `models.py`
or `migrations/`. `common` is a **plain package** (no models) holding shared
choices + serializer helpers, and is **not** in `INSTALLED_APPS`.

### AppConfig — the label rule
```python
class CoursesConfig(AppConfig):
    name = "features.courses"
    label = "courses"                 # default = folder name
    verbose_name = "Courses"
    default_auto_field = "django.db.models.BigAutoField"
```
`auth` is the exception: the **folder** is `features/auth` but the **label** is
`accounts`, because Django reserves `auth` for `django.contrib.auth`. Foreign
keys then use `"accounts.Learner"`.

### Wiring checklist
| Step | File |
| :--- | :--- |
| 1 | `features/<feature>/apps.py` (`name`, `label`) |
| 2 | `features/<feature>/models.py` (choices from `features.common.choices`) |
| 3 | `features/<feature>/serializers.py` (camelCase, `compact`) |
| 4 | `features/<feature>/views.py` (thin) |
| 5 | `features/<feature>/urls.py` |
| 6 | `config/settings.py` → add `"features.<feature>"` to `INSTALLED_APPS` |
| 7 | `config/urls.py` → `path("api/", include("features.<feature>.urls"))` |
| 8 | `features/<feature>/admin.py` |
| 9 | `features/<feature>/tests.py` (uses `features.common.testing`) |
| 10 | `manage.py makemigrations <feature>` + `migrate` |
| 11 | `features/<feature>/README.md` + the table in `features/README.md` |

---

## 3. models.py — readable and editable

Group fields with a **one-line comment**, give a `help_text` when a name is not
self-explanatory, use `unique_together` for natural keys, and make slugs the PK.

```python
class Course(models.Model):
    """One course: the card summary and the full detail record share this row."""

    slug = models.CharField(max_length=80, primary_key=True, unique=True)

    # Summary fields — the CatalogItem and course card.
    title = models.CharField(max_length=200)
    rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)

    # Detail fields — the landing page and player.
    tagline = models.CharField(max_length=240, blank=True)
    outcomes = models.JSONField(default=list, blank=True, help_text="List of learning outcomes")
```

Rules:
- **Group fields** (summary/detail, eligibility/deadline) with a `#` line.
- **`help_text`** for enums-as-strings and anything ambiguous (`key = "mobile or desktop"`).
- **`unique_together`** for `("learner", "course_id")` so duplicates are impossible.
- **Choice fields import from `features.common.choices`** — never literals.
- **Frozen enums** as plain lists are fine when tiny (e.g. `LEARNING_LEVELS`).
- **`__str__`** on every model — it makes the admin usable.
- **Cross-app FKs** use the label string: `ForeignKey("accounts.Learner", ...)`.

---

## 4. serializers.py — the only camelCase boundary

The serializer is the **only** place a snake_case field becomes a camelCase key.
Use `features.common.serializers`:

```python
from features.common.serializers import as_number, compact

def course_catalog_item(course: Course) -> dict[str, Any]:
    """A `CatalogItem` with `type: 'course'`."""
    return compact(
        id=course.slug,
        type="course",
        title=course.title,
        rating=as_number(course.rating),
        courseLevel=course.course_level,
    )
```

- **`compact(**fields)`** drops `None`/`""` so payloads stay lean and match the
  optional frontend fields.
- **`as_number(Decimal)`** converts Decimals to JSON floats once, at the edge.
- **One serializer per entity shape** (`course_catalog_item`,
  `scholarship_catalog_item`), reused by every caller.
- **Never** rename a camelCase key to match a model field — the types are the
  contract.
- **Shared shapes live with their owner** and are imported: the event shape in
  `features/events/serializers.py`, the competition shape in
  `features/competitions/serializers.py`, the learner shape in
  `features/auth/serializers.py::user_profile`.

---

## 5. views.py — thin, data-driven

A view resolves the learner (when needed), queries the feature's models, and
serializes. Nothing else.

```python
NOT_FOUND = {"detail": "الدورة غير موجودة"}

@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(course_detail(course))
```

### No `if` / `else` chains — use data
Alternatives are a **record** or a **list of rows**. The reference is
`features/catalog/filters.py`: every filter is a row in `FILTERS`, every sorter
a key in `SORTERS`.

```python
FILTERS = (
    ("type", "all", lambda item, value: value == "all" or item["type"] == TYPE_ALIAS[value]),
    ("field", "all", lambda item, value: value == "all" or item.get("categorySlug") == value),
)

def matches(item, params) -> bool:
    """True when the item passes every filter the frontend sent."""
    return all(check(item, params.get(key, default)) for key, default, check in FILTERS)
```

Allowed `if`s: early returns, missing-row guards, and loading/empty/error
branches that cannot be expressed as data.

### Rules
- **Return `Response(...)`, not models.** Never expose a QuerySet.
- **404 with the Arabic message**, never an empty 200 (`{"detail": "… غير موجودة"}`).
- **Define the message once** (`NOT_FOUND = {...}`) and reuse it.
- **Mutations that are not persisted yet** return a small acknowledgement and a
  one-line comment saying persistence lands with auth.

---

## 6. Comments — one line, why not what

Match the frontend standard exactly.

```python
# GOOD
"""A `CatalogItem` with `type: 'course'`."""
# GOOD
# Summary fields — the CatalogItem and course card.

# BAD — a prose essay
"""
This serializer takes a Course instance and builds a dictionary with all
the camelCase keys that the frontend expects, dropping empty values...
"""

# BAD — banner comments
# ============================================================================
```

Rules: one line per comment; say **why**, not what; no `====` banners, no
numbered steps, no commented-out code.

---

## 7. Data editing — the admin is the data editor

The database ships **empty** (no seed command, no fixtures). Data is added
through the Django admin or the ORM. So **every model must be registered** in
its feature's `admin.py` with useful columns, filters, search, and **inlines for
children**:

```python
@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "category_label", "course_level", "price_type", "lessons_count")
    list_filter = ("course_level", "price_type", "language", "category_slug")
    search_fields = ("slug", "title", "instructor")
    inlines = (CourseModuleInline, CourseLiveSessionInline)
```

```bash
python manage.py createsuperuser
python manage.py runserver
# http://127.0.0.1:8000/admin/
```

---

## 8. Testing — a `tests.py` per feature

Every feature ships `tests.py` covering its **models, serializers, and routes**.
Build on the shared kit in `features/common/testing.py`:

| Helper | Use |
| :--- | :--- |
| `ApiTestCase` | base `TestCase` whose client passes the origin middleware |
| `api_client()` | DRF client that always sends an allowed `Origin` |
| `demo_learner()` | the learner every request acts as |
| `make_learner()` · `make_course()` · `make_scholarship()` | rows with every required field filled |

```bash
python manage.py test                 # every feature
python manage.py test features.<feature>
```

Tests run on **in-memory SQLite**, so they never touch `db.sqlite3`. Never
hand-roll a client (it 403s without an `Origin`) or a row with a required field
left blank — use the kit.

---

## 9. Verification gate — always run it

```bash
cd backend
source .venv/bin/activate
python manage.py check            # framework sanity
python manage.py makemigrations   # must print "No changes detected"
python manage.py migrate
python manage.py test             # every feature's tests must pass
python manage.py runserver 127.0.0.1:8000
```

Then curl the routes **with an allowed Origin** — `config/middleware.py` rejects
origin-less `/api/` requests with 403:

```bash
curl -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/<route>
```

Verify **behavior**, not just a 200: check the payload keys against the
frontend types, check filters/sort pick the right rows, and check a missing slug
returns 404 with the Arabic message.

---

## 10. Do / Don't

| Do | Don't |
| :--- | :--- |
| One app + folder per feature | Pile views into a single `api/` app |
| `compact()` to drop empties | Emit `null`/`""` for optional fields |
| Choices from `features.common.choices` | Re-type `"fully_funded"` as a literal |
| Data-driven filters (`FILTERS`) | Long `if param == ...` chains |
| Slugs as PKs and route params | Auto-increment id as the public id |
| Register every model in `admin.py` | Leave models unregistered |
| Ship a `tests.py` built on the shared kit | Hand-roll clients or unseeded rows |
| One-line comments with a reason | Multi-line essays, `====` banners |
| 404 with the Arabic message | Empty 200 for a missing row |

---

## Related

- New feature protocol: [`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md)
- Code style (applies to Python too): [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md)
- Frontend playbook (the shapes you serve): [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md)
- Human docs: [`docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md), [`docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
