"""Home serializers — read the presentation extras through to the real rows."""

from __future__ import annotations

from typing import Any

from features.common.serializers import compact


def featured_course(row: Any) -> dict[str, Any]:
    """A home course card, sourced from the linked Course."""
    course = row.course
    return {
        "id": course.slug,
        "title": course.title,
        "category": course.category_label,
        "level": course.course_level,
        "duration": course.duration,
        "studentsCount": row.students_count,
        "status": row.status,
        "thumbnailType": row.thumbnail_type,
    }


def featured_scholarship(row: Any) -> dict[str, Any]:
    """A home scholarship card, sourced from the linked Scholarship."""
    scholarship = row.scholarship
    return compact(
        id=scholarship.slug,
        title=scholarship.title,
        provider=scholarship.provider,
        location=scholarship.country,
        deadlineText=row.deadline_text or scholarship.deadline_badge,
        deadlineUrgency=scholarship.deadline_urgency,
        coverage=scholarship.coverage_label,
        degreeLevel=scholarship.degree_label,
        iconType=row.icon_type,
        thumbnailType=row.thumbnail_type,
    )


def quick_link(row: Any) -> dict[str, Any]:
    return {
        "id": row.link_id,
        "icon": row.icon,
        "label": row.label,
        "subtitle": row.subtitle,
        "tone": row.tone,
        "target": row.target,
    }
