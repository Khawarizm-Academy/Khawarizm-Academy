"""Course serializers — the catalog summary and the full landing/player detail."""

from __future__ import annotations

from typing import Any

from features.common.serializers import as_number, compact
from features.courses.models import Course, CourseProblem

# Course language code -> its Arabic label.
LANGUAGE_LABELS = {"arabic": "العربية", "english": "الإنجليزية", "french": "الفرنسية"}


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


def module(row: Any) -> dict[str, Any]:
    return {
        "id": row.module_id,
        "title": row.title,
        "lessons": [lesson(item) for item in row.lessons.all()],
    }


def lesson(row: Any) -> dict[str, Any]:
    return {"id": row.lesson_id, "title": row.title, "duration": row.duration, "summary": row.summary}


def live_session(row: Any) -> dict[str, Any]:
    return {
        "id": row.session_id,
        "title": row.title,
        "state": row.state,
        "dateLabel": row.date_label,
        "timeLabel": row.time_label,
    }


def course_detail(course: Course) -> dict[str, Any]:
    """The merged landing record: catalog base plus the detail fields."""
    base = course_catalog_item(course)
    return {
        "id": base["id"],
        "startedLessonId": course.started_lesson_slug,
        "title": base["title"],
        "category": base["category"],
        "categorySlug": base["categorySlug"],
        "thumbnailUrl": base["thumbnailUrl"],
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
        "modules": [module(row) for row in course.modules.all()],
        "liveSessions": [live_session(row) for row in course.live_sessions.all()],
        "exam": {
            "questionCount": course.exam_question_count,
            "minutes": course.exam_minutes,
            "passThreshold": course.exam_pass_threshold,
            "attemptsLeft": course.exam_attempts_left,
        },
        "relatedIds": course.related_ids,
    }


def course_problem(problem: CourseProblem) -> dict[str, Any]:
    return {
        "id": problem.problem_id,
        "prompt": problem.prompt,
        "code": problem.code,
        "options": [{"id": option.option_id, "label": option.label} for option in problem.options.all()],
        "correctOptionId": problem.correct_option_id,
        "explanation": problem.explanation,
        "hint": problem.hint,
    }
