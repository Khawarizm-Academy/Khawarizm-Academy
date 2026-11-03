"""Private instructor notes attached to one enrolled learner and course."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.models import TimeStampedModel, UUIDModel
from features.courses.models import Course


class InstructorStudentNote(UUIDModel, TimeStampedModel):
    """A private staff note; attribution survives deletion of its author account."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="instructor_student_notes")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_instructor_notes",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="authored_instructor_notes",
    )
    author_name = models.CharField(max_length=160)
    body = models.TextField(max_length=2000)

    class Meta:
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["course", "student", "-created_at"], name="idx_stunote_course_student"),
        ]

    def __str__(self) -> str:
        return f"Instructor note for {self.student_id} in {self.course_id}"
