"""Course services: enrollment, progress, favorites, related rail, certificate.

Business rules live here; the views resolve the caller, call one function,
and serialize. The dashboard imports stay inside the functions so the courses
feature never depends on dashboard at module load (dashboard imports back).
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import F

from features.common.cache import bump_version
from features.courses.models import Course
from features.courses.serializers import course_catalog_item


def enroll(user, course: Course) -> None:
    """Enroll once: the row and the counter commit together; re-enrolling is a no-op.

    The increment is atomic in SQL, and the catalog cache bumps after the
    commit — the detail payload shows enrolledCount, and queryset.update()
    fires no signals.
    """
    # Imported here so the courses feature never depends on dashboard at module load.
    from features.dashboard.models import Enrollment

    with transaction.atomic():
        _, created = Enrollment.objects.get_or_create(user=user, course=course)
        if created:
            Course.objects.filter(pk=course.pk).update(enrolled_count=F("enrolled_count") + 1)
            transaction.on_commit(lambda: bump_version("catalog"))


def save_progress(user, course: Course, data: dict[str, Any]) -> None:
    """Persist one progress sync onto the learner's enrollment row."""
    from features.dashboard.models import Enrollment

    enrollment, _ = Enrollment.objects.get_or_create(user=user, course=course)
    enrollment.progress = int(data.get("progress", enrollment.progress))
    enrollment.last_lesson = data.get("lastLesson", enrollment.last_lesson)
    enrollment.is_completed = bool(data.get("isCompleted", enrollment.is_completed))
    enrollment.save(update_fields=["progress", "last_lesson", "is_completed", "updated_at"])


def toggle_favorite(user, course: Course) -> bool:
    """Favorite ↔ unfavorite; `True` when the course ends up favorited."""
    from features.dashboard.models import FavoriteCourse

    favorite = FavoriteCourse.objects.filter(user=user, course=course).first()
    if favorite is None:
        FavoriteCourse.objects.create(user=user, course=course)
        return True
    favorite.delete()
    return False


def related_for(course: Course) -> list[dict[str, Any]]:
    """Related course cards for the landing rail, in `related_ids` order."""
    related = Course.objects.filter(slug__in=course.related_ids)
    return [course_catalog_item(item) for item in related]


def certificate_payload(course: Course) -> dict[str, Any]:
    """Certificate metadata for a completed course."""
    return {
        "courseId": course.slug,
        "courseTitle": course.title,
        "credentialId": f"KHM-2026-{course.slug.upper()}",
        "isOfficial": True,
    }
