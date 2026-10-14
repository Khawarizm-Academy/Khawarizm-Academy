"""Dashboard-related models."""

from __future__ import annotations

from django.db import models

from academy.choices import (
    CompetitionActionVariant,
    CompetitionStatusColor,
    CourseTrackIcon,
    NotificationType,
    QuickLinkTone,
    ScholarshipCheckIcon,
    ScholarshipCheckKind,
)


class Learner(models.Model):
    email = models.EmailField(primary_key=True, unique=True)
    full_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    membership_status = models.CharField(max_length=140, blank=True)
    avatar_initials = models.CharField(max_length=10, blank=True)
    avatar_url = models.URLField(max_length=400, blank=True)
    learning_level = models.CharField(max_length=20, choices=[("beginner", "beginner"), ("intermediate", "intermediate"), ("advanced", "advanced")], default="intermediate")
    interests = models.JSONField(default=list, blank=True)
    notifications_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="liveSessionReminders / weeklyProgressSummary / recommendedOpportunities",
    )
    language = models.CharField(max_length=10, default="ar")
    timezone = models.CharField(max_length=60, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:  # pragma: no cover - simple
        return self.email


class EnrolledCourse(models.Model):
    learner = models.ForeignKey(Learner, related_name="enrollments", on_delete=models.CASCADE)
    course_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    instructor = models.CharField(max_length=120, blank=True)
    total_lessons = models.PositiveIntegerField(default=0)
    track = models.CharField(max_length=120, blank=True)
    progress = models.PositiveIntegerField(default=0)
    last_lesson = models.CharField(max_length=200, blank=True)
    exact_unit_lesson = models.CharField(max_length=200, blank=True)
    thumbnail = models.URLField(max_length=400, blank=True)
    next_live_time = models.CharField(max_length=60, blank=True)
    icon_type = models.CharField(max_length=20, choices=CourseTrackIcon.choices, blank=True)
    is_completed = models.BooleanField(default=False)
    completion_date = models.CharField(max_length=60, blank=True)
    slug = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["id"]
        unique_together = ("learner", "course_id")

    def __str__(self) -> str:  # pragma: no cover - simple
        return f"{self.learner.email}:{self.course_id}"


class PriorityContinue(models.Model):
    learner = models.ForeignKey(Learner, related_name="priority_continue", on_delete=models.CASCADE)
    course_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    level_duration = models.CharField(max_length=120, blank=True)
    instructor_subtitle = models.CharField(max_length=160, blank=True)
    lesson_status = models.CharField(max_length=80, blank=True)
    progress = models.PositiveIntegerField(default=0)
    thumbnail = models.URLField(max_length=400, blank=True)

    class Meta:
        unique_together = ("learner", "course_id")


class ImminentLiveSession(models.Model):
    learner = models.ForeignKey(Learner, related_name="imminent_live", on_delete=models.CASCADE)
    session_id = models.CharField(max_length=80)
    course_title = models.CharField(max_length=160)
    instructor = models.CharField(max_length=200, blank=True)
    initial_remaining_seconds = models.PositiveIntegerField(default=0)
    thumbnail = models.URLField(max_length=400, blank=True)
    meet_url = models.URLField(max_length=400, blank=True)

    class Meta:
        unique_together = ("learner", "session_id")


class DashboardStat(models.Model):
    learner = models.ForeignKey(Learner, related_name="stats", on_delete=models.CASCADE)
    attendance_rate = models.PositiveIntegerField(default=98)
    attendance_note = models.CharField(max_length=80, blank=True)
    gpa = models.CharField(max_length=20, blank=True)
    gpa_rating = models.CharField(max_length=40, blank=True)
    points_earned = models.PositiveIntegerField(default=0)
    rank_note = models.CharField(max_length=80, blank=True)

    class Meta:
        # One stats row per learner.
        unique_together = ("learner",)


class UpcomingEvent(models.Model):
    learner = models.ForeignKey(Learner, related_name="upcoming_events", on_delete=models.CASCADE)
    event_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    date_text = models.CharField(max_length=120, blank=True)
    event_type = models.CharField(max_length=20, choices=[("submission", "submission"), ("exam", "exam"), ("session", "session")], default="submission")
    type_label = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["id"]
        unique_together = ("learner", "event_id")


class DashboardNotification(models.Model):
    learner = models.ForeignKey(Learner, related_name="drawer_notifications", on_delete=models.CASCADE)
    notification_id = models.CharField(max_length=80)
    title = models.CharField(max_length=200, blank=True)
    time_ago = models.CharField(max_length=60, blank=True)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.LESSON)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["is_read", "id"]
        unique_together = ("learner", "notification_id")


class NotificationItemData(models.Model):
    learner = models.ForeignKey(Learner, related_name="view_notifications", on_delete=models.CASCADE)
    notification_id = models.CharField(max_length=80)
    message = models.CharField(max_length=200, blank=True)
    time_ago = models.CharField(max_length=60, blank=True)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.LESSON)
    is_unread = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_unread", "id"]
        unique_together = ("learner", "notification_id")


class SavedScholarshipItem(models.Model):
    learner = models.ForeignKey(Learner, related_name="saved_scholarships", on_delete=models.CASCADE)
    item_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    provider = models.CharField(max_length=120, blank=True)
    deadline_text = models.CharField(max_length=60, blank=True)
    is_urgent = models.BooleanField(default=False)
    coverage = models.CharField(max_length=120, blank=True)
    gpa_requirement = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["-is_urgent", "item_id"]
        unique_together = ("learner", "item_id")


class FavoriteCourseItem(models.Model):
    learner = models.ForeignKey(Learner, related_name="favorite_courses", on_delete=models.CASCADE)
    item_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    provider = models.CharField(max_length=120, blank=True)
    duration_text = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["item_id"]
        unique_together = ("learner", "item_id")


class CompetitionItem(models.Model):
    learner = models.ForeignKey(Learner, related_name="competitions", on_delete=models.CASCADE)
    item_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    status_text = models.CharField(max_length=120, blank=True)
    status_color = models.CharField(max_length=10, choices=CompetitionStatusColor.choices, default=CompetitionStatusColor.BLUE)
    action_label = models.CharField(max_length=60, blank=True)
    action_variant = models.CharField(max_length=10, choices=CompetitionActionVariant.choices, default=CompetitionActionVariant.SKY)

    class Meta:
        ordering = ["item_id"]
        unique_together = ("learner", "item_id")


class CertificateItem(models.Model):
    learner = models.ForeignKey(Learner, related_name="certificates", on_delete=models.CASCADE)
    item_id = models.CharField(max_length=80)
    title = models.CharField(max_length=200)
    issue_date = models.CharField(max_length=60, blank=True)
    credential_id = models.CharField(max_length=80, blank=True)
    is_official = models.BooleanField(default=True)
    course_slug = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["item_id"]
        unique_together = ("learner", "item_id")
