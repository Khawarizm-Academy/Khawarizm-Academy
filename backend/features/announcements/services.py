"""Announcement policy and mutations.

Views only resolve requests; this module owns course scope, learner privacy,
Markdown normalization, the per-course daily creation limit, and the Phase 11
notification hook boundary.
"""
from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from features.access.registry import OWN_KINDS
from features.access.services import has_perm
from features.common.errors import Conflict, InvalidParameter, NotFound, PermissionDenied
from features.courses.models import Course, CourseStaff
from features.dashboard.models import Enrollment

from .models import CourseAnnouncement, CourseAnnouncementDailyQuota
from .serializers import sanitize_markdown
from .signals import on_announcement_created

DAILY_POST_LIMIT = 3
STAFF_KINDS = frozenset({"owner", "co_instructor", "assistant"})


def _permission_granted(actor: Any) -> bool:
    """Resolve the canonical post permission while failing closed for unknown keys."""
    try:
        return has_perm(actor, "announcements.post")
    except ValueError:
        return False


def is_course_staff(actor: Any, course: Course) -> bool:
    if not getattr(actor, "is_authenticated", False) or not getattr(actor, "pk", None):
        return False
    if course.owner_id == actor.pk:
        return True
    return CourseStaff.objects.filter(
        course_id=course.pk, user_id=actor.pk, kind__in=STAFF_KINDS
    ).exists()


def can_manage(actor: Any, course: Course) -> bool:
    return _permission_granted(actor) and is_course_staff(actor, course)


def require_manager(actor: Any, course: Course) -> None:
    if not can_manage(actor, course):
        raise PermissionDenied("لا تملك صلاحية نشر إعلانات هذه الدورة.")


def is_enrolled(actor: Any, course: Course) -> bool:
    return bool(
        getattr(actor, "is_authenticated", False)
        and Enrollment.objects.filter(user_id=actor.pk, course_id=course.pk).exists()
    )


def can_read(actor: Any, course: Course) -> bool:
    return can_manage(actor, course) or (
        course.status in {"published", "archived"} and is_enrolled(actor, course)
    )


def require_reader(actor: Any, course: Course) -> None:
    if not can_read(actor, course):
        raise PermissionDenied("الإعلانات متاحة للمتعلّمين المسجلين في الدورة فقط.")


def courses_for_posting(actor: Any) -> list[Course]:
    """Return only assigned courses for which this actor can manage announcements."""
    if not _permission_granted(actor):
        raise PermissionDenied("لا تملك صلاحية نشر إعلانات الدورات.")
    if not getattr(actor, "is_authenticated", False) or not getattr(actor, "pk", None):
        return []
    return list(
        Course.objects.filter(
            Q(owner_id=actor.pk)
            | Q(staff__user_id=actor.pk, staff__kind__in=OWN_KINDS["announcements.post"])
        )
        .only("slug", "title", "status")
        .distinct()
        .order_by("title", "slug")
    )


def _course_or_404(slug: str) -> Course:
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة.")
    return course


def resolve_course(slug: str) -> Course:
    return _course_or_404(slug)


def list_for(course: Course) -> list[CourseAnnouncement]:
    return list(
        CourseAnnouncement.objects.select_related("author")
        .filter(course_id=course.pk)
        .order_by("-pinned", "-created_at", "-id")
    )


def get_for(course: Course, announcement_id: Any) -> CourseAnnouncement:
    row = (
        CourseAnnouncement.objects.select_related("course", "author")
        .filter(course_id=course.pk, pk=announcement_id)
        .first()
    )
    if row is None:
        raise NotFound("الإعلان غير موجود.")
    return row


def _text(value: Any, field: str, *, maximum: int, required: bool = True) -> str:
    if value is None and not required:
        return ""
    if not isinstance(value, str):
        raise InvalidParameter(f"حقل {field} غير صالح.")
    value = value.strip()
    if required and not value:
        raise InvalidParameter(f"حقل {field} مطلوب.")
    if len(value) > maximum:
        raise InvalidParameter(f"حقل {field} أطول من الحد المسموح.")
    return value


def _markdown(value: Any) -> str:
    clean = sanitize_markdown(_text(value, "المحتوى", maximum=50_000))
    if not clean:
        raise InvalidParameter("يجب أن يحتوي المحتوى على نص Markdown صالح.")
    return clean


def validate_create(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"title", "body", "pinned"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    pinned = data.get("pinned", False)
    if not isinstance(pinned, bool):
        raise InvalidParameter("قيمة التثبيت غير صالحة.")
    return {
        "title": _text(data.get("title"), "العنوان", maximum=200),
        "body": _markdown(data.get("body")),
        "pinned": pinned,
    }


def validate_update(data: Any, *, partial: bool) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"title", "body", "pinned"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    values: dict[str, Any] = {}
    if "title" in data or not partial:
        values["title"] = _text(data.get("title"), "العنوان", maximum=200)
    if "body" in data or not partial:
        values["body"] = _markdown(data.get("body"))
    if "pinned" in data:
        if not isinstance(data["pinned"], bool):
            raise InvalidParameter("قيمة التثبيت غير صالحة.")
        values["pinned"] = data["pinned"]
    return values


@transaction.atomic
def create(actor: Any, course: Course, values: dict[str, Any]) -> CourseAnnouncement:
    require_manager(actor, course)
    locked_course = Course.objects.select_for_update().get(pk=course.pk)
    quota, _ = CourseAnnouncementDailyQuota.objects.select_for_update().get_or_create(
        course=locked_course,
        local_date=timezone.localdate(),
    )
    if quota.post_count >= DAILY_POST_LIMIT:
        raise Conflict(
            "وصلت الدورة إلى الحد اليومي للإعلانات. حاول غدًا.",
            code="announcement_daily_limit",
        )
    if values.get("pinned", False):
        CourseAnnouncement.objects.filter(course_id=locked_course.pk, pinned=True).update(pinned=False)
    row = CourseAnnouncement.objects.create(
        course=locked_course,
        author=actor,
        title=values["title"],
        body=values["body"],
        pinned=values.get("pinned", False),
    )
    quota.post_count += 1
    quota.save(update_fields=["post_count", "updated_at"])
    transaction.on_commit(
        lambda: on_announcement_created.send(
            sender=CourseAnnouncement, announcement=row, course=locked_course, actor=actor
        ),
        robust=True,
    )
    return row


@transaction.atomic
def update(actor: Any, row: CourseAnnouncement, values: dict[str, Any]) -> CourseAnnouncement:
    require_manager(actor, row.course)
    Course.objects.select_for_update().get(pk=row.course_id)
    locked = CourseAnnouncement.objects.select_for_update().select_related("course", "author").get(pk=row.pk)
    if values.get("pinned") is True:
        CourseAnnouncement.objects.filter(course_id=locked.course_id, pinned=True).exclude(pk=locked.pk).update(
            pinned=False
        )
    for field, value in values.items():
        setattr(locked, field, value)
    locked.save(update_fields=[*values.keys(), "updated_at"])
    return locked


@transaction.atomic
def delete(actor: Any, row: CourseAnnouncement) -> None:
    require_manager(actor, row.course)
    Course.objects.select_for_update().get(pk=row.course_id)
    CourseAnnouncement.objects.select_for_update().filter(pk=row.pk).delete()


@transaction.atomic
def set_pinned(actor: Any, row: CourseAnnouncement, pinned: bool) -> CourseAnnouncement:
    require_manager(actor, row.course)
    Course.objects.select_for_update().get(pk=row.course_id)
    locked = CourseAnnouncement.objects.select_for_update().select_related("course", "author").get(pk=row.pk)
    if pinned:
        CourseAnnouncement.objects.filter(course_id=locked.course_id, pinned=True).exclude(pk=locked.pk).update(
            pinned=False
        )
    locked.pinned = pinned
    locked.save(update_fields=["pinned", "updated_at"])
    return locked
