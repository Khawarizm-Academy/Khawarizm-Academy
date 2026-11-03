"""Persistent lesson Q&A rows; moderation is soft-hide only."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.models import TimeStampedModel, UUIDModel


class DiscussionStatus(models.TextChoices):
    OPEN = "open", "Open"
    ANSWERED = "answered", "Answered"
    HIDDEN = "hidden", "Hidden"


class DiscussionThread(UUIDModel, TimeStampedModel):
    """A learner question scoped to a course and optionally a lesson."""

    course = models.ForeignKey("courses.Course", related_name="discussion_threads", on_delete=models.CASCADE)
    lesson = models.ForeignKey(
        "courses.CourseLesson",
        related_name="discussion_threads",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="discussion_threads",
        on_delete=models.PROTECT,
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(
        max_length=12,
        choices=DiscussionStatus.choices,
        default=DiscussionStatus.OPEN,
        db_index=True,
    )
    pinned = models.BooleanField(default=False, db_index=True)
    accepted_post = models.ForeignKey(
        "DiscussionPost",
        related_name="accepted_by_threads",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["-pinned", "-created_at", "-id"]
        indexes = [
            models.Index(fields=["course", "lesson", "status"], name="idx_disc_thread_scope"),
            models.Index(fields=["course", "status", "-created_at"], name="idx_disc_thread_age"),
        ]

    def __str__(self) -> str:
        return f"{self.course_id}:{self.title}"


class DiscussionPost(UUIDModel, TimeStampedModel):
    """A reply; staff answers are marked by the service, never by the client."""

    thread = models.ForeignKey(DiscussionThread, related_name="posts", on_delete=models.CASCADE)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="discussion_posts",
        on_delete=models.PROTECT,
    )
    body = models.TextField()
    is_instructor_answer = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["thread", "created_at"], name="idx_disc_post_thread_age"),
        ]

    def __str__(self) -> str:
        return f"{self.thread_id}:{self.author_id}"
