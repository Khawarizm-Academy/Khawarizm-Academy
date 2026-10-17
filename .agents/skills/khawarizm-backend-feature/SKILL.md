---
name: khawarizm-backend-feature
description: End-to-end protocol for adding a new backend feature to Khawarizm Academy (Django + DRF). Use whenever creating a new feature app, adding a new backend domain or route group, or porting a frontend feature to the API. Covers the 13-step scaffold, app-label rules, models/serializers/views/urls/admin, settings and URL mounting, migrations, per-feature tests, the feature README, and the verification gate.
---

# Khawarizm Academy — Master Backend Feature Creation Blueprint

The **authoritative, self-contained workflow** for adding a new backend feature
from start to finish. Follow this 13-step protocol whenever creating a feature
app or a new backend domain.

> Human-facing twins: [`backend/features/README.md`](../../../backend/features/README.md)
> (the guideline) and [`docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md).
> Master rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md). Frontend twin
> page: [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md).

---

## 1. Quick decision matrix — what kind of feature are you building?

| Feature kind | Owns models? | Migrations? | Server state? | Examples |
| :--- | :---: | :---: | :---: | :--- |
| **Domain owner** | ✅ | ✅ | ✅ | `courses`, `scholarships`, `events`, `competitions` |
| **Taxonomy / reader** | ✅ (small) | ✅ | ✅ | `catalog` (owns `Category` + `FilterGroup`/`FilterOption`, reads courses/scholarships) |
| **Projection / scoped views** | ✅ | ✅ | ✅ | `dashboard` (learner-scoped rows), `home`, `auth` |
| **Mutation-only facade** | ❌ | ❌ | ❌ | `profile` (edits `accounts.User`, owns no table) |
| **Cross-feature reader** | ❌ | ❌ | ✅ | `adminconsole` (staff analytics across every feature) |
| **Shared foundation** | abstract only | ✅ | ❌ | `common` (abstract models, choices, `seed_demo` — **is** an installed app) |

If nothing is stored, the feature still gets a folder, `views.py`, `urls.py`,
`admin.py` is skipped, and it imports the model it mutates from its owner.

---

## 2. The 13-step universal feature creation protocol

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    KHAWARIZM BACKEND FEATURE PROTOCOL                       │
├────────────────────────────────────────────────────────────────────────────┤
│  1.  Read the frontend twin (features/<name>/ + entities.ts + types.ts)     │
│  2.  Decide ownership (which models this app owns vs imports)               │
│  3.  Scaffold the folder: __init__.py + apps.py                            │
│  4.  Write models.py (grouped fields, slugs as PK, choices from common)     │
│  5.  Write serializers.py (the only camelCase boundary, compact)            │
│  6.  Write views.py (thin: resolve → query → serialize; 404 in Arabic)      │
│  7.  Write urls.py (mounted under /api/)                                    │
│  8.  Register in config/settings.py (INSTALLED_APPS)                        │
│  9.  Mount in config/urls.py (include under "api/")                         │
│ 10.  Write admin.py (every model + inlines — the data editor)               │
│ 11.  makemigrations <feature> + migrate                                     │
│ 12.  Write tests.py (ApiTestCase + factories; models/serializers/routes)   │
│ 13.  Write README.md + add the row to backend/features/README.md           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 — Read the frontend twin first
The backend serves the frontend, so the frontend types **are** the spec.
1. `frontend/src/features/<name>/types.ts` — the exact prop/view shapes.
2. `frontend/src/shared/types/entities.ts` — the shared entities
   (`CatalogItem`, `Course`, `Scholarship`, `EventItem`, `Competition`, …).
3. `frontend/src/features/<name>/data/` (or `hooks/`) — the fetchers, so you see
   the **exact URLs and query params** the feature already calls.
4. `frontend/src/features/<name>/README.md` — the written intent.

> Rule: never invent a key. If the UI reads `courseLevel`, the serializer emits
> `courseLevel` — the model may keep `course_level`.

---

### Step 2 — Decide ownership
One product feature owns its tables. Cross-feature reads **import** the owner's
model and serializer; they never duplicate the table.

| Own… | Import… |
| :--- | :--- |
| Your domain's tables | A referenced model: `from features.courses.models import Course` |
| Your entity's serializer | A shared shape from its owner: `features.events.serializers.event` |

- `auth` owns `User` → everyone FKs `"accounts.User"`.
- `courses` owns `Course` → `catalog`, `dashboard`, `home` import it.
- `events`/`competitions` own their shapes → `home` imports them.
- `auth` owns the session/event shapes → `adminconsole` imports them instead of
  re-declaring a session row.

---

### Step 3 — Scaffold the folder
```text
backend/features/<feature>/
├── __init__.py
├── apps.py
└── migrations/__init__.py      # only when the feature owns models
```
```python
# features/<feature>/apps.py
"""App config for the <feature> feature."""

from django.apps import AppConfig


class <Feature>Config(AppConfig):
    name = "features.<feature>"
    label = "<feature>"                       # default = folder name
    verbose_name = "<Feature>"
    default_auto_field = "django.db.models.BigAutoField"
```
**App-label exception:** the folder `features/auth` uses `label = "accounts"`,
because Django reserves `auth` for `django.contrib.auth`. FKs then use
`"accounts.User"`.

---

### Step 4 — models.py
Group fields with a one-line comment, inherit `UUIDModel` for the primary key,
and import enums from `features.common.choices` (never literals).

```python
"""<Feature> models — one line on what the feature stores."""

from __future__ import annotations

from django.db import models

from features.common.choices import SomeEnum
from features.common.models import TimeStampedModel, UUIDModel


class Thing(UUIDModel, TimeStampedModel):
    """One line describing the row."""

    # Business key — equals the frontend id and the /<feature>/:slug route param.
    slug = models.CharField(max_length=80, unique=True, help_text="Matches the frontend id")

    # Summary fields — the card/rail.
    title = models.CharField(max_length=200)

    # Detail fields — the landing page.
    about = models.TextField(blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.title
```
Child rows use a FK with `related_name` + `unique_together` for the natural key
(`("user", "course_id")`) so duplicates are impossible.

---

### Step 5 — serializers.py
The serializer is the **only** place snake_case becomes camelCase. Use
`compact` to drop empties and `as_number` for Decimals.

```python
"""<Feature> serializers — ORM rows to camelCase JSON."""

from __future__ import annotations

from typing import Any

from features.<feature>.models import Thing
from features.common.serializers import as_number, compact


def thing_card(thing: Thing) -> dict[str, Any]:
    """A `ThingCard` the frontend rails render."""
    return compact(
        id=thing.slug,
        title=thing.title,
        rating=as_number(thing.rating),
    )
```
One serializer per entity shape, reused by every caller. Shared shapes live with
their owner and are imported.

---

### Step 6 — views.py
A view resolves the signed-in user (when needed), queries, and serializes. Nothing else.
Define the Arabic not-found message once.

```python
"""<Feature> endpoints."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.<feature>.models import Thing
from features.<feature>.serializers import thing_card

NOT_FOUND = {"detail": "العنصر غير موجود"}


@api_view(["GET"])
def thing_list(request: Any) -> Response:
    """Every thing card."""
    return Response([thing_card(thing) for thing in Thing.objects.all()])


@api_view(["GET"])
def thing_detail_view(request: Any, slug: str) -> Response:
    """One thing by slug."""
    thing = Thing.objects.filter(slug=slug).first()
    if thing is None:
        return Response(NOT_FOUND, status=404)
    return Response(thing_card(thing))
```
No `if`/`else` chains — alternatives are a record or a list of rows (see
`features/catalog/filters.py`). Allowed `if`s: early returns and missing-row
guards.

---

### Step 7 — urls.py
```python
"""<Feature> routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.<feature> import views

urlpatterns = [
    path("<feature>", views.thing_list, name="<feature>-list"),
    path("<feature>/<str:slug>", views.thing_detail_view, name="<feature>-detail"),
]
```

---

### Step 8 — Register in `config/settings.py`
Add the app to `INSTALLED_APPS`, keeping the group alphabetical / beside siblings:

```python
INSTALLED_APPS = [
    # … django + third-party …
    "features.auth",
    "features.catalog",
    "features.courses",
    "features.<feature>",
    # …
]
```
`features.common` is **not** listed — it is a plain package.

---

### Step 9 — Mount in `config/urls.py`
```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("features.<feature>.urls")),
    # …
]
```
Every feature owns its slice of `/api/`; the include order never matters because
the paths are distinct.

---

### Step 10 — admin.py
The database ships empty, so the admin **is** the data editor. Register every
model with useful columns, filters, search, and inlines for children.

```python
"""<Feature> admin — the data editor."""

from django.contrib import admin

from features.<feature>.models import Thing, ThingChild


class ThingChildInline(admin.TabularInline):
    model = ThingChild
    extra = 1


@admin.register(Thing)
class ThingAdmin(admin.ModelAdmin):
    list_display = ("slug", "title")
    list_filter = ("title",)
    search_fields = ("slug", "title")
    inlines = (ThingChildInline,)
```
A feature with no models (`profile`, `common`) has **no** `admin.py`.

---

### Step 11 — Migrations
```bash
cd backend
source .venv/bin/activate
python manage.py makemigrations <feature>
python manage.py migrate
```

---

### Step 12 — tests.py
Cover the feature's **models, serializers, and routes** using the shared kit in
`features/common/testing.py` — never hand-roll a client or an unseeded row.

```python
"""Tests for the <feature> feature."""

from features.common.testing import ApiTestCase, make_course


class ThingModelTests(TestCase):          # str, ordering, unique_together, defaults
    ...


class ThingSerializerTests(TestCase):     # camelCase keys, compact() drops empties
    ...


class ThingViewTests(ApiTestCase):        # status codes, payload shape, 404 in Arabic
    ...
```

```bash
python manage.py test features.<feature>
```

---

### Step 13 — README + the index row
Every feature owns a `README.md` with these sections, then a new row in the
`backend/features/README.md` table.

```markdown
# <Feature> — العنوان بالعربية

One sentence on what the feature is.

## At a glance
| | |
| :--- | :--- |
| **App label** | `<label>` |
| **Routes** | `GET /api/<feature>`, `GET /api/<feature>/:slug` |
| **Owns** | `Thing`, `ThingChild` |
| **Frontend twin** | `frontend/src/features/<feature>/` |

## Purpose
## Structure    (the folder tree)
## How it works (the non-obvious behavior)
## Data         (which model provides what)
## Related
```

---

## 3. Standard feature template (copy-paste starter)

```
backend/features/<feature>/
├── __init__.py            # empty
├── apps.py                # AppConfig(name, label, verbose_name)
├── models.py              # the tables (skip if none)
├── serializers.py         # camelCase + compact
├── views.py               # thin function views
├── urls.py                # the routes
├── admin.py               # registration + inlines (skip if no models)
├── migrations/__init__.py # skip if no models
├── tests.py               # ApiTestCase + factories (models/serializers/routes)
└── README.md              # what/why/routes/data
```

---

## 4. Common pitfalls & how to prevent them

| Pitfall | Problem | Solution |
| :--- | :--- | :--- |
| **A single `api/` app** | Every feature edits the same files; no ownership | One app + folder per feature, one-for-one with the frontend. |
| **`label = "auth"`** | Collides with `django.contrib.auth` and breaks migrations | The `auth` folder uses `label = "accounts"`. |
| **camelCase in the model** | The DB and admin become inconsistent | snake_case in the model, camelCase **only** in the serializer. |
| **Field mapping in a view** | Duplicated, drifting shapes | One serializer per shape; views only call it. |
| **`if param == …` ladders** | Unreadable and diff-heavy | Put alternatives in a `FILTERS` record (`catalog/filters.py`). |
| **Empty 200 for a missing row** | The frontend renders a blank screen | 404 with the Arabic message (`{"detail": "… غير موجودة"}`). |
| **Unregistered model** | No way to add data (DB ships empty) | Register every model in `admin.py` with inlines. |
| **Auto-increment public id** | A catalog link and `/courses/:slug` disagree | `slug` is the primary key and the route param. |
| **Duplicated enum literals** | Values drift between apps | Import from `features.common.choices`. |
| **Hand-rolled test client** | Every `/api/` call 403s without an `Origin` | Use `features.common.testing.ApiTestCase` / `api_client()`. |
| **Hand-seeded test rows** | Required-field omissions break the suite | Use the `make_*` factories in `features.common.testing`. |
| **Forgetting `INSTALLED_APPS`** | `makemigrations <feature>` finds nothing | Add `"features.<feature>"`, then mount its urls. |
| **Multi-line comments / banners** | Noise the next reader has to skip | One line per comment, say **why**. |

---

## 5. Verification gate — always run it

```bash
cd backend
source .venv/bin/activate
python manage.py check            # framework sanity
python manage.py makemigrations   # must print "No changes detected"
python manage.py migrate
python manage.py test             # the feature's tests must pass
python manage.py runserver 127.0.0.1:8000
```

Then curl the new routes **with an allowed Origin** — `config/middleware.py`
rejects origin-less `/api/` requests with 403:

```bash
curl -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/<feature>
```

**Quality checklist:**
- [ ] `python manage.py check` exits clean.
- [ ] `makemigrations` prints **No changes detected** after the first migration.
- [ ] Every route returns the camelCase keys the frontend types declare.
- [ ] A missing slug returns **404** with the Arabic message.
- [ ] Every model is registered in `admin.py`, children inline.
- [ ] `python manage.py test features.<feature>` passes.
- [ ] The feature folder has a `README.md` and a row in `features/README.md`.
- [ ] No raw enum literal, no duplicated shape, no `if`/`else` chain.
- [ ] Every comment is one line and says **why**.

---

> 📖 **Sibling skills:** [`khawarizm-backend`](../khawarizm-backend/SKILL.md) for the
> rules every file follows, and [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md)
> (applies to Python too) for the one-line comment and no-clever-code standard.
