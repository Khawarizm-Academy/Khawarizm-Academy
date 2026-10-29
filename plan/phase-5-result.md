# Phase 5 — Catalog Engine Rework (result)

Branch: `Perf/CatalogEngine` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/catalog/service.py` (new) | The engine, one place: `catalog_items()` returns the interleaved list **cached whole** (`kh:catalog:v<ver>:items`, Phase-4 helper); `build_items()` keeps the exact original interleave; `list_items(params)` validates → filters/sorts the cached list → slices one page (byte-identical body shape); `detail_item(slug)` resolves one item; `filter_groups_payload(surface, tab)` — moved here from serializers (it queries; serializers don't); `_validate()` raises `InvalidParameter` on unknown `type`/`sort`, naming the valid options in Arabic. The docstring names the **DB-pushdown trigger** (rework at ~2k rows: filters → `QuerySet.filter()` per type, keyset pagination, Python keeps only interleave + page slice). |
| `backend/features/catalog/views.py` (rewritten) | Thin handlers: filters/list/detail each ~5 lines over the service; the per-params Phase-4 payload cache is replaced by the items cache + ETag. −78 lines net. |
| `backend/features/catalog/serializers.py` | Slimmed to `catalog_item_for()` only — anything that queries left for the service. |
| `backend/features/common/errors.py` | `InvalidParameter` promoted here (400, `default_code="invalid_parameter"`); `adminconsole/views.py` now imports it instead of defining a private copy. |
| `backend/features/catalog/README.md` | Structure + "How it works" updated for the engine, the quirk, and the pushdown trigger. |
| Tests (+6 → **413**) | `CatalogValidationTests`: unknown `type` → 400 naming `courses, scholarships`; unknown `sort` → 400 naming `deadline, rating`; known values pass; `popular` accepted and keeps the interleave order (the parity regression pin). `CatalogQueryGuardTests`: cold list = exactly **2 queries** (`assertNumQueries(2)`); warm detail = **0 queries**. |

## Query budget (the gate)

| Request | Queries | Path |
| :--- | :--- | :--- |
| Cold list | **2** (courses + scholarships) | miss → `build_items()` → cached whole |
| Warm list | **0** | cache hit → filter/sort/slice in Python |
| Warm detail | **0** | per-slug cache entry (`param_digest({"detail": slug})`) |
| Detail 404 | **0** after first miss | `None` cached as the short-lived negative entry |
| Filters | cached per surface+tab | unchanged from Phase 4 |

All pinned by `assertNumQueries` guards, so a future N+1 fails CI here first.

## The trailing-scholarship quirk (preserved deliberately)

The original interleave appends a scholarship after each course and **drops
scholarships beyond the course count** (e.g. 3 courses + 5 scholarships → 3
scholarships listed). The first cut of this phase resolved detail by searching
the cached interleave — `test_returns_a_scholarship_by_slug` caught that a
trailing scholarship 404'd. Old `catalog_detail` queried the models directly,
so detail resolved items the list never shows. **Parity fix:** `detail_item`
queries `Course` then `Scholarship` and caches per slug, so any published slug
resolves regardless of the list's interleave. The list-side quirk stays (the
frontend has never seen the dropped rows); it is documented in the engine
docstring and the feature README.

## The `sort=popular` parity incident (caught by the capture)

First parity run: 22/23 — `catalog-filtered.json` differed. The capture
requests `sort=popular`, which the old code silently accepted (`SORTERS.get`
→ `None` → insertion order). My first `KNOWN_SORTS = {"newest", *SORTERS}`
rejected it with a 400 — breaking the frontend contract
(`SortOption = 'newest' | 'rating' | 'popular' | 'deadline'` in
`frontend/src/features/catalog/types.ts`). Fixed data-driven:
`INSERTION_ORDER_SORTS = {"newest", "popular"}`, `KNOWN_SORTS` = that ∪
`SORTERS`, plus a test pinning `popular` → interleave order. Lesson recorded:
the validation whitelist must be derived from the **frontend's** value domain,
not just the backend's reorder table.

## Transient CI-style flake (not reproduced)

One full-suite run errored on `test_a_gzip_capable_client_receives_compressed_json`
after the test edits; the same test passed standalone, in a full serial run,
and in two full `--parallel` runs (4 consecutive green suites). No code change
explains it; recorded here for honesty. If it ever recurs, the suspect is
`Content-Encoding` missing when GZip's `min_length` threshold is not met.

## Live smoke (dev server)

- `GET /api/catalog?type=course` → **400** `{"detail": "type غير معروفة: course — القيم الممكنة: all, courses, scholarships"}`.
- `GET /api/catalog?sort=popular` → 200 (insertion order).
- Dev catalog: 3 courses + 5 scholarships → list shows 5 items (interleave
  quirk), and a trailing-scholarship detail still resolves.

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes (no schema change — engine only).
- `test -v2 --parallel` → **413 tests OK**.
- gitleaks clean; pre-commit hooks pass on changed files.
- Parity: **23/23** after the `popular` fix.

## Notes for later phases

- Phase 6 (`Perf/QueryHealth`) picks up the course-detail N+1 and indexes; the
  catalog's 2-query miss is already optimal for its shape.
- `InvalidParameter` in `features/common/errors.py` is now the shared 400 for
  every feature — Phase 7 (`Refactor/Services`) should keep routing per-feature
  validation through it.
- The engine caches serialized dicts (not models) by design — Redis-safe,
  version-bumped on any content write (Phase 4 registry covers
  `Course`/`Scholarship`/`FilterGroup`/`FilterOption`).
