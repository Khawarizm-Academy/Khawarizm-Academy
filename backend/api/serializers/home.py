"""Home page content serializers."""

from __future__ import annotations

from typing import Any

from academy.models import (
    Competition,
    EventItem,
    HomeCompetition,
    HomeEvent,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)
from api.serializers.common import compact


def featured_course(row: HomeFeaturedCourse) -> dict[str, Any]:
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


def featured_scholarship(row: HomeFeaturedScholarship) -> dict[str, Any]:
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


def competition(row: HomeCompetition | Competition) -> dict[str, Any]:
    """Shared by the home competitions and the global competitions list."""
    return {
        "id": row.competition_id,
        "title": row.title,
        "badge": row.badge,
        "description": row.description,
        "daysRemaining": row.days_remaining,
        "hoursRemaining": row.hours_remaining,
        "actionText": row.action_text,
    }


def event(row: HomeEvent | EventItem) -> dict[str, Any]:
    """Shared by the home events and the global events list."""
    return compact(
        id=row.event_id,
        title=row.title,
        description=row.description,
        badge=row.badge,
        date=row.date,
        format=row.format,
        isFeatured=row.is_featured,
        thumbnailType=row.thumbnail_type,
    )


def quick_link(row: HomeQuickLink) -> dict[str, Any]:
    return {
        "id": row.link_id,
        "icon": row.icon,
        "label": row.label,
        "subtitle": row.subtitle,
        "tone": row.tone,
        "target": row.target,
    }
