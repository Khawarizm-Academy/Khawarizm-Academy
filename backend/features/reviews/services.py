from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone

from features.access.registry import OWN_KINDS
from features.access.services import has_object_perm, has_perm
from features.common.errors import Conflict, InvalidParameter, NotFound, PermissionDenied
from features.courses.models import Course, CourseStaff
from features.dashboard.models import Enrollment

from .models import CourseReview

DEFAULT_MIN_PROGRESS = 20
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50
SORTERS = {
    "newest": ("-created_at", "-id"),
    "highest": ("-rating", "-created_at", "-id"),
    "lowest": ("rating", "-created_at", "-id"),
}


def resolve_course(slug: str) -> Course:
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة.")
    return course


def _authenticated(actor: Any) -> bool:
    return bool(getattr(actor, "is_authenticated", False) and getattr(actor, "pk", None))


def minimum_progress() -> int:
    value = getattr(settings, "REVIEW_MIN_PROGRESS", DEFAULT_MIN_PROGRESS)
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return DEFAULT_MIN_PROGRESS


def eligibility(actor: Any, course: Course) -> dict[str, Any]:
    enrolled = bool(_authenticated(actor) and Enrollment.objects.filter(user_id=actor.pk, course_id=course.pk).exists())
    progress = 0
    if enrolled:
        progress = int(
            Enrollment.objects.filter(user_id=actor.pk, course_id=course.pk).values_list("progress", flat=True).first()
            or 0
        )
    minimum = minimum_progress()
    return {
        "enrolled": enrolled,
        "progress": progress,
        "minimumProgress": minimum,
        "eligible": enrolled and progress >= minimum,
    }


def _text(value: Any, field: str, maximum: int, *, required: bool = False) -> str:
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


def _rating(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
        raise InvalidParameter("التقييم يجب أن يكون رقمًا من 1 إلى 5.")
    return value


def validate_payload(data: Any, *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, Mapping):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(data) - {"rating", "title", "body"})
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    values: dict[str, Any] = {}
    if "rating" in data or not partial:
        values["rating"] = _rating(data.get("rating"))
    if "title" in data or not partial:
        values["title"] = _text(data.get("title"), "العنوان", 200)
    if "body" in data or not partial:
        values["body"] = _text(data.get("body"), "التعليق", 5000, required=True)
    return values


def validate_reply(data: Any) -> str:
    if not isinstance(data, Mapping) or set(data) != {"body"}:
        raise InvalidParameter("يجب إرسال نص الرد فقط.")
    return _text(data.get("body"), "الرد", 3000, required=True)


def _require_eligible(actor: Any, course: Course) -> None:
    if not has_perm(actor, "reviews.write"):
        raise PermissionDenied()
    state = eligibility(actor, course)
    if not state["enrolled"]:
        raise PermissionDenied("يجب التسجيل في الدورة قبل تقييمها.")
    if not state["eligible"]:
        raise PermissionDenied(f"يمكنك تقييم الدورة بعد إكمال {state['minimumProgress']}٪ على الأقل.")


def _recompute_aggregate(course_id: Any) -> Course:
    locked_course = Course.objects.select_for_update().get(pk=course_id)
    aggregate = CourseReview.objects.filter(course_id=course_id, is_hidden=False).aggregate(
        average=Avg("rating"), total=Count("id")
    )
    average = aggregate["average"]
    locked_course.rating = average.quantize(Decimal("0.1")) if average is not None else None
    locked_course.review_count = int(aggregate["total"] or 0)
    locked_course.save(update_fields=["rating", "review_count", "updated_at"])
    return locked_course


def _review(course: Course, review_id: Any) -> CourseReview:
    row = (
        CourseReview.objects.select_related("user", "course", "reply_author")
        .filter(course_id=course.pk, pk=review_id)
        .first()
    )
    if row is None:
        raise NotFound("التقييم غير موجود.")
    return row


@transaction.atomic
def create_review(actor: Any, course: Course, values: Mapping[str, Any]) -> CourseReview:
    _require_eligible(actor, course)
    locked_course = Course.objects.select_for_update().get(pk=course.pk)
    if locked_course.status not in {"published", "archived"}:
        raise NotFound("الدورة غير موجودة.")
    if CourseReview.objects.filter(user_id=actor.pk, course_id=locked_course.pk).exists():
        raise Conflict("لديك تقييم سابق لهذه الدورة.", code="review_exists")
    try:
        with transaction.atomic():
            row = CourseReview.objects.create(user=actor, course=locked_course, **values)
    except IntegrityError as exc:
        raise Conflict("لديك تقييم سابق لهذه الدورة.", code="review_exists") from exc
    _recompute_aggregate(locked_course.pk)
    row = CourseReview.objects.select_related("user", "course", "reply_author").get(pk=row.pk)
    transaction.on_commit(lambda: _notify_new_review(row))
    return row


def _notify_new_review(review: CourseReview) -> None:
    from features.dashboard.event_receiver import receive_review

    receive_review(review)


@transaction.atomic
def update_review(actor: Any, row: CourseReview, values: Mapping[str, Any]) -> CourseReview:
    if row.user_id != getattr(actor, "pk", None):
        raise PermissionDenied()
    _require_eligible(actor, row.course)
    locked = CourseReview.objects.select_for_update().select_related("course", "user", "reply_author").get(pk=row.pk)
    for field, value in values.items():
        setattr(locked, field, value)
    locked.save(update_fields=[*values.keys(), "updated_at"])
    _recompute_aggregate(locked.course_id)
    return CourseReview.objects.select_related("user", "course", "reply_author").get(pk=locked.pk)


@transaction.atomic
def reply_review(actor: Any, row: CourseReview, body: str) -> CourseReview:
    staff_kind = CourseStaff.objects.filter(course_id=row.course_id, user_id=getattr(actor, "pk", None)).values_list(
        "kind", flat=True
    ).first()
    if not has_object_perm(actor, "reviews.reply_own", {staff_kind} if staff_kind else set()):
        raise PermissionDenied()
    locked = CourseReview.objects.select_for_update().select_related("course", "user", "reply_author").get(pk=row.pk)
    if locked.reply_body:
        raise Conflict("تم نشر رد المدرب على هذا التقييم مسبقًا.", code="reply_exists")
    locked.reply_body = body
    locked.reply_author = actor
    locked.reply_created_at = timezone.now()
    locked.save(update_fields=["reply_body", "reply_author", "reply_created_at", "updated_at"])
    return CourseReview.objects.select_related("user", "course", "reply_author").get(pk=locked.pk)


@transaction.atomic
def moderate_review(actor: Any, row: CourseReview, *, hidden: bool, reason: str) -> CourseReview:
    if not has_perm(actor, "reviews.moderate"):
        raise PermissionDenied()
    locked = CourseReview.objects.select_for_update().select_related("course", "user", "reply_author").get(pk=row.pk)
    locked.is_hidden = hidden
    locked.hidden_reason = reason if hidden else ""
    locked.save(update_fields=["is_hidden", "hidden_reason", "updated_at"])
    _recompute_aggregate(locked.course_id)
    return CourseReview.objects.select_related("user", "course", "reply_author").get(pk=locked.pk)


def list_reviews(actor: Any, course: Course, *, page: int, page_size: int, sort: str) -> dict[str, Any]:
    if course.status not in {"published", "archived"}:
        raise NotFound("الدورة غير موجودة.")
    queryset = CourseReview.objects.select_related("user", "course", "reply_author").filter(course_id=course.pk)
    visible = Q(is_hidden=False)
    if _authenticated(actor):
        visible |= Q(user_id=actor.pk)
    queryset = queryset.filter(visible).order_by(*SORTERS[sort])
    paginator = Paginator(queryset, page_size)
    current_page = paginator.get_page(page)
    rows = list(current_page.object_list)
    aggregate = CourseReview.objects.filter(course_id=course.pk, is_hidden=False).aggregate(
        average=Avg("rating"), total=Count("id")
    )
    distribution = {
        str(rating): CourseReview.objects.filter(course_id=course.pk, is_hidden=False, rating=rating).count()
        for rating in range(5, 0, -1)
    }
    own = (
        CourseReview.objects.select_related("user", "course", "reply_author")
        .filter(course_id=course.pk, user_id=actor.pk)
        .first()
        if _authenticated(actor)
        else None
    )
    return {
        "course": course,
        "items": rows,
        "page": current_page,
        "average": aggregate["average"],
        "total": int(aggregate["total"] or 0),
        "distribution": distribution,
        "eligibility": eligibility(actor, course) if _authenticated(actor) else {
            "enrolled": False,
            "progress": 0,
            "minimumProgress": minimum_progress(),
            "eligible": False,
        },
        "own": own,
    }


def parse_page_params(query: Mapping[str, Any]) -> tuple[int, int, str]:
    try:
        page = max(1, int(query.get("page", 1)))
        page_size = max(1, min(MAX_PAGE_SIZE, int(query.get("pageSize", DEFAULT_PAGE_SIZE))))
    except (TypeError, ValueError):
        raise InvalidParameter("معاملات الصفحة غير صالحة.") from None
    sort = query.get("sort", "newest")
    if sort not in SORTERS:
        raise InvalidParameter("ترتيب التقييمات غير صالح.")
    return page, page_size, sort


def list_studio_reviews(actor: Any, *, page: int, page_size: int) -> dict[str, Any]:
    if not has_perm(actor, "reviews.reply_own"):
        raise PermissionDenied()
    course_ids = Course.objects.filter(
        Q(owner_id=actor.pk) | Q(staff__user_id=actor.pk, staff__kind__in=OWN_KINDS["reviews.reply_own"])
    ).values_list("id", flat=True)
    paginator = Paginator(
        CourseReview.objects.select_related("course", "user", "reply_author")
        .filter(course_id__in=course_ids, is_hidden=False)
        .order_by("-created_at", "-id"),
        page_size,
    )
    current_page = paginator.get_page(page)
    return {"page": current_page, "items": list(current_page.object_list)}


def _review_for_id(review_id: Any) -> CourseReview:
    row = (
        CourseReview.objects.select_related("user", "course", "reply_author")
        .filter(pk=review_id)
        .first()
    )
    if row is None:
        raise NotFound("التقييم غير موجود.")
    return row
