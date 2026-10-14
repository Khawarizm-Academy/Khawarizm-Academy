"""Home serializers."""

from __future__ import annotations

from typing import Any

from features.common.serializers import compact


def featured_course(row: Any) -> dict[str, Any]:
    return {
        "id": row.course_id,
        "title": row.title,
        "category": row.category,
        "level": row.level,
        "duration": row.duration,
        "studentsCount": row.students_count,
        "status": row.status,
        "thumbnailType": row.thumbnail_type,
    }


def featured_scholarship(row: Any) -> dict[str, Any]:
    return compact(
        id=row.scholarship_id,
        title=row.title,
        provider=row.provider,
        location=row.location,
        deadlineText=row.deadline_text,
        deadlineUrgency=row.deadline_urgency,
        coverage=row.coverage,
        degreeLevel=row.degree_level,
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
