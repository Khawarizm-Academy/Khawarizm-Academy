"""Admin console payloads — user rows, audit rows, and the content registry.

The content registry is the single source of truth behind the generic content
editor: every managed model, every editable field, and its input kind live here
so the console renders its forms from the API instead of hard-coded screens.
"""

from __future__ import annotations

from typing import Any

from features.auth.models import User, UserSession
from features.auth.serializers import user_profile
from features.common.choices import (
    CategorySlug,
    CourseLevel,
    CoursePriceType,
    EventFormat,
    Role,
    ScholarshipCountrySlug,
    ScholarshipCoverageType,
    ScholarshipDeadlineUrgency,
    ScholarshipDegreeLevel,
    ScholarshipStatus,
    ThumbnailType,
)
from features.competitions.models import Competition
from features.courses.models import LANGUAGES, Course
from features.events.models import EventItem
from features.scholarships.models import Scholarship

# Human Arabic labels for the enum values an admin picks from a select.
CATEGORY_LABELS = {
    "ai": "الذكاء الاصطناعي",
    "programming": "البرمجة",
    "cybersecurity": "الأمن السيبراني",
    "space": "الفضاء",
    "cs": "علوم الحاسوب",
}
COUNTRY_LABELS = {
    "saudi": "السعودية",
    "usa": "الولايات المتحدة",
    "turkey": "تركيا",
    "uk": "المملكة المتحدة",
    "germany": "ألمانيا",
}
DEGREE_LABELS = {"bachelor": "بكالوريوس", "master": "ماجستير", "phd": "دكتوراه"}
COVERAGE_LABELS = {"fully_funded": "تمويل كامل", "partial": "تمويل جزئي"}
COURSE_LEVEL_LABELS = {"beginner": "مبتدئ", "intermediate": "متوسط", "advanced": "متقدم"}
PRICE_LABELS = {"free": "مجاني", "paid": "مدفوع"}
SCHOLARSHIP_STATUS_LABELS = {"open": "مفتوحة", "closing_soon": "تُغلق قريبًا", "closed": "مغلقة"}
URGENCY_LABELS = {"critical": "حرج", "warning": "تحذير", "normal": "عادي"}


def _select(choices, labels: dict[str, str] | None = None) -> list[dict[str, str]]:
    """Turn a TextChoices class into `{value,label}` options, Arabic where known."""
    return [{"value": str(value), "label": (labels or {}).get(str(value), str(label))} for value, label in choices]


def _field(name: str, attr: str, label: str, kind: str = "text", **extra: Any) -> dict[str, Any]:
    """One editable field definition for the console's form renderer."""
    return {"name": name, "attr": attr, "label": label, "kind": kind, **extra}


# Every content type the console can list, create, edit, and delete.
CONTENT_TYPES: dict[str, dict[str, Any]] = {
    "courses": {
        "model": Course,
        "label": "الدورات",
        "keyField": "slug",
        "titleField": "title",
        "search": ("slug", "title", "instructor"),
        "fields": (
            _field("slug", "slug", "المعرّف (slug)", required=True),
            _field("title", "title", "العنوان", required=True),
            _field("categoryLabel", "category_label", "التصنيف", required=True),
            _field("categorySlug", "category_slug", "رمز التصنيف", "select", options=_select(CategorySlug.choices, CATEGORY_LABELS), required=True),
            _field("thumbnailUrl", "thumbnail_url", "رابط الصورة", "url", required=True),
            _field("instructor", "instructor", "المدرّب"),
            _field("courseLevel", "course_level", "المستوى", "select", options=_select(CourseLevel.choices, COURSE_LEVEL_LABELS), required=True),
            _field("courseLevelAr", "course_level_ar", "المستوى (عربي)"),
            _field("priceType", "price_type", "نوع السعر", "select", options=_select(CoursePriceType.choices, PRICE_LABELS)),
            _field("priceLabel", "price_label", "ملصق السعر"),
            _field("rating", "rating", "التقييم", "decimal"),
            _field("duration", "duration", "المدة"),
            _field("lessonsCount", "lessons_count", "عدد الدروس", "number"),
            _field("language", "language", "اللغة", "select", options=_select(LANGUAGES, {"arabic": "العربية", "english": "الإنجليزية", "french": "الفرنسية"})),
            _field("progressBadge", "progress_badge", "شارة التقدّم"),
            _field("tagline", "tagline", "الوصف المختصر", "textarea"),
            _field("about", "about", "نبذة", "textarea"),
            _field("instructorCredential", "instructor_credential", "مؤهل المدرّب"),
            _field("instructorBio", "instructor_bio", "سيرة المدرّب", "textarea"),
            _field("reviewCount", "review_count", "عدد المراجعات", "number"),
            _field("enrolledCount", "enrolled_count", "عدد المسجّلين", "number"),
            _field("startedLessonSlug", "started_lesson_slug", "درس البداية"),
            _field("outcomes", "outcomes", "المخرجات (JSON)", "json"),
            _field("relatedIds", "related_ids", "الدورات المرتبطة (JSON)", "json"),
            _field("examQuestionCount", "exam_question_count", "أسئلة الاختبار", "number"),
            _field("examMinutes", "exam_minutes", "دقائق الاختبار", "number"),
            _field("examPassThreshold", "exam_pass_threshold", "نسبة النجاح", "number"),
            _field("examAttemptsLeft", "exam_attempts_left", "المحاولات المتاحة", "number"),
        ),
    },
    "scholarships": {
        "model": Scholarship,
        "label": "المنح",
        "keyField": "slug",
        "titleField": "title",
        "search": ("slug", "title", "provider", "country"),
        "fields": (
            _field("slug", "slug", "المعرّف (slug)", required=True),
            _field("title", "title", "العنوان", required=True),
            _field("category", "category", "التصنيف"),
            _field("categorySlug", "category_slug", "رمز التصنيف", "select", options=_select(CategorySlug.choices, CATEGORY_LABELS)),
            _field("thumbnailUrl", "thumbnail_url", "رابط الصورة", "url", required=True),
            _field("country", "country", "الدولة"),
            _field("countrySlug", "country_slug", "رمز الدولة", "select", options=_select(ScholarshipCountrySlug.choices, COUNTRY_LABELS)),
            _field("degreeLevel", "degree_level", "الدرجة", "select", options=_select(ScholarshipDegreeLevel.choices, DEGREE_LABELS)),
            _field("degreeLabel", "degree_label", "الدرجة (نص)"),
            _field("provider", "provider", "الجهة المانحة"),
            _field("coverageType", "coverage_type", "نوع التمويل", "select", options=_select(ScholarshipCoverageType.choices, COVERAGE_LABELS)),
            _field("coverageLabel", "coverage_label", "التمويل (نص)"),
            _field("daysRemaining", "days_remaining", "الأيام المتبقية", "number"),
            _field("deadlineBadge", "deadline_badge", "شارة الموعد"),
            _field("deadlineUrgency", "deadline_urgency", "إلحاح الموعد", "select", options=_select(ScholarshipDeadlineUrgency.choices, URGENCY_LABELS)),
            _field("status", "status", "الحالة", "select", options=_select(ScholarshipStatus.choices, SCHOLARSHIP_STATUS_LABELS)),
        ),
    },
    "events": {
        "model": EventItem,
        "label": "الفعاليات",
        "keyField": "event_id",
        "titleField": "title",
        "search": ("event_id", "title"),
        "fields": (
            _field("eventId", "event_id", "المعرّف", required=True),
            _field("title", "title", "العنوان", required=True),
            _field("description", "description", "الوصف", "textarea"),
            _field("badge", "badge", "الشارة"),
            _field("date", "date", "التاريخ"),
            _field("format", "format", "الصيغة", "select", options=_select(EventFormat.choices)),
            _field("isFeatured", "is_featured", "مميزة", "bool"),
            _field("thumbnailType", "thumbnail_type", "نوع الصورة", "select", options=_select(ThumbnailType.choices)),
        ),
    },
    "competitions": {
        "model": Competition,
        "label": "المسابقات",
        "keyField": "competition_id",
        "titleField": "title",
        "search": ("competition_id", "title"),
        "fields": (
            _field("competitionId", "competition_id", "المعرّف", required=True),
            _field("title", "title", "العنوان", required=True),
            _field("badge", "badge", "الشارة"),
            _field("description", "description", "الوصف", "textarea"),
            _field("daysRemaining", "days_remaining", "الأيام المتبقية"),
            _field("hoursRemaining", "hours_remaining", "الساعات المتبقية"),
            _field("actionText", "action_text", "نص الزر"),
        ),
    },
}

# Editable account fields — every one maps to a `User` column.
# Email is the account's stable identity, so it is set once at creation and read-only afterwards.
USER_FIELDS: tuple[dict[str, Any], ...] = (
    _field("email", "email", "البريد الإلكتروني", required=True, readonly=True),
    _field("fullName", "full_name", "الاسم الكامل"),
    _field("phone", "phone", "رقم الجوال"),
    _field("role", "role", "الدور", "select", options=_select(Role.choices, {"student": "طالب", "instructor": "مدرّب", "admin": "مشرف"})),
    _field("isActive", "is_active", "نشط", "bool"),
    _field("membershipStatus", "membership_status", "حالة العضوية"),
    _field("language", "language", "اللغة"),
    _field("timezone", "timezone", "المنطقة الزمنية"),
)


def user_row(user: User) -> dict[str, Any]:
    """A compact user row for the users table."""
    return {
        "id": str(user.id),
        "email": user.email,
        "fullName": user.full_name,
        "avatarUrl": user.avatar_url,
        "role": user.role,
        "isActive": user.is_active,
        "isStaff": user.is_staff,
        "activeSessions": user.sessions.filter(is_active=True).count(),
        "joinedAt": user.date_joined.isoformat(),
        "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }


def admin_user_detail(user: User, current_id) -> dict[str, Any]:
    """One account's profile, devices, and recent audit trail."""
    return {
        "profile": user_profile(user),
        "sessions": [session_row(s, current_id) for s in user.sessions.all()[:50]],
        "events": [event_row(e) for e in user.auth_events.all()[:50]],
    }


def session_row(session: UserSession, current_id=None) -> dict[str, Any]:
    """One device row — kept here so the console owns its own projection."""
    return {
        "id": str(session.id),
        "os": session.os,
        "browser": session.browser,
        "deviceType": session.device_type,
        "deviceLabel": session.device_label,
        "ipAddress": session.ip_address or "",
        "isActive": session.is_active,
        "isCurrent": str(session.id) == str(current_id),
        "revokedReason": session.revoked_reason,
        "createdAt": session.created_at.isoformat(),
        "lastSeenAt": session.last_seen_at.isoformat(),
    }


def event_row(event, include_email: bool = False) -> dict[str, Any]:
    """One audit row; the per-user trail omits the email the profile already carries."""
    row = {
        "id": str(event.id),
        "kind": event.kind,
        "provider": event.provider,
        "deviceType": event.device_type,
        "os": event.os,
        "browser": event.browser,
        "ipAddress": event.ip_address or "",
        "detail": event.detail,
        "createdAt": event.created_at.isoformat(),
    }
    if include_email:
        row["email"] = event.email
    return row


def content_types_payload() -> list[dict[str, Any]]:
    """The managed content types and their editable fields, for the console UI."""
    return [
        {
            "key": key,
            "label": spec["label"],
            "keyField": spec["keyField"],
            "titleField": spec["titleField"],
            "fields": list(spec["fields"]),
        }
        for key, spec in CONTENT_TYPES.items()
    ]


def _raw_value(field: dict[str, Any], obj: Any) -> Any:
    """Read one field off a row and normalize it for JSON."""
    raw = getattr(obj, field["attr"])
    if field["kind"] == "decimal":
        return float(raw) if raw is not None else None
    return raw


def content_row(spec: dict[str, Any], obj: Any) -> dict[str, Any]:
    """One content row: stable id, business key, title, and every editable value."""
    return {
        "id": str(obj.pk),
        "key": getattr(obj, spec["keyField"]),
        "title": getattr(obj, spec["titleField"]),
        "values": {field["name"]: _raw_value(field, obj) for field in spec["fields"]},
    }
