"""Django admin for the learner dashboard rows."""

from __future__ import annotations

from django.contrib import admin

from features.dashboard.models import (
    Certificate,
    DashboardNotification,
    DashboardStat,
    Enrollment,
    FavoriteCourse,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedCompetition,
    SavedScholarship,
    UpcomingEvent,
)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress", "is_completed")
    list_filter = ("is_completed",)
    search_fields = ("user__email", "course__slug")


@admin.register(PriorityContinue)
class PriorityContinueAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress", "lesson_status")
    search_fields = ("user__email", "course__slug")


@admin.register(ImminentLiveSession)
class ImminentLiveSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "session", "initial_remaining_seconds")
    search_fields = ("user__email", "session__session_id")


@admin.register(DashboardStat)
class DashboardStatAdmin(admin.ModelAdmin):
    list_display = ("user", "attendance_rate", "gpa", "points_earned")
    search_fields = ("user__email",)


@admin.register(UpcomingEvent)
class UpcomingEventAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "date_text", "event_type")
    list_filter = ("event_type",)
    search_fields = ("user__email", "title")


@admin.register(DashboardNotification)
class DashboardNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "notification_id", "title", "is_read")
    list_filter = ("is_read", "notification_type")
    search_fields = ("user__email", "notification_id")


@admin.register(NotificationItemData)
class NotificationItemDataAdmin(admin.ModelAdmin):
    list_display = ("user", "notification_id", "message", "is_unread")
    list_filter = ("is_unread", "notification_type")
    search_fields = ("user__email", "notification_id")


@admin.register(SavedScholarship)
class SavedScholarshipAdmin(admin.ModelAdmin):
    list_display = ("user", "scholarship", "is_urgent", "gpa_requirement")
    search_fields = ("user__email", "scholarship__slug")


@admin.register(FavoriteCourse)
class FavoriteCourseAdmin(admin.ModelAdmin):
    list_display = ("user", "course")
    search_fields = ("user__email", "course__slug")


@admin.register(SavedCompetition)
class SavedCompetitionAdmin(admin.ModelAdmin):
    list_display = ("user", "competition", "status_color", "action_variant")
    search_fields = ("user__email", "competition__competition_id")


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "issue_date", "is_official")
    list_filter = ("is_official",)
    search_fields = ("user__email", "course__slug", "credential_id")
