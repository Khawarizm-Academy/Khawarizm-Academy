"""Certificate lifecycle rules over the dashboard-owned Certificate row."""

from __future__ import annotations

import secrets
import string
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from features.access.services import has_perm, record_audit
from features.common.choices import CourseStatus
from features.courses.models import Course, CourseLesson, LessonProgress
from features.dashboard.models import Certificate
from features.quizzes.models import Attempt, AttemptStatus, Quiz, QuizKind

SERIAL_PREFIX = "KH"
SERIAL_ALPHABET = string.ascii_uppercase + string.digits
CERTIFICATE_REVOKED_ACTION = "certificate_revoked"
CERTIFICATE_NOT_FOUND = "الشهادة غير موجودة."
CERTIFICATE_SCHEMA_PENDING = "حقول الشهادة الجديدة غير متاحة بعد؛ يلزم تحديث مخطط الشهادة."


def _field_names() -> set[str]:
    return {field.name for field in Certificate._meta.get_fields()}


def _serial_field() -> str:
    return "serial" if "serial" in _field_names() else "credential_id"


def _serial_query(serial: str) -> Q:
    fields = _field_names()
    query = Q(credential_id=serial)
    if "serial" in fields:
        query |= Q(serial=serial)
    return query


def _learner_name(user: Any) -> str:
    name = str(getattr(user, "full_name", "") or "").strip()
    if name:
        return name
    first = str(getattr(user, "first_name", "") or "").strip()
    last = str(getattr(user, "last_name", "") or "").strip()
    return " ".join(part for part in (first, last) if part) or "متعلم"


def _hours(course: Course) -> Decimal | None:
    seconds = getattr(course, "total_seconds", 0) or 0
    return (Decimal(seconds) / Decimal(3600)).quantize(Decimal("0.01")) if seconds else None


def _new_serial(now: datetime) -> str:
    suffix = "".join(secrets.choice(SERIAL_ALPHABET) for _ in range(6))
    return f"{SERIAL_PREFIX}-{now.year}-{suffix}"


def _has_completed_course(user: Any, course: Course) -> bool:
    if course.status not in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}:
        return False
    from features.dashboard.models import Enrollment

    if not Enrollment.objects.filter(user_id=user.pk, course_id=course.pk).exists():
        return False
    lesson_ids = list(
        CourseLesson.objects.filter(module__course_id=course.pk, is_published=True).values_list("pk", flat=True)
    )
    if not lesson_ids or LessonProgress.objects.filter(
        user_id=user.pk, lesson_id__in=lesson_ids, completed=True
    ).count() < len(lesson_ids):
        return False
    exam_ids = list(
        Quiz.objects.filter(course_id=course.pk, kind=QuizKind.EXAM, is_published=True).values_list("pk", flat=True)
    )
    if not exam_ids:
        return True
    passed = set(
        Attempt.objects.filter(
            user_id=user.pk,
            quiz_id__in=exam_ids,
            status__in=(AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED),
            passed=True,
        ).values_list("quiz_id", flat=True)
    )
    return set(exam_ids).issubset(passed)


def _certificate_defaults(user: Any, course: Course, now: datetime, serial: str) -> dict[str, Any]:
    fields = _field_names()
    defaults: dict[str, Any] = {
        "user": user,
        "course": course,
        "credential_id": serial,
        "issue_date": now.date().isoformat(),
        "is_official": True,
    }
    optional = {
        "serial": serial,
        "issued_at": now,
        "learner_name_snapshot": _learner_name(user),
        "course_title_snapshot": course.title,
        "hours": _hours(course),
    }
    defaults.update({name: value for name, value in optional.items() if name in fields})
    return defaults


@transaction.atomic
def issue_certificate_if_complete(user: Any, course: Course, *, now: datetime | None = None) -> Certificate | None:
    """Issue once after all published lessons and any required exam are complete."""
    if not _has_completed_course(user, course):
        return None
    locked = Certificate.objects.select_for_update().filter(user_id=user.pk, course_id=course.pk).first()
    if locked is not None:
        return locked
    now = now or timezone.now()
    for _ in range(8):
        serial = _new_serial(now)
        try:
            with transaction.atomic():
                row = Certificate.objects.create(**_certificate_defaults(user, course, now, serial))
        except IntegrityError:
            existing = Certificate.objects.filter(user_id=user.pk, course_id=course.pk).first()
            if existing is not None:
                return existing
            if "serial" not in _field_names():
                raise
            continue
        transaction.on_commit(lambda row=row: _notify_certificate(user.pk, row))
        return row
    raise IntegrityError("Unable to allocate a unique certificate serial.")


def _notify_certificate(user_id: Any, row: Certificate, *, revoked: bool = False) -> None:
    from features.dashboard.event_receiver import receive_certificate

    receive_certificate(user_id, row, revoked=revoked)


def _issued_at(row: Certificate) -> str | None:
    value = getattr(row, "issued_at", None)
    if value is not None:
        return value.isoformat()
    legacy = str(getattr(row, "issue_date", "") or "").strip()
    try:
        return datetime.combine(date.fromisoformat(legacy), datetime.min.time(), tzinfo=UTC).isoformat()
    except ValueError:
        return None


def verification_payload(row: Certificate) -> dict[str, Any]:
    """Return the deliberately minimal public verification contract."""
    revoked_at = getattr(row, "revoked_at", None)
    return {
        "valid": not bool(revoked_at) and bool(getattr(row, "is_official", True)),
        "learnerName": getattr(row, "learner_name_snapshot", "") or _learner_name(row.user),
        "courseTitle": getattr(row, "course_title_snapshot", "") or row.course.title,
        "issuedAt": _issued_at(row),
        "revoked": bool(revoked_at),
    }


def verify_certificate(serial: str) -> dict[str, Any] | None:
    """Resolve by serial without exposing identifiers or contact details."""
    row = Certificate.objects.select_related("user", "course").filter(_serial_query(serial)).first()
    return verification_payload(row) if row is not None else None


@transaction.atomic
def revoke_certificate(actor: Any, serial: str, reason: str, *, request: Any = None) -> Certificate:
    """Revoke a certificate only when the additive schema supports the reason/audit state."""
    if not has_perm(actor, "certificates.manage"):
        from features.common.errors import PermissionDenied

        raise PermissionDenied()
    reason = str(reason or "").strip()
    if not reason or len(reason) > 500:
        from features.common.errors import InvalidParameter

        raise InvalidParameter("سبب الإلغاء مطلوب وبحد أقصى 500 حرفًا.")
    missing = {"revoked_at", "revoked_reason"} - _field_names()
    if missing:
        from features.common.errors import Conflict

        raise Conflict(CERTIFICATE_SCHEMA_PENDING, code="certificate_schema_pending")
    row = Certificate.objects.select_for_update().select_related("course").filter(_serial_query(serial)).first()
    if row is None:
        from features.common.errors import NotFound

        raise NotFound(CERTIFICATE_NOT_FOUND)
    if getattr(row, "revoked_at", None) is None:
        now = timezone.now()
        row.revoked_at = now
        row.revoked_reason = reason
        row.save(update_fields=["revoked_at", "revoked_reason", "updated_at"])
        record_audit(
            CERTIFICATE_REVOKED_ACTION,
            actor=actor,
            target_type="certificate",
            target_id=row.pk,
            detail={"serial": getattr(row, _serial_field(), ""), "reason": reason},
            request=request,
        )
        transaction.on_commit(lambda: _notify_certificate(row.user_id, row, revoked=True))
    return row


def certificate_for_serial(serial: str) -> Certificate | None:
    """Return a certificate row for the authenticated management surface."""
    return Certificate.objects.select_related("user", "course").filter(_serial_query(serial)).first()


def certificate_serial(row: Certificate) -> str:
    return str(getattr(row, "serial", "") or getattr(row, "credential_id", ""))
