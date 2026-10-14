"""Catalog item serializers: one shape for courses and scholarships."""

from __future__ import annotations

from typing import Any

from academy.models import Course, Scholarship
from api.serializers.common import as_number, compact


def course_catalog_item(course: Course) -> dict[str, Any]:
    """A `CatalogItem` with `type: 'course'`."""
    return compact(
        id=course.slug,
        type="course",
        title=course.title,
        category=course.category_label,
        categorySlug=course.category_slug,
        thumbnailUrl=course.thumbnail_url,
        rating=as_number(course.rating),
        duration=course.duration,
        lessonsCount=course.lessons_count,
        instructor=course.instructor,
        courseLevel=course.course_level,
        courseLevelAr=course.course_level_ar,
        priceType=course.price_type,
        priceLabel=course.price_label,
        progressBadge=course.progress_badge,
        language=course.language,
    )


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


def catalog_item_for(item: Course | Scholarship) -> dict[str, Any]:
    if isinstance(item, Course):
        return course_catalog_item(item)
    return scholarship_catalog_item(item)
