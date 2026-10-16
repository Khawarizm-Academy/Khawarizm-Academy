"""Django admin registration for the dashboard feature."""

from __future__ import annotations

from django.contrib import admin

from features.dashboard.models import (
    CertificateItem,
    CompetitionItem,
    DashboardNotification,
    DashboardStat,
    EnrolledCourse,
    FavoriteCourseItem,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedScholarshipItem,
    UpcomingEvent,
)


@admin.register(EnrolledCourse)
class EnrolledCourseAdmin(admin.ModelAdmin):
    list_display = ("learner", "course_id", "title", "progress", "is_completed")
    list_filter = ("is_completed", "icon_type")
    search_fields = ("learner__email", "course_id", "title")


@admin.register(PriorityContinue)
class PriorityContinueAdmin(admin.ModelAdmin):
    list_display = ("learner", "course_id", "title", "progress")
    search_fields = ("learner__email", "course_id", "title")


@admin.register(ImminentLiveSession)
class ImminentLiveSessionAdmin(admin.ModelAdmin):
    list_display = ("learner", "session_id", "course_title")
    search_fields = ("learner__email", "session_id")


@admin.register(DashboardStat)
class DashboardStatAdmin(admin.ModelAdmin):
    list_display = ("learner", "attendance_rate", "points_earned")
    search_fields = ("learner__email",)


@admin.register(UpcomingEvent)
class UpcomingEventAdmin(admin.ModelAdmin):
    list_display = ("learner", "event_id", "title", "event_type")
    list_filter = ("event_type",)
    search_fields = ("learner__email", "event_id")


@admin.register(DashboardNotification)
class DashboardNotificationAdmin(admin.ModelAdmin):
    list_display = ("learner", "notification_id", "title", "is_read", "notification_type")
    list_filter = ("is_read", "notification_type")
    search_fields = ("learner__email", "notification_id")


@admin.register(NotificationItemData)
class NotificationItemDataAdmin(admin.ModelAdmin):
    list_display = ("learner", "notification_id", "is_unread", "notification_type")
    list_filter = ("is_unread", "notification_type")
    search_fields = ("learner__email", "notification_id")


@admin.register(SavedScholarshipItem)
class SavedScholarshipItemAdmin(admin.ModelAdmin):
    list_display = ("learner", "item_id", "title", "is_urgent")
    list_filter = ("is_urgent",)
    search_fields = ("learner__email", "item_id")


@admin.register(FavoriteCourseItem)
class FavoriteCourseItemAdmin(admin.ModelAdmin):
    list_display = ("learner", "item_id", "title")
    search_fields = ("learner__email", "item_id")


@admin.register(CompetitionItem)
class CompetitionItemAdmin(admin.ModelAdmin):
    list_display = ("learner", "item_id", "title", "status_color")
    list_filter = ("status_color",)
    search_fields = ("learner__email", "item_id")


@admin.register(CertificateItem)
class CertificateItemAdmin(admin.ModelAdmin):
    list_display = ("learner", "item_id", "title", "is_official")
    list_filter = ("is_official",)
    search_fields = ("learner__email", "item_id")
