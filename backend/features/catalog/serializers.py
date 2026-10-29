"""Catalog list/detail + filter serializers.

The per-entity shapes live with their owners (`courses`, `scholarships`); this
module only picks the right one. Anything that queries belongs in the service
(`features/catalog/service.py`), not here.
"""

from __future__ import annotations

from typing import Any

from features.courses.models import Course
from features.courses.serializers import course_catalog_item
from features.scholarships.models import Scholarship
from features.scholarships.serializers import scholarship_catalog_item


def catalog_item_for(item: Course | Scholarship) -> dict[str, Any]:
    """Return the `CatalogItem` shape for a course or a scholarship."""
    if isinstance(item, Course):
        return course_catalog_item(item)
    return scholarship_catalog_item(item)
