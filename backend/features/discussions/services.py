"""Discussion policy and mutations; views only resolve and serialize."""

from __future__ import annotations

import math
from typing import Any
from uuid import UUID

from django.core.cache import cache
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework.exceptions import Throttled

from features.access.registry import OWN_KINDS
from features.access.services import has_perm
from features.common.errors import InvalidParameter, NotFound, PermissionDenied
from features.courses.models import Course, CourseLesson, CourseStaff
from features.dashboard.models import Enrollment

from .models import DiscussionPost, DiscussionStatus, DiscussionThread
from .serializers import sanitize_markdown

POST_LIMIT = 10
POST_WINDOW_SECONDS = 60 * 60
MAX_TITLE_LENGTH = 200
MAX_BODY_LENGTH = 20_000


def _authenticated(actor: Any) -> bool:
    return bool(getattr(actor, "is_authenticated", False) and getattr(actor, "pk", None))


def _permission_granted(actor: Any, key: str) -> bool:
    try:
        return _authenticated(actor) and has_perm(actor, key)
    except ValueError:
        return False


def _administrator(actor: Any) -> bool:
    return _permission_granted(actor, "administrator")


def _course_staff(actor: Any, course: Course) -> bool:
    if not _authenticated(actor):
        return False
    if _administrator(actor) or course.owner_id == actor.pk:
        return True
    return CourseStaff.objects.filter(
        course_id=course.pk,
        user_id=actor.pk,
        kind__in=OWN_KINDS["discussions.reply_own"],
    ).exists()


def can_reply(actor: Any, course: Course) -> bool:
    return _permission_granted(actor, "discussions.reply_own") and _course_staff(actor, course)


def can_moderate(actor: Any) -> bool:
    return _permission_granted(actor, "discussions.moderate")


def is_enrolled(actor: Any, course: Course) -> bool:
    return bool(
        _authenticated(actor)
        and Enrollment.objects.filter(user_id=actor.pk, course_id=course.pk).exists()
    )


def can_post(actor: Any, course: Course) -> bool:
    return (
        _permission_granted(actor, "discussions.post")
        and course.status in {"published", "archived"}
        and is_enrolled(actor, course)
    )


def can_read(actor: Any, course: Course) -> bool:
    return can_reply(actor, course) or can_moderate(actor) or can_post(actor, course)


def require_reader(actor: Any, course: Course) -> None:
    if not can_read(actor, course):
        raise PermissionDenied("نقاشات الدورة متاحة للمتعلمين المسجلين وطاقم الدورة فقط.")


def require_poster(actor: Any, course: Course) -> None:
    if not can_post(actor, course):
        raise PermissionDenied("يجب التسجيل في الدورة للمشاركة في النقاش.")


def require_reply_staff(actor: Any, course: Course) -> None:
    if not can_reply(actor, course):
        raise PermissionDenied("لا تملك صلاحية الرد على نقاشات هذه الدورة.")


def require_moderator(actor: Any) -> None:
    if not can_moderate(actor):
        raise PermissionDenied("لا تملك صلاحية إدارة النقاشات.")


def resolve_course(slug: str) -> Course:
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة.")
    return course


def resolve_lesson(course: Course, value: Any, *, required: bool = False) -> CourseLesson | None:
    if value in (None, ""):
        if required:
            raise InvalidParameter("اختر درسًا للنقاش.")
        return None
    scope = Q(lesson_id=str(value))
    try:
        scope |= Q(pk=UUID(str(value)))
    except (AttributeError, TypeError, ValueError):
        pass
    lesson = CourseLesson.objects.select_related("module").filter(module__course_id=course.pk).filter(scope).first()
    if lesson is None or not lesson.is_published:
        raise NotFound("الدرس غير موجود في هذه الدورة.")
    return lesson


def _thread_queryset():
    return DiscussionThread.objects.select_related(
        "course", "lesson", "author", "accepted_post"
    ).prefetch_related(
        Prefetch(
            "posts",
            queryset=DiscussionPost.objects.select_related("author").order_by("created_at", "id"),
        )
    )


def get_thread(actor: Any, course: Course, thread_id: Any) -> DiscussionThread:
    row = _thread_queryset().filter(course_id=course.pk, pk=thread_id).first()
    if row is None:
        raise NotFound("النقاش غير موجود.")
    require_reader(actor, course)
    if row.status == DiscussionStatus.HIDDEN and not (can_reply(actor, course) or can_moderate(actor)):
        raise NotFound("النقاش غير موجود.")
    return row


def list_threads(actor: Any, course: Course, lesson: CourseLesson | None = None) -> list[DiscussionThread]:
    require_reader(actor, course)
    queryset = _thread_queryset().filter(course_id=course.pk)
    if lesson is not None:
        queryset = queryset.filter(lesson_id=lesson.pk)
    if not (can_reply(actor, course) or can_moderate(actor)):
        queryset = queryset.exclude(status=DiscussionStatus.HIDDEN)
    return list(queryset.order_by("-pinned", "-created_at", "-id"))


def unanswered_for_staff(actor: Any) -> list[DiscussionThread]:
    if not (_permission_granted(actor, "discussions.reply_own") or can_moderate(actor)):
        raise PermissionDenied("لا تملك صلاحية قراءة صندوق نقاشات المدرّب.")
    if can_moderate(actor):
        queryset = DiscussionThread.objects.filter(status=DiscussionStatus.OPEN)
    else:
        queryset = DiscussionThread.objects.filter(
            Q(course__owner_id=actor.pk)
            | Q(
                course__staff__user_id=actor.pk,
                course__staff__kind__in=OWN_KINDS["discussions.reply_own"],
            ),
            status=DiscussionStatus.OPEN,
        ).distinct()
    return list(
        queryset.select_related("course", "lesson", "author")
        .order_by("created_at", "id")
    )


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
    clean = sanitize_markdown(_text(value, "المحتوى", maximum=MAX_BODY_LENGTH))
    if not clean:
        raise InvalidParameter("يجب أن يحتوي المحتوى على نص Markdown صالح.")
    return clean


def validate_thread(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"title", "body", "lessonId", "lesson_id"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    lesson_value = data.get("lessonId", data.get("lesson_id"))
    return {
        "title": _text(data.get("title"), "العنوان", maximum=MAX_TITLE_LENGTH),
        "body": _markdown(data.get("body")),
        "lesson": lesson_value,
    }


def validate_post(data: Any) -> dict[str, str]:
    if not isinstance(data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"body"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    return {"body": _markdown(data.get("body"))}


def validate_moderation(data: Any) -> dict[str, bool]:
    if not isinstance(data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"hidden", "pinned"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    values: dict[str, bool] = {}
    for field in ("hidden", "pinned"):
        if field in data:
            if not isinstance(data[field], bool):
                raise InvalidParameter("قيمة الإخفاء أو التثبيت غير صالحة.")
            values[field] = data[field]
    if not values:
        raise InvalidParameter("أرسل hidden أو pinned.")
    return values


def _consume_post_quota(actor: Any) -> None:
    """Use a bounded hour bucket so repeated questions and replies share one cap."""
    bucket = math.floor(timezone.now().timestamp() / POST_WINDOW_SECONDS)
    key = f"discussions:posts:{actor.pk}:{bucket}"
    if cache.add(key, 1, timeout=POST_WINDOW_SECONDS + 60):
        count = 1
    else:
        try:
            count = cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=POST_WINDOW_SECONDS + 60)
            count = 1
    if count > POST_LIMIT:
        remaining = POST_WINDOW_SECONDS - (int(timezone.now().timestamp()) % POST_WINDOW_SECONDS)
        raise Throttled(detail="تجاوزت الحد المسموح: 10 مشاركات في الساعة.", wait=max(1, remaining))


@transaction.atomic
def create_thread(actor: Any, course: Course, values: dict[str, Any]) -> DiscussionThread:
    require_poster(actor, course)
    lesson = resolve_lesson(course, values.get("lesson"), required=True)
    _consume_post_quota(actor)
    row = DiscussionThread.objects.create(
        course=course,
        lesson=lesson,
        author=actor,
        title=values["title"],
        body=values["body"],
    )
    row = _thread_queryset().get(pk=row.pk)
    transaction.on_commit(lambda: _notify_new_question(row))
    return row


@transaction.atomic
def create_post(actor: Any, thread: DiscussionThread, values: dict[str, str]) -> DiscussionPost:
    course = thread.course
    staff_answer = can_reply(actor, course)
    if not staff_answer:
        require_poster(actor, course)
        if thread.status == DiscussionStatus.HIDDEN:
            raise NotFound("النقاش غير موجود.")
    _consume_post_quota(actor)
    post = DiscussionPost.objects.create(
        thread=thread,
        author=actor,
        body=values["body"],
        is_instructor_answer=staff_answer,
    )
    if staff_answer:
        post = DiscussionPost.objects.select_related("thread__course", "thread__lesson").get(pk=post.pk)
        transaction.on_commit(lambda: _notify_instructor_reply(post))
    return post


def _notify_new_question(thread: DiscussionThread) -> None:
    from features.dashboard.event_receiver import receive_question

    receive_question(thread)


def _notify_instructor_reply(post: DiscussionPost) -> None:
    from features.dashboard.event_receiver import receive_discussion_reply

    receive_discussion_reply(post)


@transaction.atomic
def set_accepted(actor: Any, thread: DiscussionThread, post_id: Any, accepted: bool = True) -> DiscussionThread:
    require_reply_staff(actor, thread.course)
    locked = (
        DiscussionThread.objects.select_for_update()
        .select_related("course")
        .get(pk=thread.pk)
    )
    if not accepted:
        locked.accepted_post = None
        if locked.status != DiscussionStatus.HIDDEN:
            locked.status = DiscussionStatus.OPEN
        locked.save(update_fields=["accepted_post", "status", "updated_at"])
        return _thread_queryset().get(pk=locked.pk)
    post = DiscussionPost.objects.filter(thread_id=locked.pk, pk=post_id).first()
    if post is None or not post.is_instructor_answer:
        raise InvalidParameter("يمكن اعتماد إجابة من طاقم الدورة فقط.")
    locked.accepted_post = post
    if locked.status != DiscussionStatus.HIDDEN:
        locked.status = DiscussionStatus.ANSWERED
    locked.save(update_fields=["accepted_post", "status", "updated_at"])
    return _thread_queryset().get(pk=locked.pk)


@transaction.atomic
def moderate(actor: Any, thread: DiscussionThread, values: dict[str, bool]) -> DiscussionThread:
    require_moderator(actor)
    locked = DiscussionThread.objects.select_for_update().get(pk=thread.pk)
    if "pinned" in values:
        locked.pinned = values["pinned"]
    if "hidden" in values:
        if values["hidden"]:
            locked.status = DiscussionStatus.HIDDEN
        elif locked.status == DiscussionStatus.HIDDEN:
            locked.status = DiscussionStatus.ANSWERED if locked.accepted_post_id else DiscussionStatus.OPEN
    locked.save(update_fields=[*values.keys(), "status", "updated_at"])
    return _thread_queryset().get(pk=locked.pk)
