"""Course serializers — stable legacy shapes plus additive lifecycle fields."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from django.utils import timezone

from features.common.errors import InvalidParameter
from features.common.serializers import as_number, compact
from features.courses.models import Course
from features.courses.services import live_session_labels, live_session_state, live_session_timezone, validate_live_meet_url

LANGUAGE_LABELS = {"arabic": "العربية", "english": "الإنجليزية", "french": "الفرنسية"}


def course_catalog_item(course: Course) -> dict[str, Any]:
    """A `CatalogItem` with the legacy keys preserved."""
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
        status=course.status,
    )


def _lesson_rows(module_row: Any, *, include_unpublished: bool) -> list[Any]:
    rows = list(module_row.lessons.all())
    return rows if include_unpublished else [row for row in rows if row.is_published]


def lesson(row: Any, *, include_unpublished: bool = False) -> dict[str, Any]:
    asset = getattr(row, "video_asset", None)
    payload = compact(
        id=row.lesson_id,
        contentId=str(row.pk),
        title=row.title,
        duration=row.duration,
        summary=row.summary,
        kind=row.kind,
        isFreePreview=row.is_free_preview,
        hasVideo=asset is not None,
        videoSlug=asset.slug if asset else None,
        durationSeconds=row.duration_seconds,
    )
    payload["videoSlug"] = asset.slug if asset else None
    if include_unpublished:
        payload["isPublished"] = row.is_published
    return payload


def module(row: Any, *, include_unpublished: bool = False) -> dict[str, Any]:
    return {
        "id": row.module_id,
        "title": row.title,
        "lessons": [
            lesson(item, include_unpublished=include_unpublished)
            for item in _lesson_rows(row, include_unpublished=include_unpublished)
        ],
    }


def _modules_from_join(rows: list[dict[str, Any]], *, include_unpublished: bool) -> list[dict[str, Any]]:
    modules: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    for row in rows:
        module_id = row["module_id"]
        payload = by_id.get(module_id)
        if payload is None:
            payload = {"id": module_id, "title": row["module_title"], "lessons": []}
            by_id[module_id] = payload
            modules.append(payload)
        lesson_id = row["lesson_id"]
        if lesson_id is None or (not include_unpublished and not row["lesson_is_published"]):
            continue
        lesson_payload = compact(
            id=lesson_id,
            contentId=str(row["lesson_uuid"]),
            title=row["lesson_title"],
            duration=row["lesson_duration"],
            summary=row["lesson_summary"],
            kind=row["lesson_kind"],
            isFreePreview=row["lesson_is_free_preview"],
            hasVideo=row["video_asset_id"] is not None,
            videoSlug=row["video_slug"],
            durationSeconds=row["duration_seconds"],
        )
        lesson_payload["videoSlug"] = row["video_slug"]
        if include_unpublished:
            lesson_payload["isPublished"] = row["lesson_is_published"]
        payload["lessons"].append(lesson_payload)
    return modules


def _staff_rows(course: Course) -> list[Any]:
    return list(getattr(course, "_prefetched_objects_cache", {}).get("staff", ()))


def _sanitized_markdown(value: str) -> str:
    return re.sub(r"<[^>]*>", "", value or "")


def _public_instructor(user: Any) -> dict[str, Any]:
    profile = getattr(user, "instructor_profile", None)
    return compact(
        id=str(user.pk),
        name=user.full_name or user.email.split("@", 1)[0],
        headline=getattr(profile, "headline", ""),
        credential=getattr(profile, "credential", ""),
        bio=_sanitized_markdown(getattr(profile, "bio", "")),
        expertise=getattr(profile, "expertise", []) or [],
        avatarUrl=user.avatar_url,
    )


def instructors(course: Course, staff_rows: list[Any] | None = None) -> list[dict[str, Any]]:
    """Public staff profiles deliberately omit email and account metadata."""
    rows = _staff_rows(course) if staff_rows is None else staff_rows
    if not rows and course.owner_id and getattr(course, "owner", None) is not None:
        return [_public_instructor(course.owner)]
    return [_public_instructor(row.user) for row in rows if row.kind in {"owner", "co_instructor"}]


def live_session(row: Any, *, include_private: bool = False) -> dict[str, Any]:
    date_label, time_label = live_session_labels(row)
    session_timezone = live_session_timezone(row.timezone).key
    state = live_session_state(row)
    status = row.status
    if row.starts_at is not None and status != "cancelled":
        status = {"upcoming": "scheduled", "live": "live", "past": "ended"}.get(state, status)
    meet_url = None
    if row.meet_url:
        try:
            meet_url = validate_live_meet_url(row.meet_url)
        except (InvalidParameter, ValueError):
            meet_url = None
    recording_url = None
    if row.recording_url:
        try:
            parsed_recording = urlparse(row.recording_url)
            if (
                not any(ord(character) < 32 for character in row.recording_url)
                and parsed_recording.scheme == "https"
                and parsed_recording.hostname
                and not parsed_recording.username
                and not parsed_recording.password
            ):
                recording_url = row.recording_url
        except ValueError:
            recording_url = None
    return {
        "id": row.session_id,
        "uuid": str(row.pk),
        "title": row.title,
        "state": state,
        "status": status,
        "startsAt": row.starts_at.isoformat() if row.starts_at else None,
        "serverNow": timezone.now().isoformat(),
        "durationMinutes": row.duration_minutes,
        "timezone": session_timezone,
        "meetUrl": meet_url if include_private else None,
        "recordingUrl": recording_url if include_private else None,
        "recordingAssetId": str(row.recording_asset_id) if include_private and row.recording_asset_id else None,
        "notes": row.notes if include_private else "",
        "dateLabel": date_label,
        "timeLabel": time_label,
    }


def course_detail(
    course: Course,
    *,
    include_unpublished: bool = False,
    is_preview: bool = False,
    enrollable: bool | None = None,
    include_private_session_data: bool = False,
    can_read_announcements: bool = False,
    relation_rows: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """The merged landing record: catalog base plus additive lifecycle fields."""
    if enrollable is None:
        enrollable = course.status == "published"
    modules = (
        _modules_from_join(relation_rows["module_rows"], include_unpublished=include_unpublished)
        if relation_rows is not None
        else [module(row, include_unpublished=include_unpublished) for row in course.modules.all()]
    )
    sessions = relation_rows["live_sessions"] if relation_rows is not None else course.live_sessions.all()
    staff_rows = relation_rows["staff"] if relation_rows is not None else None
    primary_instructor = getattr(course, "owner", None)
    if primary_instructor is None and staff_rows:
        primary_instructor = next(
            (row.user for row in staff_rows if row.kind in {"owner", "co_instructor"}),
            None,
        )
    profile = getattr(primary_instructor, "instructor_profile", None)
    return {
        "id": course.slug,
        "startedLessonId": course.started_lesson_slug,
        "title": course.title,
        "category": course.category_label,
        "categorySlug": course.category_slug,
        "thumbnailUrl": course.thumbnail_url,
        "tagline": course.tagline,
        "about": course.about,
        "instructorName": primary_instructor.full_name if primary_instructor else course.instructor,
        "instructorCredential": (profile.credential if profile is not None else course.instructor_credential),
        "instructorBio": (
            _sanitized_markdown(profile.bio) if profile is not None else _sanitized_markdown(course.instructor_bio)
        ),
        "rating": float(course.rating) if course.rating is not None else 0,
        "reviewCount": course.review_count,
        "enrolledCount": course.enrolled_count,
        "duration": course.duration,
        "lessonsCount": course.lessons_count,
        "levelLabel": course.course_level_ar,
        "languageLabel": LANGUAGE_LABELS.get(course.language, ""),
        "priceType": course.price_type,
        "priceLabel": course.price_label,
        "outcomes": course.outcomes,
        "modules": modules,
        "liveSessions": [live_session(row, include_private=include_private_session_data) for row in sessions],
        "exam": {
            "questionCount": course.exam_question_count,
            "minutes": course.exam_minutes,
            "passThreshold": course.exam_pass_threshold,
            "attemptsLeft": course.exam_attempts_left,
        },
        "relatedIds": course.related_ids,
        "status": course.status,
        "instructors": instructors(course, staff_rows),
        "enrollable": enrollable,
        "canReadAnnouncements": can_read_announcements,
        **({"isPreview": True} if is_preview else {}),
    }
