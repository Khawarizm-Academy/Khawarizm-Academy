"""Dashboard models — learner-scoped rows that reference the real content.

Nothing here duplicates a course/scholarship/competition title: each row links
to the owning feature table and stores only per-learner state.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.choices import CompetitionActionVariant, CompetitionStatusColor, CourseTrackIcon, NotificationType
from features.common.models import TimeStampedModel, UUIDModel

USER = settings.AUTH_USER_MODEL


class Enrollment(UUIDModel, TimeStampedModel):
    """A learner's progress through a real Course."""

    user = models.ForeignKey(USER, related_name="enrollments", on_delete=models.CASCADE)
    course = models.ForeignKey("courses.Course", related_name="enrollments", on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)
    last_lesson = models.CharField(max_length=200, blank=True)
    exact_unit_lesson = models.CharField(max_length=200, blank=True)
    next_live_time = models.CharField(max_length=60, blank=True)
    icon_type = models.CharField(max_length=20, choices=CourseTrackIcon.choices, blank=True)
    is_completed = models.BooleanField(default=False)
    completion_date = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["course__slug"]
        unique_together = ("user", "course")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.course.slug}"


class PriorityContinue(UUIDModel, TimeStampedModel):
    """The one course the dashboard nudges the learner to resume."""

    user = models.ForeignKey(USER, related_name="priority_continue", on_delete=models.CASCADE)
    course = models.ForeignKey("courses.Course", related_name="priority_for", on_delete=models.CASCADE)
    lesson_status = models.CharField(max_length=80, blank=True)
    progress = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "course")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.course.slug}"


class ImminentLiveSession(UUIDModel, TimeStampedModel):
    """The next weekly live session shown with a countdown."""

    user = models.ForeignKey(USER, related_name="imminent_live", on_delete=models.CASCADE)
    session = models.ForeignKey("courses.CourseLiveSession", related_name="imminent_for", on_delete=models.CASCADE)
    initial_remaining_seconds = models.PositiveIntegerField(default=0)
    meet_url = models.URLField(max_length=400, blank=True)

    class Meta:
        unique_together = ("user", "session")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.session.session_id}"


class DashboardStat(UUIDModel, TimeStampedModel):
    """The headline numbers in the dashboard sidebar."""

    user = models.OneToOneField(USER, related_name="dashboard_stat", on_delete=models.CASCADE)
    attendance_rate = models.PositiveIntegerField(default=98)
    attendance_note = models.CharField(max_length=80, blank=True)
    gpa = models.CharField(max_length=20, blank=True)
    gpa_rating = models.CharField(max_length=40, blank=True)
    points_earned = models.PositiveIntegerField(default=0)
    rank_note = models.CharField(max_length=80, blank=True)

    def __str__(self) -> str:
        return f"{self.user.email}:stats"


class UpcomingEvent(UUIDModel, TimeStampedModel):
    """A learner-owned deadline: submission, exam, or session."""

    user = models.ForeignKey(USER, related_name="upcoming_events", on_delete=models.CASCADE)
    event_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    date_text = models.CharField(max_length=120, blank=True)
    event_type = models.CharField(max_length=20, choices=[("submission", "submission"), ("exam", "exam"), ("session", "session")], default="submission")
    type_label = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["created_at"]
        unique_together = ("user", "event_id")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.event_id}"


class DashboardNotification(UUIDModel, TimeStampedModel):
    """A row in the dashboard notification drawer."""

    user = models.ForeignKey(USER, related_name="drawer_notifications", on_delete=models.CASCADE)
    notification_id = models.CharField(max_length=80)
    title = models.CharField(max_length=200, blank=True)
    time_ago = models.CharField(max_length=60, blank=True)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.LESSON)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["is_read", "-created_at"]
        unique_together = ("user", "notification_id")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.notification_id}"


class NotificationItemData(UUIDModel, TimeStampedModel):
    """A row in the full notifications view."""

    user = models.ForeignKey(USER, related_name="view_notifications", on_delete=models.CASCADE)
    notification_id = models.CharField(max_length=80)
    message = models.CharField(max_length=200, blank=True)
    time_ago = models.CharField(max_length=60, blank=True)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.LESSON)
    is_unread = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_unread", "-created_at"]
        unique_together = ("user", "notification_id")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.notification_id}"


class SavedScholarship(UUIDModel, TimeStampedModel):
    """A scholarship the learner bookmarked."""

    user = models.ForeignKey(USER, related_name="saved_scholarships", on_delete=models.CASCADE)
    scholarship = models.ForeignKey("scholarships.Scholarship", related_name="saved_by", on_delete=models.CASCADE)
    is_urgent = models.BooleanField(default=False)
    gpa_requirement = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["-is_urgent", "scholarship__slug"]
        unique_together = ("user", "scholarship")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.scholarship.slug}"


class FavoriteCourse(UUIDModel, TimeStampedModel):
    """A course the learner favorited."""

    user = models.ForeignKey(USER, related_name="favorite_courses", on_delete=models.CASCADE)
    course = models.ForeignKey("courses.Course", related_name="favorited_by", on_delete=models.CASCADE)

    class Meta:
        ordering = ["course__slug"]
        unique_together = ("user", "course")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.course.slug}"


class SavedCompetition(UUIDModel, TimeStampedModel):
    """A competition the learner entered or bookmarked."""

    user = models.ForeignKey(USER, related_name="competitions", on_delete=models.CASCADE)
    competition = models.ForeignKey("competitions.Competition", related_name="saved_by", on_delete=models.CASCADE)
    status_text = models.CharField(max_length=120, blank=True)
    status_color = models.CharField(max_length=10, choices=CompetitionStatusColor.choices, default=CompetitionStatusColor.BLUE)
    action_label = models.CharField(max_length=60, blank=True)
    action_variant = models.CharField(max_length=10, choices=CompetitionActionVariant.choices, default=CompetitionActionVariant.SKY)

    class Meta:
        ordering = ["competition__competition_id"]
        unique_together = ("user", "competition")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.competition.competition_id}"


class Certificate(UUIDModel, TimeStampedModel):
    """A certificate earned on a completed course."""

    user = models.ForeignKey(USER, related_name="certificates", on_delete=models.CASCADE)
    course = models.ForeignKey("courses.Course", related_name="certificates", on_delete=models.CASCADE)
    issue_date = models.CharField(max_length=60, blank=True)
    credential_id = models.CharField(max_length=80, blank=True)
    is_official = models.BooleanField(default=True)

    class Meta:
        ordering = ["course__slug"]
        unique_together = ("user", "course")

    def __str__(self) -> str:
        return f"{self.user.email}:{self.course.slug}"
