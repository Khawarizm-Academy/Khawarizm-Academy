"""Durable course announcements.

The migration is intentionally deferred until the Phase 12 integration window.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.models import UUIDModel


class CourseAnnouncement(UUIDModel):
    """One instructor-authored Markdown announcement for a course."""

    course = models.ForeignKey(
        "courses.Course",
        related_name="announcements",
        on_delete=models.CASCADE,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="course_announcements",
        on_delete=models.PROTECT,
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pinned", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["course"],
                condition=models.Q(pinned=True),
                name="uniq_announce_pinned_course",
            ),
        ]
        indexes = [
            models.Index(fields=["course", "pinned", "-created_at"], name="idx_announce_course_pin"),
            models.Index(fields=["course", "-created_at"], name="idx_announce_course_date"),
        ]

    def __str__(self) -> str:
        return f"{self.course_id}:{self.title}"


class CourseAnnouncementDailyQuota(UUIDModel):
    """Persistent per-course counter that cannot be reset by deleting a post."""

    course = models.ForeignKey("courses.Course", related_name="announcement_daily_quotas", on_delete=models.CASCADE)
    local_date = models.DateField()
    post_count = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["course", "local_date"], name="uniq_announce_course_day"),
            models.CheckConstraint(condition=models.Q(post_count__lte=3), name="chk_announce_daily_max_3"),
        ]
