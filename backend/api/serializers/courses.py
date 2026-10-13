"""Course detail + practice problem serializers."""

from __future__ import annotations

from typing import Any

from academy.models import Course, CourseProblem

from api.serializers.catalog import course_catalog_item

# Course language code to its Arabic label (mirrors courseFetchers.ts).
LANGUAGE_LABELS = {
    "arabic": "العربية",
    "english": "الإنجليزية",
    "french": "الفرنسية",
}


def module(module_row: Any) -> dict[str, Any]:
    return {
        "id": module_row.module_id,
        "title": module_row.title,
        "lessons": [lesson(lesson_row) for lesson_row in module_row.lessons.all()],
    }


def lesson(lesson_row: Any) -> dict[str, Any]:
    return {
        "id": lesson_row.lesson_id,
        "title": lesson_row.title,
        "duration": lesson_row.duration,
        "summary": lesson_row.summary,
    }


def live_session(session: Any) -> dict[str, Any]:
    return {
        "id": session.session_id,
        "title": session.title,
        "state": session.state,
        "dateLabel": session.date_label,
        "timeLabel": session.time_label,
    }


def course_detail(course: Course) -> dict[str, Any]:
    """The merged landing record: catalog base plus the detail seed."""
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
