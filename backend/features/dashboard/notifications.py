"""The single write path for dashboard notifications and live reminders."""
from __future__ import annotations

import hashlib
from collections.abc import Iterable, Mapping
from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from features.auth.models import StudentProfile, User
from features.courses.models import CourseLiveSession
from features.dashboard.models import DashboardNotification, Enrollment, NotificationItemData

UNREAD_CACHE_TTL_SECONDS = 15
_MAX_NOTIFICATION_ID_LENGTH = 80
_DEFAULT_PREFERENCES = {
    "liveSessionReminders": True,
    "weeklyProgressSummary": True,
    "recommendedOpportunities": True,
}
_PREFERENCE_BY_KIND = {
    "live_session_reminder": "liveSessionReminders",
    "reminder": "liveSessionReminders",
    "progress_summary": "weeklyProgressSummary",
    "weekly_progress_summary": "weeklyProgressSummary",
    "lesson_milestone": "weeklyProgressSummary",
    "quiz_milestone": "weeklyProgressSummary",
    "recommended_opportunity": "recommendedOpportunities",
    "recommendation": "recommendedOpportunities",
}
_NOTIFICATION_TYPE_BY_KIND = {
    "live_session_reminder": "live",
    "reminder": "live",
    "live_session": "live",
    "announcement": "lesson",
    "course_published": "lesson",
    "changes_requested": "lesson",
    "lesson_milestone": "lesson",
    "quiz_milestone": "exam",
    "exam_passed": "exam",
    "exam_failed": "exam",
    "certificate_issued": "application",
    "certificate_revoked": "application",
    "new_review": "application",
    "new_question": "lesson",
    "role_changed": "application",
}


def _cache_key(user_id: Any) -> str:
    return f"dashboard:notifications:unread:{user_id}"


def invalidate_unread_count(user_ids: Iterable[Any]) -> None:
    """Invalidate only recipients whose unread state may have changed."""
    cache.delete_many([_cache_key(user_id) for user_id in set(user_ids)])


def _notification_id(dedupe_key: str) -> str:
    value = str(dedupe_key).strip()
    if not value:
        raise ValueError("dedupe_key must not be empty")
    if len(value) <= _MAX_NOTIFICATION_ID_LENGTH:
        return value
    return f"dedupe-{hashlib.sha256(value.encode()).hexdigest()}"


def _preference_enabled(profile: StudentProfile | None, kind: str) -> bool:
    key = _PREFERENCE_BY_KIND.get(kind)
    if key is None:
        return True
    values = dict(_DEFAULT_PREFERENCES)
    if profile is not None and isinstance(profile.notifications, Mapping):
        values.update({name: value for name, value in profile.notifications.items() if isinstance(value, bool)})
    return bool(values[key])


def _payload_text(payload: Mapping[str, Any], field: str, fallback: str) -> str:
    value = payload.get(field, fallback)
    return str(value or "")[:200]


def _kind_type(kind: str, payload: Mapping[str, Any]) -> str:
    value = payload.get("notificationType", payload.get("type"))
    value = str(value or _NOTIFICATION_TYPE_BY_KIND.get(kind, "lesson"))
    return value[:20]


def _relative_arabic(created_at: Any, *, now: Any | None = None) -> str:
    """Format the legacy timeAgo field without persisting a stale string."""
    now = now or timezone.now()
    seconds = int((now - created_at).total_seconds())
    if seconds < 60:
        return "الآن"
    if seconds < 3600:
        return f"منذ {max(1, seconds // 60)} دقيقة"
    if seconds < 86400:
        return f"منذ {seconds // 3600} ساعة"
    return f"منذ {seconds // 86400} يوم"


def relative_arabic_time(created_at: Any, *, now: Any | None = None) -> str:
    """Public formatter used by dashboard serializers for payload compatibility."""
    return _relative_arabic(created_at, now=now)


def notify(
    user_ids: Iterable[Any],
    kind: str,
    payload: Mapping[str, Any],
    dedupe_key: str,
) -> int:
    """Fan out one preference-aware notification through both legacy projections.

    Both tables remain during the compatibility window because released clients
    consume different projections. Their rows share one deterministic id and
    are created in one transaction, while `ignore_conflicts` makes retries and
    concurrent event delivery converge without duplicate drawer entries.
    """
    recipient_ids = list(dict.fromkeys(str(user_id) for user_id in user_ids if user_id))
    if not recipient_ids:
        return 0
    if not isinstance(payload, Mapping):
        raise TypeError("payload must be a mapping")
    notification_id = _notification_id(dedupe_key)
    profiles = {
        str(profile.user_id): profile
        for profile in StudentProfile.objects.filter(user_id__in=recipient_ids)
    }
    enabled_ids = [
        user_id for user_id in recipient_ids if _preference_enabled(profiles.get(user_id), str(kind))
    ]
    if not enabled_ids:
        return 0
    existing_drawer = {
        str(user_id)
        for user_id in DashboardNotification.objects.filter(
            user_id__in=enabled_ids, notification_id=notification_id
        ).values_list("user_id", flat=True)
    }
    existing_view = {
        str(user_id)
        for user_id in NotificationItemData.objects.filter(
            user_id__in=enabled_ids, notification_id=notification_id
        ).values_list("user_id", flat=True)
    }
    title = _payload_text(payload, "title", str(payload.get("message", kind)))
    message = _payload_text(payload, "message", title)
    link = str(payload.get("link", "") or "")[:200]
    notification_type = _kind_type(str(kind), payload)
    drawer_rows = [
        DashboardNotification(
            user_id=user_id,
            notification_id=notification_id,
            title=title,
            time_ago="",
            notification_type=notification_type,
            is_read=False,
            link=link,
        )
        for user_id in enabled_ids
        if user_id not in existing_drawer
    ]
    view_rows = [
        NotificationItemData(
            user_id=user_id,
            notification_id=notification_id,
            message=message,
            time_ago="",
            notification_type=notification_type,
            is_unread=True,
        )
        for user_id in enabled_ids
        if user_id not in existing_view
    ]
    if not drawer_rows and not view_rows:
        return 0
    with transaction.atomic():
        DashboardNotification.objects.bulk_create(drawer_rows, ignore_conflicts=True)
        NotificationItemData.objects.bulk_create(view_rows, ignore_conflicts=True)
        transaction.on_commit(lambda: invalidate_unread_count(enabled_ids))
    return len({row.user_id for row in drawer_rows} | {row.user_id for row in view_rows})


def unread_count(user: User) -> int:
    """Return a per-user count with a hard maximum cache lifetime of 15 seconds."""
    key = _cache_key(user.pk)
    cached = cache.get(key)
    if cached is not None:
        return int(cached)
    count = NotificationItemData.objects.filter(user_id=user.pk, is_unread=True).count()
    cache.set(key, count, timeout=UNREAD_CACHE_TTL_SECONDS)
    return count


def mark_read(user: User, notification_id: str) -> None:
    """Update both compatibility projections and invalidate the count."""
    with transaction.atomic():
        DashboardNotification.objects.filter(user=user, notification_id=notification_id).update(is_read=True)
        NotificationItemData.objects.filter(user=user, notification_id=notification_id).update(is_unread=False)
        transaction.on_commit(lambda: invalidate_unread_count([user.pk]))


def send_live_session_reminders(*, now: Any | None = None) -> int:
    """Send the next 15–20 minute reminders; the notification id is the marker."""
    now = now or timezone.now()
    sessions = CourseLiveSession.objects.filter(
        starts_at__gt=now + timedelta(minutes=15),
        starts_at__lte=now + timedelta(minutes=20),
        status=CourseLiveSession.STATUS_SCHEDULED,
    ).select_related("course")
    sent = 0
    for session in sessions.iterator():
        user_ids = Enrollment.objects.filter(course_id=session.course_id).values_list("user_id", flat=True)
        sent += notify(
            user_ids,
            "live_session_reminder",
            {
                "title": session.title or "جلسة مباشرة قريبة",
                "message": f"تبدأ جلسة {session.title or session.course.title} خلال 15 دقيقة.",
                "link": f"/courses/{session.course.slug}",
                "notificationType": "live",
            },
            f"live-session-reminder:{session.pk}",
        )
    return sent
