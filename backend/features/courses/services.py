"""Course lifecycle and authorization services.

Views call these functions after resolving request data; all state-machine and
object-level policy remains here so Studio and admin jobs share one contract.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from features.access.registry import OWN_KINDS
from features.access.services import has_perm, record_audit
from features.common.choices import (
    AuditAction,
    CourseLevel,
    CoursePriceType,
    CourseStaffKind,
    CourseStatus,
    LessonKind,
    LessonResourceKind,
    LiveSessionState,
    VideoStatus,
)
from features.common.errors import (
    Conflict,
    HasEnrollments,
    InvalidParameter,
    NotFound,
    NotPublishable,
    PermissionDenied,
)
from features.common.messages import COURSE_NOT_FOUND, PUBLISH_ISSUE_MESSAGES
from features.courses.models import (
    LANGUAGES,
    Course,
    CourseLesson,
    CourseLiveSession,
    CourseModule,
    CourseStaff,
    LessonResource,
)

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_STABLE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
_RESERVED_SLUGS = frozenset({"new", "learn", "certificate"})
_LIVE_ALLOWED_HOSTS_DEFAULT = frozenset(
    {"meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com", "whereby.com"}
)
_ARABIC_WEEKDAYS = ("الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد")
_ARABIC_MONTHS = (
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
)
_SEEDED_DATE_RE = re.compile(r"^(?P<year>20\d{2})-(?P<month>0[1-9]|1[0-2])-(?P<day>[0-3]\d)$")
_SEEDED_TIME_RE = re.compile(r"^(?P<hour>[01]\d|2[0-3]):(?P<minute>[0-5]\d)$")


def live_session_timezone(value: str | None) -> ZoneInfo:
    """Resolve an instructor-supplied timezone without breaking serialization."""
    candidate = (value or getattr(settings, "TIME_ZONE", "UTC")).strip()
    try:
        return ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError):
        try:
            return ZoneInfo(getattr(settings, "TIME_ZONE", "UTC"))
        except (ZoneInfoNotFoundError, ValueError):
            return ZoneInfo("UTC")


def _arabic_digits(value: str) -> str:
    return value.translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


def format_live_session_labels(starts_at: datetime | None, timezone_name: str | None) -> tuple[str, str]:
    """Return Arabic date/time labels in the session's display timezone."""
    if starts_at is None:
        return "", ""
    if timezone.is_naive(starts_at):
        starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())
    local = starts_at.astimezone(live_session_timezone(timezone_name))
    hour = local.hour % 12 or 12
    period = "ص" if local.hour < 12 else "م"
    date_label = (
        f"{_ARABIC_WEEKDAYS[local.weekday()}، {_arabic_digits(str(local.day))} "
        f"{_ARABIC_MONTHS[local.month - 1]} {_arabic_digits(str(local.year))}"
    )
    time_label = f"{_arabic_digits(str(hour))}:{_arabic_digits(f'{local.minute:02d}')} {period}"
    return date_label, time_label


def live_session_state(row: Any, now: datetime | None = None) -> str:
    """Compute the compatibility state from the timestamp, not stale storage."""
    if row.starts_at is None:
        return row.state or LiveSessionState.UPCOMING
    if row.status == CourseLiveSession.STATUS_CANCELLED:
        return LiveSessionState.PAST
    now = now or timezone.now()
    end = row.starts_at + timedelta(minutes=max(1, row.duration_minutes or 0))
    if now < row.starts_at:
        return LiveSessionState.UPCOMING
    if now < end:
        return LiveSessionState.LIVE
    return LiveSessionState.PAST


def live_session_labels(row: Any) -> tuple[str, str]:
    """Prefer derived labels while keeping hand-authored legacy rows readable."""
    if row.starts_at is None:
        return row.date_label or "تاريخ غير محدد", row.time_label or "—"
    return format_live_session_labels(row.starts_at, row.timezone)


def allowed_live_hosts() -> frozenset[str]:
    configured = getattr(settings, "LIVE_ALLOWED_HOSTS", _LIVE_ALLOWED_HOSTS_DEFAULT)
    values = configured.split(",") if isinstance(configured, str) else configured
    return frozenset(str(item).strip().lower().rstrip(".") for item in values if str(item).strip())


def validate_live_meet_url(value: str | None) -> str:
    """Validate a learner-facing meeting URL without ever fetching it."""
    value = (value or "").strip()
    if not value:
        return ""
    if len(value) > 400 or any(ord(character) < 32 for character in value):
        raise InvalidParameter("رابط الجلسة يجب أن يكون HTTPS ومن مضيف مسمو.")
    try:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower().rstrip(".")
    except ValueError:
        raise InvalidParameter("رابط الجلسة يجب أن يكون HTTPS ومن مضيف مسمو.") from None
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise InvalidParameter("رابط الجلسة يجب أن يكون HTTPS ومن مضيف مسمو.")
    hosts = allowed_live_hosts()
    if host not in hosts and not any(host.endswith(f".{allowed}") for allowed in hosts):
        raise InvalidParameter("مضيف رابط الجلسة غير مسموح.")
    return value


def refresh_states(now: datetime | None = None) -> int:
    """Synchronize stored compatibility state/status for timestamped sessions."""
    now = now or timezone.now()
    changed = 0
    for row in CourseLiveSession.objects.filter(starts_at__isnull=False).only(
        "id", "starts_at", "duration_minutes", "state", "status"
    ).iterator(chunk_size=500):
        state = live_session_state(row, now)
        status = row.status
        if status != CourseLiveSession.STATUS_CANCELLED:
            status = {
                LiveSessionState.UPCOMING: CourseLiveSession.STATUS_SCHEDULED,
                LiveSessionState.LIVE: CourseLiveSession.STATUS_LIVE,
                LiveSessionState.PAST: CourseLiveSession.STATUS_ENDED,
            }[state]
        if row.state != state or row.status != status:
            CourseLiveSession.objects.filter(pk=row.pk).update(state=state, status=status)
            changed += 1
    return changed


def backfill_live_session_timestamps(*, queryset: Any | None = None) -> dict[str, int]:
    """Backfill only the unambiguous YYYY-MM-DD + HH:MM seeded pattern."""
    base_queryset = queryset if queryset is not None else CourseLiveSession.objects.all()
    rows = base_queryset.filter(starts_at__isnull=True).order_by("pk")
    updated = ambiguous = 0
    for row in rows.iterator(chunk_size=500):
        date_match = _SEEDED_DATE_RE.fullmatch((row.date_label or "").strip())
        time_match = _SEEDED_TIME_RE.fullmatch((row.time_label or "").strip())
        if date_match and time_match:
            try:
                naive = datetime(
                    int(date_match.group("year")),
                    int(date_match.group("month")),
                    int(date_match.group("day")),
                    int(time_match.group("hour")),
                    int(time_match.group("minute")),
                )
                session_zone = live_session_timezone(row.timezone)
                first_fold = naive.replace(tzinfo=session_zone, fold=0)
                second_fold = naive.replace(tzinfo=session_zone, fold=1)
                starts_at = first_fold if first_fold.utcoffset() == second_fold.utcoffset() else None
            except (TypeError, ValueError):
                starts_at = None
            if starts_at is not None:
                labels = format_live_session_labels(starts_at, row.timezone)
                CourseLiveSession.objects.filter(pk=row.pk, starts_at__isnull=True).update(
                    starts_at=starts_at, date_label=labels[0], time_label=labels[1]
                )
                updated += 1
                continue
        if row.date_label != "تاريخ غير محدد":
            CourseLiveSession.objects.filter(pk=row.pk, starts_at__isnull=True).update(date_label="تاريخ غير محدد")
            ambiguous += 1
    return {"updated": updated, "ambiguous": ambiguous}


_COURSE_FIELDS = {
    "title",
    "categoryLabel",
    "categorySlug",
    "thumbnailUrl",
    "courseLevel",
    "courseLevelAr",
    "priceType",
    "priceLabel",
    "language",
    "tagline",
    "about",
    "instructor",
    "instructorCredential",
    "instructorBio",
    "outcomes",
    "relatedIds",
    "examQuestionCount",
    "examMinutes",
    "examPassThreshold",
    "examAttemptsLeft",
    "slug",
    "expectedUpdatedAt",
}
_COURSE_MAP = {
    "categoryLabel": "category_label",
    "categorySlug": "category_slug",
    "thumbnailUrl": "thumbnail_url",
    "courseLevel": "course_level",
    "courseLevelAr": "course_level_ar",
    "priceType": "price_type",
    "priceLabel": "price_label",
    "instructorCredential": "instructor_credential",
    "instructorBio": "instructor_bio",
    "relatedIds": "related_ids",
    "examQuestionCount": "exam_question_count",
    "examMinutes": "exam_minutes",
    "examPassThreshold": "exam_pass_threshold",
    "examAttemptsLeft": "exam_attempts_left",
}


@dataclass(frozen=True, slots=True)
class Issue:
    code: str
    severity: str
    target: str = "course"

    def as_dict(self) -> dict[str, str]:
        return {**asdict(self), "message": PUBLISH_ISSUE_MESSAGES[self.code]}


def _authenticated(user: Any) -> bool:
    return bool(getattr(user, "is_authenticated", False) and getattr(user, "pk", None))


def _staff_kind(user: Any, course: Course) -> str | None:
    if not _authenticated(user):
        return None
    return CourseStaff.objects.filter(course_id=course.pk, user_id=user.pk).values_list("kind", flat=True).first()


def _owns(user: Any, course: Course, kinds: set[str]) -> bool:
    return _staff_kind(user, course) in kinds


def _course_permission(
    user: Any, course: Course, own_key: str, any_key: str, *, fallback: set[str] | None = None
) -> bool:
    if has_perm(user, any_key):
        return True
    if not has_perm(user, own_key):
        return False
    kinds = OWN_KINDS.get(own_key, fallback or {CourseStaffKind.OWNER, CourseStaffKind.CO_INSTRUCTOR})
    return _owns(user, course, kinds)


def can_edit(user: Any, course: Course, *, curriculum: bool = False) -> bool:
    """Return whether the actor has the requested own/any editor capability."""
    return _course_permission(
        user,
        course,
        "curriculum.edit_own" if curriculum else "courses.edit_own",
        "curriculum.edit_any" if curriculum else "courses.edit_any",
    )


def _require_edit(user: Any, course: Course, *, curriculum: bool = False) -> None:
    if not can_edit(user, course, curriculum=curriculum):
        raise PermissionDenied()


def _require_action(user: Any, course: Course, own_key: str, any_key: str, *, fallback: set[str] | None = None) -> None:
    if not _course_permission(user, course, own_key, any_key, fallback=fallback):
        raise PermissionDenied()


def _slug(value: Any) -> str:
    if not isinstance(value, str) or len(value) < 3 or len(value) > 60 or not _SLUG_RE.fullmatch(value):
        raise InvalidParameter("المعرّف يجب أن يتكون من أحرف لاتينية صغيرة وأرقام وشرطات.")
    if value in _RESERVED_SLUGS:
        raise InvalidParameter("هذا المعرّف محجوز.")
    return value


def _generated(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _expected(row: Any, value: Any, current: dict[str, Any] | None = None) -> None:
    if value is None:
        return
    parsed = parse_datetime(value) if isinstance(value, str) else value
    if isinstance(parsed, datetime) and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    if not isinstance(parsed, datetime) or parsed != row.updated_at:
        error = Conflict("تغيّر المحتوى منذ آخر قراءة؛ حدّث الصفحة ثم أعد المحاولة.", code="stale_write")
        error.fields = {"current": current or {"updatedAt": row.updated_at}}
        raise error


def _course_conflict_values(course: Course) -> dict[str, Any]:
    return {
        "slug": course.slug,
        "title": course.title,
        "categoryLabel": course.category_label,
        "categorySlug": course.category_slug,
        "thumbnailUrl": course.thumbnail_url,
        "courseLevel": course.course_level,
        "courseLevelAr": course.course_level_ar,
        "priceType": course.price_type,
        "priceLabel": course.price_label,
        "language": course.language,
        "tagline": course.tagline,
        "about": course.about,
        "instructor": course.instructor,
        "instructorCredential": course.instructor_credential,
        "instructorBio": course.instructor_bio,
        "outcomes": course.outcomes,
        "relatedIds": course.related_ids,
        "updatedAt": course.updated_at,
    }


def _lesson_conflict_values(lesson: CourseLesson) -> dict[str, Any]:
    return {
        "lessonId": lesson.lesson_id,
        "title": lesson.title,
        "duration": lesson.duration,
        "summary": lesson.summary,
        "order": lesson.order,
        "kind": lesson.kind,
        "content": lesson.content,
        "isFreePreview": lesson.is_free_preview,
        "isPublished": lesson.is_published,
        "updatedAt": lesson.updated_at,
    }


def _profile_name(user: Any) -> str:
    return getattr(user, "full_name", "") or getattr(user, "email", "").split("@", 1)[0]


@transaction.atomic
def create_course(owner: Any, data: Mapping[str, Any]) -> Course:
    if not has_perm(owner, "courses.create"):
        raise PermissionDenied()
    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات الدورة غير صالحة.")
    values = dict(data)
    unknown = sorted(set(values) - _COURSE_FIELDS)
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    _validate_course_values(values)
    supplied = values.pop("slug", None)
    slug = _slug(supplied) if supplied else _generated("course")
    if Course.objects.filter(slug=slug).exists():
        raise Conflict("المعرّف مستخدم بالفعل.")
    kwargs = {"slug": slug, "status": CourseStatus.DRAFT, "owner": owner}
    for key, value in values.items():
        if key != "expectedUpdatedAt":
            kwargs[_COURSE_MAP.get(key, key)] = value
    kwargs.setdefault("title", "")
    kwargs.setdefault("category_label", "")
    kwargs.setdefault("category_slug", "")
    kwargs.setdefault("thumbnail_url", "")
    kwargs.setdefault("course_level", "beginner")
    kwargs["instructor"] = kwargs.get("instructor") or _profile_name(owner)
    course = Course.objects.create(**kwargs)
    CourseStaff.objects.create(course=course, user=owner, kind=CourseStaffKind.OWNER)
    return course


@transaction.atomic
def duplicate_course(course: Course, actor: Any, *, keep_videos: bool = False) -> Course:
    """Copy the authoring graph into a new draft, never copying provider files."""
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.edit_own", "courses.edit_any", fallback={CourseStaffKind.OWNER})
    base = re.sub(r"[^a-z0-9]+", "-", course.slug.lower()).strip("-") or "course"
    slug = f"{base}-copy"
    suffix = 2
    while Course.objects.filter(slug=slug).exists():
        slug = f"{base}-copy-{suffix}"
        suffix += 1
    fields = {
        field.name: getattr(course, field.name)
        for field in Course._meta.fields
        if field.name
        not in {"id", "slug", "owner", "status", "submitted_at", "published_at", "review_note", "updated_at"}
    }
    fields.update(
        slug=slug, owner=actor, status=CourseStatus.DRAFT, submitted_at=None, published_at=None, review_note=""
    )
    clone = Course.objects.create(**fields)
    CourseStaff.objects.create(course=clone, user=actor, kind=CourseStaffKind.OWNER)
    lesson_map: dict[Any, CourseLesson] = {}
    for module in course.modules.all():
        copied_module = CourseModule.objects.create(
            course=clone, module_id=module.module_id, title=module.title, order=module.order
        )
        for lesson in module.lessons.select_related("video_asset").all():
            copied_lesson = CourseLesson.objects.create(
                module=copied_module,
                lesson_id=lesson.lesson_id,
                title=lesson.title,
                duration=lesson.duration,
                summary=lesson.summary,
                order=lesson.order,
                kind=lesson.kind,
                video_asset=lesson.video_asset if keep_videos else None,
                is_free_preview=lesson.is_free_preview,
                is_published=lesson.is_published,
                content=lesson.content,
                duration_seconds=lesson.duration_seconds,
            )
            lesson_map[lesson.pk] = copied_lesson
            for resource in lesson.resources.all():
                LessonResource.objects.create(
                    lesson=copied_lesson,
                    title=resource.title,
                    url=resource.url,
                    kind=resource.kind,
                    order=resource.order,
                )
    from features.quizzes.models import Option, Question, Quiz

    for quiz in course.quizzes.prefetch_related("questions__options").all():
        copied_quiz = Quiz.objects.create(
            course=clone,
            lesson=lesson_map.get(quiz.lesson_id),
            kind=quiz.kind,
            title=quiz.title,
            instructions=quiz.instructions,
            is_published=False,
            order=quiz.order,
            time_limit_minutes=quiz.time_limit_minutes,
            pass_threshold=quiz.pass_threshold,
            max_attempts=quiz.max_attempts,
            draw_count=quiz.draw_count,
            shuffle_questions=quiz.shuffle_questions,
            shuffle_options=quiz.shuffle_options,
            reveal_policy=quiz.reveal_policy,
            unlock_progress_percent=quiz.unlock_progress_percent,
            created_by=actor,
        )
        for question in quiz.questions.all():
            copied_question = Question.objects.create(
                quiz=copied_quiz,
                kind=question.kind,
                prompt=question.prompt,
                code=question.code,
                explanation=question.explanation,
                hint=question.hint,
                points=question.points,
                order=question.order,
                partial_credit=question.partial_credit,
            )
            Option.objects.bulk_create(
                [
                    Option(
                        question=copied_question,
                        label=option.label,
                        is_correct=option.is_correct,
                        order=option.order,
                    )
                    for option in question.options.all()
                ]
            )
    return clone


@transaction.atomic
def bulk_archive_courses(slugs: list[str], actor: Any) -> int:
    if not has_perm(actor, "courses.edit_any") and not has_perm(actor, "courses.edit_own"):
        raise PermissionDenied()
    rows = list(studio_course_queryset(actor).select_for_update().filter(slug__in=slugs))
    if len(rows) != len(set(slugs)):
        raise PermissionDenied()
    changed = 0
    for course in rows:
        if course.status != CourseStatus.ARCHIVED:
            course.status = CourseStatus.ARCHIVED
            course.save(update_fields=["status", "updated_at"])
            changed += 1
    return changed


@transaction.atomic
def sync_course_owner(course: Course, actor: Any) -> Course:
    """Synchronize an admin-edited owner FK with the explicit staff relation."""
    if not has_perm(actor, "courses.edit_any"):
        raise PermissionDenied()
    locked = Course.objects.select_for_update().select_related("owner").get(pk=course.pk)
    owner_rows = CourseStaff.objects.select_for_update().filter(course_id=locked.pk, kind=CourseStaffKind.OWNER)
    if locked.owner_id is None:
        owner_rows.delete()
    else:
        owner_rows.exclude(user_id=locked.owner_id).delete()
        row = CourseStaff.objects.select_for_update().filter(course_id=locked.pk, user_id=locked.owner_id).first()
        if row is None:
            CourseStaff.objects.create(course=locked, user_id=locked.owner_id, kind=CourseStaffKind.OWNER)
        elif row.kind != CourseStaffKind.OWNER:
            row.kind = CourseStaffKind.OWNER
            row.save(update_fields=["kind", "updated_at"])
        if not locked.instructor.strip():
            locked.instructor = _profile_name(locked.owner)
            locked.save(update_fields=["instructor", "updated_at"])
    return locked


@transaction.atomic
def update_course(course: Course, data: Mapping[str, Any], actor: Any) -> Course:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_edit(actor, course)
    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات الدورة غير صالحة.")
    values = dict(data)
    unknown = sorted(set(values) - _COURSE_FIELDS)
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
    _expected(course, values.pop("expectedUpdatedAt", None), _course_conflict_values(course))
    _validate_course_values(values)
    if "relatedIds" in values:
        related = values["relatedIds"]
        if course.slug in related:
            raise InvalidParameter("لا يمكن ربط الدورة بنفسها.", code="related_self")
        published = set(
            Course.objects.filter(slug__in=related, status=CourseStatus.PUBLISHED).values_list("slug", flat=True)
        )
        if len(published) != len(related):
            raise InvalidParameter("الدورات المرتبطة يجب أن تكون منشورة.", code="related_not_published")
    if "slug" in values:
        new_slug = _slug(values.pop("slug"))
        if new_slug != course.slug:
            was_published = course.published_at is not None or course.status in {
                CourseStatus.PUBLISHED,
                CourseStatus.ARCHIVED,
            }
            if was_published and not has_perm(actor, "courses.edit_any"):
                raise InvalidParameter("لا يمكن تغيير معرّف دورة منشورة.", code="slug_locked")
            if Course.objects.filter(slug=new_slug).exclude(pk=course.pk).exists():
                raise Conflict("المعرّف مستخدم بالفعل.")
            course.slug = new_slug
    for key, value in values.items():
        if key != "expectedUpdatedAt":
            setattr(course, _COURSE_MAP.get(key, key), value)
    if not course.instructor and course.owner_id:
        course.instructor = _profile_name(course.owner)
    course.save()
    return course


def _published_lessons(course: Course):
    return CourseLesson.objects.filter(module__course=course, is_published=True).select_related("video_asset")


def validate_publishable(course: Course) -> list[Issue]:
    issues: list[Issue] = []
    if not course.title.strip():
        issues.append(Issue("title_missing", "blocking", "course.title"))
    if len(course.about.strip()) < 80:
        issues.append(Issue("description_short", "blocking", "course.about"))
    if not course.thumbnail_url:
        issues.append(Issue("thumbnail_missing", "blocking", "course.thumbnailUrl"))
    if not course.category_slug:
        issues.append(Issue("category_missing", "blocking", "course.categorySlug"))
    lessons = list(_published_lessons(course))
    if not lessons:
        issues.append(Issue("no_published_lessons", "blocking", "course.modules"))
    for lesson in lessons:
        target = f"lesson:{lesson.lesson_id}"
        if lesson.kind == LessonKind.VIDEO:
            if lesson.video_asset is None:
                issues.append(Issue("lesson_video_missing", "blocking", target))
            elif lesson.video_asset.status != VideoStatus.READY:
                issues.append(Issue("lesson_video_not_ready", "blocking", target))
        if lesson.kind == LessonKind.ARTICLE and not lesson.content.strip():
            issues.append(Issue("lesson_article_empty", "blocking", target))
    if course.price_type == "paid" and not course.price_label.strip():
        issues.append(Issue("price_inconsistent", "blocking", "course.priceLabel"))
    outcomes = course.outcomes if isinstance(course.outcomes, list) else []
    if len(outcomes) < 3:
        issues.append(Issue("outcomes_few", "warning", "course.outcomes"))
    if any(not lesson.duration_seconds for lesson in lessons):
        issues.append(Issue("lesson_duration_unknown", "warning", "course.modules"))
    if not any(lesson.kind == LessonKind.QUIZ for lesson in lessons):
        issues.append(Issue("no_quiz", "warning", "course.modules"))
    if not any(lesson.is_free_preview for lesson in lessons):
        issues.append(Issue("no_free_preview", "warning", "course.modules"))
    return issues


def _blocking(course: Course) -> list[Issue]:
    return [issue for issue in validate_publishable(course) if issue.severity == "blocking"]


@transaction.atomic
def submit_for_review(course: Course, actor: Any) -> Course:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.submit_for_review", "courses.publish", fallback={"owner", "co_instructor"})
    if course.status != CourseStatus.DRAFT:
        raise Conflict("لا يمكن إرسال الدورة للمراجعة من حالتها الحالية.")
    issues = _blocking(course)
    if issues:
        raise NotPublishable([issue.as_dict() for issue in issues])
    course.status = CourseStatus.IN_REVIEW
    course.submitted_at = timezone.now()
    course.save(update_fields=["status", "submitted_at", "updated_at"])
    return course


@transaction.atomic
def publish(course: Course, actor: Any) -> Course:
    course = Course.objects.select_for_update().get(pk=course.pk)
    if course.status == CourseStatus.IN_REVIEW:
        if not has_perm(actor, "courses.review"):
            raise PermissionDenied()
    elif course.status == CourseStatus.DRAFT:
        _require_action(actor, course, "courses.publish", "courses.publish", fallback={"owner", "co_instructor"})
    else:
        raise Conflict("لا يمكن نشر الدورة من حالتها الحالية.")
    issues = _blocking(course)
    if issues:
        raise NotPublishable([issue.as_dict() for issue in issues])
    course.status = CourseStatus.PUBLISHED
    course.published_at = timezone.now()
    course.review_note = ""
    course.save(update_fields=["status", "published_at", "review_note", "updated_at"])
    record_audit(AuditAction.COURSE_PUBLISHED, actor=actor, target_type="course", target_id=course.pk)
    return course


@transaction.atomic
def request_changes(course: Course, note: str, actor: Any) -> Course:
    course = Course.objects.select_for_update().get(pk=course.pk)
    if not has_perm(actor, "courses.review"):
        raise PermissionDenied()
    if course.status != CourseStatus.IN_REVIEW:
        raise Conflict("لا يمكن طلب التعديلات من الحالة الحالية.")
    if not isinstance(note, str) or not note.strip():
        raise InvalidParameter("ملاحظة المراجعة مطلوبة.")
    course.status = CourseStatus.DRAFT
    course.review_note = note.strip()[:10000]
    course.save(update_fields=["status", "review_note", "updated_at"])
    return course


@transaction.atomic
def unpublish_or_archive(course: Course, actor: Any) -> Course:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.publish", "courses.publish", fallback={"owner", "co_instructor"})
    if course.status != CourseStatus.PUBLISHED:
        raise Conflict("لا يمكن إلغاء نشر دورة غير منشورة.")
    enrolled = course.enrollments.exists()
    course.status = CourseStatus.ARCHIVED if enrolled else CourseStatus.DRAFT
    course.save(update_fields=["status", "updated_at"])
    record_audit(AuditAction.COURSE_UNPUBLISHED, actor=actor, target_type="course", target_id=course.pk)
    return course


@transaction.atomic
def delete_course(course: Course, actor: Any) -> None:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.delete_own", "courses.delete_any", fallback={"owner"})
    if course.enrollments.exists():
        raise HasEnrollments()
    course_id = course.pk
    course.delete()
    record_audit(AuditAction.COURSE_DELETED, actor=actor, target_type="course", target_id=course_id)


@transaction.atomic
def add_staff(course: Course, actor: Any, user: Any, kind: str = CourseStaffKind.CO_INSTRUCTOR) -> CourseStaff:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.manage_staff", "courses.manage_staff", fallback={"owner"})
    if kind not in CourseStaffKind.values or kind == CourseStaffKind.OWNER:
        raise InvalidParameter("نوع فريق الدورة غير صالح.")
    if CourseStaff.objects.filter(course=course, user=user).exists():
        raise Conflict("المستخدم موجود بالفعل ضمن فريق الدورة.")
    row = CourseStaff.objects.create(course=course, user=user, kind=kind)
    _touch_course(course)
    return row


@transaction.atomic
def remove_staff(course: Course, actor: Any, staff: CourseStaff | Any) -> None:
    course = Course.objects.select_for_update().get(pk=course.pk)
    _require_action(actor, course, "courses.manage_staff", "courses.manage_staff", fallback={"owner"})
    row = staff if isinstance(staff, CourseStaff) else CourseStaff.objects.filter(pk=staff).first()
    if row is None or row.course_id != course.pk:
        raise NotFound("عضو الفريق غير موجود.")
    if row.kind == CourseStaffKind.OWNER:
        raise InvalidParameter("لا يمكن إزالة مالك الدورة.")
    row.delete()
    _touch_course(course)


def _ensure_id(value: Any, prefix: str) -> str:
    if value in (None, ""):
        return _generated(prefix)
    if not isinstance(value, str) or not _STABLE_ID_RE.fullmatch(value):
        raise InvalidParameter("المعرّف غير صالح.")
    return value


def _nonnegative_int(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise InvalidParameter(f"قيمة {field} غير صالحة.")
    return value


def _text(value: Any, field: str, maximum: int) -> str:
    if not isinstance(value, str) or len(value) > maximum:
        raise InvalidParameter(f"قيمة {field} غير صالحة.")
    return value


def _validate_course_values(values: Mapping[str, Any]) -> None:
    text_limits = {
        "title": 200,
        "categoryLabel": 120,
        "categorySlug": 40,
        "thumbnailUrl": 400,
        "courseLevel": 20,
        "courseLevelAr": 40,
        "priceLabel": 40,
        "language": 12,
        "tagline": 240,
        "instructor": 120,
        "instructorCredential": 200,
        "about": 20000,
        "instructorBio": 50000,
    }
    for key, maximum in text_limits.items():
        if key in values:
            _text(values[key], key, maximum)
    if values.get("thumbnailUrl"):
        parsed = urlparse(values["thumbnailUrl"])
        if parsed.scheme != "https" or not parsed.hostname:
            raise InvalidParameter("رابط صورة الغلاف يجب أن يبدأ بـ HTTPS.")
    if "courseLevel" in values and values["courseLevel"] not in CourseLevel.values:
        raise InvalidParameter("مستوى الدورة غير صالح.")
    if "priceType" in values and (
        not isinstance(values["priceType"], str) or values["priceType"] not in CoursePriceType.values
    ):
        raise InvalidParameter("نوع السعر غير صالح.")
    if "language" in values and values["language"] not in {value for value, _ in LANGUAGES}:
        raise InvalidParameter("لغة الدورة غير صالحة.")
    for key in ("outcomes", "relatedIds"):
        if key not in values:
            continue
        rows = values[key]
        if not isinstance(rows, list) or len(rows) > 50 or any(not isinstance(item, str) for item in rows):
            raise InvalidParameter(f"قائمة {key} غير صالحة.")
        max_item_length = 140 if key == "outcomes" else 80
        if any(len(item) > max_item_length for item in rows):
            raise InvalidParameter(f"قائمة {key} غير صالحة.")
    integer_limits = {
        "examQuestionCount": 10000,
        "examMinutes": 10000,
        "examPassThreshold": 100,
        "examAttemptsLeft": 10000,
    }
    for key, maximum in integer_limits.items():
        if key not in values:
            continue
        value = values[key]
        if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= maximum:
            raise InvalidParameter(f"قيمة {key} غير صالحة.")


def _touch_course(course: Course) -> None:
    course.updated_at = timezone.now()
    course.save(update_fields=["updated_at"])


def _locked_course(course_id: Any) -> Course:
    try:
        return Course.objects.select_for_update().get(pk=course_id)
    except Course.DoesNotExist:
        raise NotFound(COURSE_NOT_FOUND) from None


def _locked_module(module_id: Any, course_id: Any) -> CourseModule:
    try:
        return CourseModule.objects.select_for_update().get(pk=module_id, course_id=course_id)
    except CourseModule.DoesNotExist:
        raise NotFound("الوحدة غير موجودة.") from None


def _locked_lesson(lesson_id: Any, module_id: Any, course_id: Any) -> CourseLesson:
    try:
        return CourseLesson.objects.select_for_update().get(
            pk=lesson_id,
            module_id=module_id,
            module__course_id=course_id,
        )
    except CourseLesson.DoesNotExist:
        raise NotFound("الدرس غير موجود.") from None


def _locked_resource(resource_id: Any, lesson_id: Any, module_id: Any, course_id: Any) -> LessonResource:
    try:
        return LessonResource.objects.select_for_update().get(
            pk=resource_id,
            lesson_id=lesson_id,
            lesson__module_id=module_id,
            lesson__module__course_id=course_id,
        )
    except LessonResource.DoesNotExist:
        raise NotFound("المورد غير موجود.") from None


def _course_id_for_module(module_id: Any) -> Any:
    course_id = CourseModule.objects.filter(pk=module_id).values_list("course_id", flat=True).first()
    if course_id is None:
        raise NotFound("الوحدة غير موجودة.")
    return course_id


def _course_id_for_lesson(lesson_id: Any) -> tuple[Any, Any]:
    row = CourseLesson.objects.filter(pk=lesson_id).values("module_id", "module__course_id").first()
    if row is None:
        raise NotFound("الدرس غير موجود.")
    return row["module_id"], row["module__course_id"]


def _course_id_for_resource(resource_id: Any) -> tuple[Any, Any, Any]:
    row = (
        LessonResource.objects.filter(pk=resource_id)
        .values("lesson_id", "lesson__module_id", "lesson__module__course_id")
        .first()
    )
    if row is None:
        raise NotFound("المورد غير موجود.")
    return row["lesson_id"], row["lesson__module_id"], row["lesson__module__course_id"]


def _touch_lesson(lesson: CourseLesson, course: Course | None = None) -> None:
    lesson.updated_at = timezone.now()
    lesson.save(update_fields=["updated_at"])
    _touch_course(course or lesson.module.course)


@transaction.atomic
def add_module(course: Course, actor: Any, data: Mapping[str, Any] | None = None) -> CourseModule:
    course = _locked_course(course.pk)
    _require_edit(actor, course, curriculum=True)
    if data is not None and not isinstance(data, Mapping):
        raise InvalidParameter("بيانات الوحدة غير صالحة.")
    values = dict(data or {})
    unknown = set(values) - {"moduleId", "title", "order", "expectedUpdatedAt"}
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(sorted(unknown))}")
    _expected(course, values.pop("expectedUpdatedAt", None))
    module_id = _ensure_id(values.get("moduleId"), "m")
    if CourseModule.objects.filter(course=course, module_id=module_id).exists():
        raise Conflict("معرّف الوحدة مستخدم بالفعل.")
    title = _text(values.get("title", ""), "العنوان", 160).strip()
    order = _nonnegative_int(values.get("order", 0), "الترتيب")
    row = CourseModule.objects.create(course=course, module_id=module_id, title=title, order=order)
    _touch_course(course)
    return row


@transaction.atomic
def update_module(module: CourseModule, actor: Any, data: Mapping[str, Any]) -> CourseModule:
    course = _locked_course(_course_id_for_module(module.pk))
    module = _locked_module(module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات الوحدة غير صالحة.")
    values = dict(data)
    _expected(module, values.pop("expectedUpdatedAt", None))
    allowed = {"title", "order"}
    if set(values) - allowed:
        raise InvalidParameter("حقول الوحدة غير معروفة.")
    if "title" in values:
        values["title"] = _text(values["title"], "العنوان", 160).strip()
    if "order" in values:
        values["order"] = _nonnegative_int(values["order"], "الترتيب")
    for key, value in values.items():
        setattr(module, key, value)
    module.save()
    _touch_course(course)
    return module


@transaction.atomic
def delete_module(module: CourseModule, actor: Any) -> None:
    course = _locked_course(_course_id_for_module(module.pk))
    module = _locked_module(module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    module.delete()
    recompute_course_stats(course)


@transaction.atomic
def reorder_modules(course: Course, actor: Any, ordered_ids: list[str]) -> None:
    course = _locked_course(course.pk)
    _require_edit(actor, course, curriculum=True)
    if not isinstance(ordered_ids, list) or any(not isinstance(item, str) for item in ordered_ids):
        raise InvalidParameter("قائمة الوحدات غير صالحة.")
    rows = list(CourseModule.objects.select_for_update().filter(course_id=course.pk))
    by_id = {row.module_id: row for row in rows}
    if set(ordered_ids) != set(by_id) or len(ordered_ids) != len(by_id):
        raise InvalidParameter("يجب إرسال قائمة الوحدات كاملة وبلا تكرار.")
    timestamp = timezone.now()
    for index, module in enumerate([by_id[item] for item in ordered_ids]):
        module.order = index
        module.updated_at = timestamp
    CourseModule.objects.bulk_update([by_id[item] for item in ordered_ids], ["order", "updated_at"])
    _touch_course(course)


@transaction.atomic
def add_lesson(module: CourseModule, actor: Any, data: Mapping[str, Any] | None = None) -> CourseLesson:
    course = _locked_course(_course_id_for_module(module.pk))
    module = _locked_module(module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if data is not None and not isinstance(data, Mapping):
        raise InvalidParameter("بيانات الدرس غير صالحة.")
    values = dict(data or {})
    allowed = {
        "lessonId",
        "title",
        "duration",
        "summary",
        "order",
        "kind",
        "content",
        "isFreePreview",
        "isPublished",
        "expectedUpdatedAt",
    }
    if set(values) - allowed:
        raise InvalidParameter("حقول الدرس غير معروفة.")
    _expected(course, values.pop("expectedUpdatedAt", None))
    lesson_id = _ensure_id(values.get("lessonId"), "l")
    if CourseLesson.objects.filter(module=module, lesson_id=lesson_id).exists():
        raise Conflict("معرّف الدرس مستخدم بالفعل.")
    kind = values.get("kind", LessonKind.VIDEO)
    if kind not in LessonKind.values:
        raise InvalidParameter("نوع الدرس غير صالح.")
    title = _text(values.get("title", ""), "العنوان", 160).strip()
    duration = _text(values.get("duration", ""), "المدة", 20)
    summary = _text(values.get("summary", ""), "الملخص", 50000)
    content = _text(values.get("content", ""), "المحتوى", 60000)
    order = _nonnegative_int(values.get("order", 0), "الترتيب")
    is_free_preview = values.get("isFreePreview", False)
    is_published = values.get("isPublished", True)
    if not isinstance(is_free_preview, bool) or not isinstance(is_published, bool):
        raise InvalidParameter("حالة الدرس غير صالحة.")
    lesson = CourseLesson.objects.create(
        module=module,
        lesson_id=lesson_id,
        title=title,
        duration=duration,
        summary=summary,
        order=order,
        kind=kind,
        content=content,
        is_free_preview=is_free_preview,
        is_published=is_published,
    )
    recompute_course_stats(course)
    return lesson


@transaction.atomic
def update_lesson(lesson: CourseLesson, actor: Any, data: Mapping[str, Any]) -> CourseLesson:
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    values = dict(data)
    _expected(lesson, values.pop("expectedUpdatedAt", None), _lesson_conflict_values(lesson))
    mapping = {"lessonId": "lesson_id", "isFreePreview": "is_free_preview", "isPublished": "is_published"}
    allowed = {
        "lessonId",
        "title",
        "duration",
        "summary",
        "order",
        "kind",
        "content",
        "isFreePreview",
        "isPublished",
        "expectedUpdatedAt",
    }
    if set(values) - allowed:
        raise InvalidParameter("حقول الدرس غير معروفة.")
    if "lessonId" in values and (
        not isinstance(values["lessonId"], str) or not _STABLE_ID_RE.fullmatch(values["lessonId"])
    ):
        raise InvalidParameter("معرّف الدرس غير صالح.")
    if (
        "lessonId" in values
        and values["lessonId"] != lesson.lesson_id
        and (
            CourseLesson.objects.filter(module_id=module.pk, lesson_id=values["lessonId"])
            .exclude(pk=lesson.pk)
            .exists()
        )
    ):
        raise Conflict("معرّف الدرس مستخدم بالفعل.")
    if "title" in values:
        values["title"] = _text(values["title"], "العنوان", 160).strip()
    if "duration" in values:
        values["duration"] = _text(values["duration"], "المدة", 20)
    if "summary" in values:
        values["summary"] = _text(values["summary"], "الملخص", 50000)
    if "content" in values:
        values["content"] = _text(values["content"], "المحتوى", 60000)
    if "order" in values:
        values["order"] = _nonnegative_int(values["order"], "الترتيب")
    for key in ("isFreePreview", "isPublished"):
        if key in values and not isinstance(values[key], bool):
            raise InvalidParameter("حالة الدرس غير صالحة.")
    values.pop("expectedUpdatedAt", None)
    for key, value in values.items():
        setattr(lesson, mapping.get(key, key), value)
    if lesson.kind not in LessonKind.values:
        raise InvalidParameter("نوع الدرس غير صالح.")
    lesson.save()
    recompute_course_stats(course)
    return lesson


@transaction.atomic
def duplicate_lesson(lesson: CourseLesson, actor: Any) -> CourseLesson:
    """Duplicate a lesson and its resources inside the same module."""
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    source = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", source.lesson_id).strip("-") or "lesson"
    lesson_id = f"{base}-copy"
    suffix = 2
    while CourseLesson.objects.filter(module=module, lesson_id=lesson_id).exists():
        lesson_id = f"{base}-copy-{suffix}"
        suffix += 1
    ordered_lessons = list(
        CourseLesson.objects.select_for_update().filter(module_id=module.pk).order_by("order", "lesson_id")
    )
    source_index = next(index for index, row in enumerate(ordered_lessons) if row.pk == source.pk)
    clone = CourseLesson.objects.create(
        module=module,
        lesson_id=lesson_id,
        title=f"{source.title} — نسخة",
        duration=source.duration,
        summary=source.summary,
        order=len(ordered_lessons),
        kind=source.kind,
        video_asset=source.video_asset,
        is_free_preview=False,
        is_published=False,
        content=source.content,
        duration_seconds=source.duration_seconds,
    )
    for resource in source.resources.all():
        LessonResource.objects.create(
            lesson=clone,
            title=resource.title,
            url=resource.url,
            kind=resource.kind,
            order=resource.order,
        )
    ordered_lessons.insert(source_index + 1, clone)
    timestamp = timezone.now()
    for index, row in enumerate(ordered_lessons):
        row.order = index
        row.updated_at = timestamp
    CourseLesson.objects.bulk_update(ordered_lessons, ["order", "updated_at"])
    recompute_course_stats(course)
    return clone


@transaction.atomic
def delete_lesson(lesson: CourseLesson, actor: Any) -> None:
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    lesson.delete()
    recompute_course_stats(course)


@transaction.atomic
def reorder_lessons(
    module: CourseModule, actor: Any, ordered_ids: list[str], moves: list[Mapping[str, Any]] | None = None
) -> None:
    course = _locked_course(_course_id_for_module(module.pk))
    module = _locked_module(module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if moves is not None:
        if not isinstance(moves, list) or not moves:
            raise InvalidParameter("قائمة نقل الدروس غير صالحة.")
        modules = list(CourseModule.objects.select_for_update().filter(course_id=course.pk).order_by("pk"))
        targets = {row.module_id: row for row in modules}
        lessons = list(
            CourseLesson.objects.select_for_update().filter(module_id__in=[row.pk for row in modules]).order_by("pk")
        )
        by_id = {row.lesson_id: row for row in lessons}
        if len(by_id) != len(lessons):
            raise InvalidParameter("معرّفات الدروس يجب أن تكون فريدة داخل الدورة.")
        changed: list[CourseLesson] = []
        seen: set[str] = set()
        for move in moves:
            if not isinstance(move, Mapping) or set(move) != {"lessonId", "moduleId", "order"}:
                raise InvalidParameter("نقلة الدرس غير صالحة.")
            lesson_id = move["lessonId"]
            target_id = move["moduleId"]
            if not isinstance(lesson_id, str) or not isinstance(target_id, str) or lesson_id in seen:
                raise InvalidParameter("نقلة الدرس غير صالحة.")
            seen.add(lesson_id)
            row = by_id.get(lesson_id)
            target = targets.get(target_id)
            order = move["order"]
            if row is None or target is None:
                raise InvalidParameter("نقلة الدرس غير صالحة.")
            order = _nonnegative_int(order, "الترتيب")
            if (
                row.module_id != target.pk
                and CourseLesson.objects.filter(module_id=target.pk, lesson_id=row.lesson_id)
                .exclude(pk=row.pk)
                .exists()
            ):
                raise Conflict("معرّف الدرس مستخدم بالفعل في الوحدة المستهدفة.")
            row.module = target
            row.order = order
            row.updated_at = timezone.now()
            changed.append(row)
        CourseLesson.objects.bulk_update(changed, ["module", "order", "updated_at"])
        _touch_course(course)
        return
    if not isinstance(ordered_ids, list) or any(not isinstance(item, str) for item in ordered_ids):
        raise InvalidParameter("قائمة الدروس غير صالحة.")
    rows = list(CourseLesson.objects.select_for_update().filter(module_id=module.pk))
    by_id = {row.lesson_id: row for row in rows}
    if set(ordered_ids) != set(by_id) or len(ordered_ids) != len(by_id):
        raise InvalidParameter("يجب إرسال قائمة الدروس كاملة وبلا تكرار.")
    timestamp = timezone.now()
    for index, row in enumerate([by_id[item] for item in ordered_ids]):
        row.order = index
        row.updated_at = timestamp
    CourseLesson.objects.bulk_update([by_id[item] for item in ordered_ids], ["order", "updated_at"])
    _touch_course(course)


@transaction.atomic
def move_lesson(lesson: CourseLesson, actor: Any, module: CourseModule, order: int = 0) -> CourseLesson:
    source_module_id, course_id = _course_id_for_lesson(lesson.pk)
    if module.course_id != course_id:
        raise InvalidParameter("لا يمكن نقل الدرس إلى دورة أخرى.")
    course = _locked_course(course_id)
    source_module = _locked_module(source_module_id, course.pk)
    target_module = _locked_module(module.pk, course.pk)
    lesson = _locked_lesson(lesson.pk, source_module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    order = _nonnegative_int(order, "الترتيب")
    if (
        CourseLesson.objects.filter(module_id=target_module.pk, lesson_id=lesson.lesson_id)
        .exclude(pk=lesson.pk)
        .exists()
    ):
        raise Conflict("معرّف الدرس مستخدم بالفعل في الوحدة المستهدفة.")
    lesson.module = target_module
    lesson.order = order
    lesson.save(update_fields=["module", "order", "updated_at"])
    recompute_course_stats(course)
    return lesson


def _asset_allowed(actor: Any, asset: Any) -> bool:
    return has_perm(actor, "videos.manage_any") or (
        has_perm(actor, "videos.manage_own") and asset.created_by_id == actor.pk
    )


@transaction.atomic
def link_video(lesson: CourseLesson, asset: Any, actor: Any) -> CourseLesson:
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if not _asset_allowed(actor, asset):
        raise PermissionDenied()
    lesson.kind = LessonKind.VIDEO
    lesson.video_asset = asset
    lesson.duration_seconds = asset.duration_seconds or 0
    lesson.duration = _format_duration(lesson.duration_seconds)
    lesson.save(update_fields=["kind", "video_asset", "duration_seconds", "duration", "updated_at"])
    recompute_course_stats(course)
    return lesson


@transaction.atomic
def unlink_video(lesson: CourseLesson, actor: Any) -> CourseLesson:
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    lesson.video_asset = None
    lesson.duration_seconds = 0
    lesson.duration = ""
    lesson.save(update_fields=["video_asset", "duration_seconds", "duration", "updated_at"])
    recompute_course_stats(course)
    return lesson


def _https(value: Any) -> str:
    parsed = urlparse(value) if isinstance(value, str) else None
    if (
        parsed is None
        or parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise InvalidParameter("يجب أن يبدأ رابط المورد بـ https.")
    return value


@transaction.atomic
def create_resource(lesson: CourseLesson, actor: Any, data: Mapping[str, Any]) -> LessonResource:
    module_id, course_id = _course_id_for_lesson(lesson.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات المورد غير صالحة.")
    values = dict(data)
    if set(values) - {"title", "url", "kind", "order", "expectedUpdatedAt"}:
        raise InvalidParameter("حقول المورد غير معروفة.")
    _expected(lesson, values.pop("expectedUpdatedAt", None))
    kind = values.get("kind", LessonResourceKind.LINK)
    if kind not in LessonResourceKind.values:
        raise InvalidParameter("نوع المورد غير صالح.")
    title = _text(values.get("title", ""), "العنوان", 160).strip()
    order = _nonnegative_int(values.get("order", 0), "الترتيب")
    row = LessonResource.objects.create(
        lesson=lesson,
        title=title,
        url=_https(values.get("url", "")),
        kind=kind,
        order=order,
    )
    _touch_lesson(lesson, course)
    return row


@transaction.atomic
def update_resource(resource: LessonResource, actor: Any, data: Mapping[str, Any]) -> LessonResource:
    lesson_id, module_id, course_id = _course_id_for_resource(resource.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson_id, module.pk, course.pk)
    resource = _locked_resource(resource.pk, lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات المورد غير صالحة.")
    values = dict(data)
    expected = values.pop("expectedUpdatedAt", None)
    _expected(lesson, expected)
    if set(values) - {"title", "url", "kind", "order"}:
        raise InvalidParameter("حقول المورد غير معروفة.")
    for key in ("title", "url", "kind", "order"):
        if key not in values:
            continue
        if key == "url":
            value = _https(values[key])
        elif key == "title":
            value = _text(values[key], "العنوان", 160).strip()
        elif key == "order":
            value = _nonnegative_int(values[key], "الترتيب")
        else:
            value = values[key]
        if key == "kind" and value not in LessonResourceKind.values:
            raise InvalidParameter("نوع المورد غير صالح.")
        setattr(resource, key, value)
    resource.save()
    _touch_lesson(lesson, course)
    return resource


@transaction.atomic
def delete_resource(resource: LessonResource, actor: Any) -> None:
    lesson_id, module_id, course_id = _course_id_for_resource(resource.pk)
    course = _locked_course(course_id)
    module = _locked_module(module_id, course.pk)
    lesson = _locked_lesson(lesson_id, module.pk, course.pk)
    resource = _locked_resource(resource.pk, lesson.pk, module.pk, course.pk)
    _require_edit(actor, course, curriculum=True)
    resource.delete()
    _touch_lesson(lesson, course)


def _format_duration(seconds: int) -> str:
    minutes = max(0, int(seconds)) // 60
    hours, remainder = divmod(minutes, 60)
    hour_unit = "ساعات" if 3 <= hours <= 10 else "ساعة"
    minute_unit = "دقيقتان" if remainder == 2 else "دقائق" if 3 <= remainder <= 10 else "دقيقة"
    if hours and remainder:
        return f"{hours} {hour_unit} و{remainder} {minute_unit}"
    if hours:
        return f"{hours} {hour_unit}"
    return f"{remainder} {minute_unit}" if remainder else ""


@transaction.atomic
def recompute_course_stats(course: Course) -> Course:
    course = _locked_course(course.pk)
    lessons = _published_lessons(course)
    count = lessons.count()
    total = lessons.aggregate(total=Sum("duration_seconds"))["total"] or 0
    course.lessons_count = count
    course.total_seconds = total
    course.duration = _format_duration(total)
    course.save(update_fields=["lessons_count", "total_seconds", "duration", "updated_at"])
    return course


def publish_checklist(course: Course) -> dict[str, Any]:
    issues = validate_publishable(course)
    blocking = sum(issue.severity == "blocking" for issue in issues)
    completeness = max(0, min(100, round((1 - blocking / 10) * 100)))
    return {"issues": [issue.as_dict() for issue in issues], "ready": blocking == 0, "completeness": completeness}


def studio_course_queryset(actor: Any):
    if has_perm(actor, "courses.edit_any"):
        return Course.objects.all()
    return Course.objects.filter(
        staff__user=actor,
        staff__kind__in=OWN_KINDS["courses.edit_own"],
    ).distinct()


def course_detail_relations(course: Course) -> dict[str, Any]:
    """Load modules/lessons, staff, and sessions in three bounded queries."""
    module_rows = list(
        CourseModule.objects.filter(course_id=course.pk)
        .order_by("order", "module_id", "lessons__order", "lessons__lesson_id")
        .values(
            "module_id",
            module_title=F("title"),
            lesson_id=F("lessons__lesson_id"),
            lesson_uuid=F("lessons__pk"),
            lesson_title=F("lessons__title"),
            lesson_duration=F("lessons__duration"),
            lesson_summary=F("lessons__summary"),
            lesson_kind=F("lessons__kind"),
            lesson_is_free_preview=F("lessons__is_free_preview"),
            lesson_is_published=F("lessons__is_published"),
            duration_seconds=F("lessons__duration_seconds"),
            video_asset_id=F("lessons__video_asset_id"),
            video_slug=F("lessons__video_asset__slug"),
        )
    )
    staff = list(
        CourseStaff.objects.filter(course_id=course.pk)
        .select_related("user", "user__instructor_profile")
        .order_by("-kind", "user__full_name", "user_id")
    )
    live_sessions = list(CourseLiveSession.objects.filter(course_id=course.pk).order_by("order", "session_id"))
    return {"module_rows": module_rows, "staff": staff, "live_sessions": live_sessions}


def enroll(user: Any, course: Course) -> None:
    """Enroll once and keep the counter update in the same transaction."""
    from features.dashboard.models import Enrollment

    if not has_perm(user, "courses.enroll"):
        raise PermissionDenied()
    with transaction.atomic():
        locked = Course.objects.select_for_update().get(pk=course.pk)
        if locked.status != CourseStatus.PUBLISHED:
            raise Conflict("هذه الدورة غير متاحة للتسجيل.", code="not_enrollable")
        _, created = Enrollment.objects.get_or_create(user=user, course=locked)
        if created:
            Course.objects.filter(pk=locked.pk).update(enrolled_count=F("enrolled_count") + 1)
            from features.common.cache import bump_version

            transaction.on_commit(lambda: bump_version("catalog"))


def save_progress(user: Any, course: Course, data: dict[str, Any]) -> None:
    from features.dashboard.models import Enrollment

    if not isinstance(data, Mapping):
        raise InvalidParameter("بيانات التقدّم غير صالحة.")
    if course.status not in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}:
        raise NotFound(COURSE_NOT_FOUND)
    if not has_perm(user, "lessons.watch"):
        raise PermissionDenied()
    if course.status == CourseStatus.PUBLISHED:
        enroll(user, course)
    with transaction.atomic():
        locked = Course.objects.select_for_update().get(pk=course.pk)
        if locked.status not in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}:
            raise NotFound(COURSE_NOT_FOUND)
        enrollment = Enrollment.objects.filter(user=user, course=locked).first()
        if enrollment is None:
            raise NotFound(COURSE_NOT_FOUND)
        if "progress" in data:
            progress = data["progress"]
            if isinstance(progress, bool) or not isinstance(progress, int) or not 0 <= progress <= 100:
                raise InvalidParameter("نسبة التقدّم غير صالحة.")
            enrollment.progress = progress
        if "lastLesson" in data:
            enrollment.last_lesson = _text(data["lastLesson"], "الدرس الأخير", 200)
        if "isCompleted" in data:
            if not isinstance(data["isCompleted"], bool):
                raise InvalidParameter("حالة إكمال الدورة غير صالحة.")
            enrollment.is_completed = data["isCompleted"]
        enrollment.save(update_fields=["progress", "last_lesson", "is_completed", "updated_at"])


@transaction.atomic
def toggle_favorite(user: Any, course: Course) -> bool:
    from features.dashboard.models import FavoriteCourse

    course = Course.objects.select_for_update().get(pk=course.pk)
    if course.status not in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}:
        raise NotFound(COURSE_NOT_FOUND)
    if not has_perm(user, "courses.favorite"):
        raise PermissionDenied()
    favorite = FavoriteCourse.objects.filter(user=user, course=course).first()
    if favorite is None:
        FavoriteCourse.objects.create(user=user, course=course)
        return True
    favorite.delete()
    return False


def related_for(course: Course) -> list[dict[str, Any]]:
    from features.courses.serializers import course_catalog_item

    related = Course.objects.published().filter(slug__in=course.related_ids)
    by_slug = {row.slug: row for row in related}
    return [course_catalog_item(by_slug[slug]) for slug in course.related_ids if slug in by_slug]


def certificate_payload(course: Course) -> dict[str, Any]:
    return {
        "courseId": course.slug,
        "courseTitle": course.title,
        "credentialId": f"KHM-2026-{course.slug.upper()}",
        "isOfficial": True,
    }
