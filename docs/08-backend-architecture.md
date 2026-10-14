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
serializers, views, routes, admin, migrations, and README.

```text
backend/features/<feature>/
├── apps.py           AppConfig — sets the app label
├── models.py         the feature's tables
├── serializers.py    ORM row → camelCase JSON
├── views.py          thin function views (resolve → query → serialize)
├── urls.py           the feature's routes
├── admin.py          admin registration (the data editor)
├── migrations/       schema history
└── README.md         what it does, routes, data, how it works
```

A feature creates only what it needs. `profile` owns no models, so it has no
`models.py` or `migrations/`. `common` is a plain Python package (not an app)
holding shared choices and serializer helpers.

| Feature | App label | Owns |
| :--- | :--- | :--- |
| `auth` | `accounts` | `Learner` |
| `catalog` | `catalog` | `Category` |
| `courses` | `courses` | `Course`, `CourseModule`, `CourseLesson`, `CourseLiveSession`, `CourseProblem`, `CourseProblemOption` |
| `scholarships` | `scholarships` | `Scholarship` |
| `dashboard` | `dashboard` | learner-scoped projections |
| `home` | `home` | `HomeFeaturedCourse`, `HomeFeaturedScholarship`, `HomeCompetition`, `HomeEvent`, `HomeQuickLink` |
| `events` | `events` | `EventItem` |
| `competitions` | `competitions` | `Competition` |
| `profile` | `profile` | — (edits `accounts.Learner`) |

**Why `accounts`?** The auth folder keeps the product name (`auth`) but the app
label cannot be `auth` — Django reserves that label for `django.contrib.auth`.
`apps.py` sets `label = "accounts"` and foreign keys use `"accounts.Learner"`.

---

## 2. The three files that matter

### models.py — the data, grouped and commented
Fields are grouped with a one-line comment (summary vs detail, eligibility vs
deadline), slugs are primary keys and equal the frontend id, and natural keys
use `unique_together`. A `help_text` explains a non-obvious field.

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
- The learner shape lives in `features/auth/serializers.py::user_profile`; both
  `auth` and `profile` reuse it.
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
11. README.md  → document the feature
```

Verification gate:

```bash
cd backend
source .venv/bin/activate
python manage.py check            # framework sanity
python manage.py makemigrations   # must say "No changes detected"
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
curl -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/<route>
```

The origin header matters: `config/middleware.py` rejects origin-less `/api/`
requests, so a bare `curl` returns 403.

---

## 6. Editing the data

The database ships empty, and the Django admin is the data editor. Every model
is registered in its feature's `admin.py` with `list_display`, `list_filter`,
`search_fields`, and inlines for children (modules under a course, options under
a problem). Create a superuser once:

```bash
python manage.py createsuperuser
python manage.py runserver
# http://127.0.0.1:8000/admin/
```

---

## Related

- API surface & entities: [07 · Backend Contract](07-backend-contract.md)
- Feature map & folder contract: [`backend/features/README.md`](../backend/features/README.md)
- Backend skills: [`/.agents/skills/khawarizm-backend/SKILL.md`](../.agents/skills/khawarizm-backend/SKILL.md) and [`khawarizm-backend-feature`](../.agents/skills/khawarizm-backend-feature/SKILL.md)
