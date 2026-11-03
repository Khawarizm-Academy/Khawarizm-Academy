from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.models import TimeStampedModel, UUIDModel


class CourseReview(UUIDModel, TimeStampedModel):
    """A learner's editable review and the course team's single public reply."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="course_reviews", on_delete=models.CASCADE)
    course = models.ForeignKey("courses.Course", related_name="reviews", on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200, blank=True)
    body = models.TextField(max_length=5000)
    is_hidden = models.BooleanField(default=False, db_index=True)
    hidden_reason = models.TextField(blank=True)
    reply_body = models.TextField(max_length=3000, blank=True)
    reply_author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="course_review_replies",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reply_created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_course_review_user_course"),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="course_review_rating_1_5"),
        ]
        indexes = [
            models.Index(fields=["course", "is_hidden", "created_at"], name="idx_review_course_visible"),
            models.Index(fields=["course", "rating", "created_at"], name="idx_review_course_rating"),
        ]

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.user_id}:{self.rating}"
