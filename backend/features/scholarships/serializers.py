"""Scholarship serializers."""

from __future__ import annotations

from typing import Any

from features.common.serializers import compact
from features.scholarships.models import Scholarship


def scholarship_catalog_item(scholarship: Scholarship) -> dict[str, Any]:
    """A `CatalogItem` with `type: 'scholarship'`."""
    return compact(
        id=scholarship.slug,
        type="scholarship",
        title=scholarship.title,
        category=scholarship.category,
        categorySlug=scholarship.category_slug,
        thumbnailUrl=scholarship.thumbnail_url,
        country=scholarship.country,
        countrySlug=scholarship.country_slug,
        degreeLevel=scholarship.degree_level,
        degreeLabel=scholarship.degree_label,
        provider=scholarship.provider,
        coverageType=scholarship.coverage_type,
        coverageLabel=scholarship.coverage_label,
        daysRemaining=scholarship.days_remaining,
        deadlineBadge=scholarship.deadline_badge,
        deadlineUrgency=scholarship.deadline_urgency,
        status=scholarship.status,
    )
