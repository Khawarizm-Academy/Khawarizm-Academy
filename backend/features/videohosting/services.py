"""Video-hosting business rules shared by token and lesson playback callers."""

from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from django.conf import settings
from django.db.models import Exists, OuterRef

from features.access.services import has_perm
from features.common.choices import CourseStatus
from features.videohosting import packaging
from features.videohosting.models import VideoAsset

AccessVia = Literal["admin", "owner", "staff", "preview", "enrolled"]

REASON_ADMIN = "admin"
REASON_OWNER = "owner"
REASON_STAFF = "staff"
REASON_PREVIEW = "preview"
REASON_ENROLLED = "enrolled"
REASON_NOT_ENTITLED = "not_entitled"


@dataclass(frozen=True, slots=True)
class Access:
    """The stable entitlement result returned to playback callers."""

    allowed: bool
    reason: str
    via: AccessVia | None = None


@dataclass(frozen=True, slots=True)
class _LessonFacts:
    has_linked_lesson: bool = False
    has_staff: bool = False
    has_preview: bool = False
    has_enrollment: bool = False


@dataclass(slots=True)
class _AccessContext:
    user: Any
    asset: VideoAsset
    facts: _LessonFacts | None = None

    @property
    def user_id(self) -> Any:
        return getattr(self.user, "pk", None) if _authenticated(self.user) else None

    def lesson_facts(self) -> _LessonFacts:
        if self.facts is None:
            self.facts = _lesson_facts(self.asset, self.user_id)
        return self.facts


@dataclass(frozen=True, slots=True)
class _AccessRule:
    via: AccessVia
    reason: str
    check: Callable[[_AccessContext], bool]


def _authenticated(user: Any) -> bool:
    return bool(getattr(user, "is_authenticated", False) and getattr(user, "pk", None))


def host_capabilities() -> dict[str, bool]:
    """Report only the runtime facts the provider-plan resolver needs."""
    serverless = bool(settings.IS_SERVERLESS_RUNTIME)
    return {
        "serverless": serverless,
        "ffmpeg": packaging.ffmpeg_available() and not bool(settings.IS_VERCEL),
        "persistentHost": not serverless,
    }


def spool_bytes_used() -> int:
    """Total bytes currently sitting in the upload spool (0 when unconfigured).

    Phase 13 §13.1.6: the spool is the one disk the platform itself grows under
    load, so the init endpoint compares this against `VIDEO_SPOOL_MAX_BYTES`
    before opening another session. Reading directory entries is cheap relative
    to the request it guards.
    """
    configured = str(getattr(settings, "VIDEO_SPOOL_DIR", "") or "").strip()
    if not configured:
        return 0
    total = 0
    try:
        for root, _dirs, files in Path(configured).walk():
            for name in files:
                try:
                    total += (root / name).stat().st_size
                except OSError:
                    continue  # a part vanishing mid-walk is normal: it just uploaded
    except OSError:
        return 0
    return total


def spool_directory_ready() -> bool:
    """Require an existing writable spool outside known ephemeral locations."""
    configured = str(getattr(settings, "VIDEO_SPOOL_DIR", "") or "").strip()
    if not configured:
        return False
    path = Path(configured)
    if not path.is_absolute():
        return False
    try:
        resolved = path.resolve(strict=True)
    except OSError, RuntimeError:
        return False
    ephemeral_roots = (Path("/tmp"), Path("/var/tmp"), Path("/var/task"), Path("/dev/shm"), Path("/run"))
    if any(resolved == root or root in resolved.parents for root in ephemeral_roots):
        return False
    return resolved.is_dir() and os.access(resolved, os.W_OK | os.X_OK)


def _lesson_facts(asset: VideoAsset, user_id: Any) -> _LessonFacts:
    """Project every linked-lesson fact in one correlated query."""
    from features.courses.models import CourseLesson

    linked_lessons = CourseLesson.objects.filter(video_asset_id=OuterRef("pk"))
    staff_lessons = linked_lessons.filter(module__course__staff__user_id=user_id)
    preview_lessons = linked_lessons.filter(
        is_free_preview=True,
        is_published=True,
        module__course__status=CourseStatus.PUBLISHED,
    )
    enrolled_lessons = linked_lessons.filter(
        is_published=True,
        module__course__status__in=(CourseStatus.PUBLISHED, CourseStatus.ARCHIVED),
        module__course__enrollments__user_id=user_id,
    )
    row = (
        VideoAsset.objects.filter(pk=asset.pk)
        .annotate(
            has_linked_lesson=Exists(linked_lessons),
            has_staff=Exists(staff_lessons),
            has_preview=Exists(preview_lessons),
            has_enrollment=Exists(enrolled_lessons),
        )
        .values("has_linked_lesson", "has_staff", "has_preview", "has_enrollment")
        .first()
    )
    if row is None:
        return _LessonFacts()
    return _LessonFacts(
        has_linked_lesson=bool(row["has_linked_lesson"]),
        has_staff=bool(row["has_staff"]),
        has_preview=bool(row["has_preview"]),
        has_enrollment=bool(row["has_enrollment"]),
    )


def _admin_rule(context: _AccessContext) -> bool:
    return has_perm(context.user, "videos.watch_any") or has_perm(context.user, "administrator")


def _owner_rule(context: _AccessContext) -> bool:
    return context.user_id is not None and context.asset.created_by_id == context.user_id


def _staff_rule(context: _AccessContext) -> bool:
    if context.user_id is None:
        return False
    facts = context.lesson_facts()
    if not facts.has_linked_lesson:
        return False
    return (
        facts.has_staff or has_perm(context.user, "courses.edit_any") or has_perm(context.user, "curriculum.edit_any")
    )


def _preview_rule(context: _AccessContext) -> bool:
    return context.lesson_facts().has_preview


def _enrollment_rule(context: _AccessContext) -> bool:
    return has_perm(context.user, "lessons.watch") and context.lesson_facts().has_enrollment


ACCESS_RULES: tuple[_AccessRule, ...] = (
    _AccessRule("admin", REASON_ADMIN, _admin_rule),
    _AccessRule("owner", REASON_OWNER, _owner_rule),
    _AccessRule("staff", REASON_STAFF, _staff_rule),
    _AccessRule("preview", REASON_PREVIEW, _preview_rule),
    _AccessRule("enrolled", REASON_ENROLLED, _enrollment_rule),
)


def playback_access(user: Any, asset: VideoAsset) -> Access:
    """Return the first matching playback entitlement for an asset."""
    context = _AccessContext(user=user, asset=asset)
    for rule in ACCESS_RULES:
        if rule.check(context):
            return Access(allowed=True, reason=rule.reason, via=rule.via)
    return Access(allowed=False, reason=REASON_NOT_ENTITLED)
