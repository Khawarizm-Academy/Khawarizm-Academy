"""Course serializers — stable legacy shapes plus additive lifecycle fields."""

from __future__ import annotations

from typing import Any

from features.common.serializers import as_number, compact
from features.courses.models import Course

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


def instructors(course: Course, staff_rows: list[Any] | None = None) -> list[dict[str, Any]]:
    """Public staff profiles deliberately omit email and account metadata."""
    rows = _staff_rows(course) if staff_rows is None else staff_rows
    if not rows and course.owner_id and getattr(course, "owner", None) is not None:
        owner = course.owner
        return [
            compact(
                id=str(owner.pk),
                name=owner.full_name or owner.email.split("@", 1)[0],
                headline=getattr(getattr(owner, "instructor_profile", None), "headline", ""),
                avatarUrl=owner.avatar_url,
            )
        ]
    return [
        compact(
            id=str(row.user_id),
            name=row.user.full_name or row.user.email.split("@", 1)[0],
            headline=getattr(getattr(row.user, "instructor_profile", None), "headline", ""),
            avatarUrl=row.user.avatar_url,
        )
        for row in rows
        if row.kind in {"owner", "co_instructor"}
    ]


def live_session(row: Any) -> dict[str, Any]:
    return {
        "id": row.session_id,
        "title": row.title,
        "state": row.state,
        "dateLabel": row.date_label,
        "timeLabel": row.time_label,
    }


def course_detail(
    course: Course,
    *,
    include_unpublished: bool = False,
    is_preview: bool = False,
    enrollable: bool | None = None,
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
    return {
        "id": course.slug,
        "startedLessonId": course.started_lesson_slug,
        "title": course.title,
        "category": course.category_label,
        "categorySlug": course.category_slug,
        "thumbnailUrl": course.thumbnail_url,
        "tagline": course.tagline,
        "about": course.about,
        "instructorName": course.instructor,
        "instructorCredential": course.instructor_credential,
        "instructorBio": course.instructor_bio,
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
        "liveSessions": [live_session(row) for row in sessions],
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
        **({"isPreview": True} if is_preview else {}),
    }
