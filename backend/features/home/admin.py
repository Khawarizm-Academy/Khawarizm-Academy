"""Django admin registration for the home feature."""

from __future__ import annotations

from django.contrib import admin

from features.home.models import (
    HomeCompetition,
    HomeEvent,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)


@admin.register(HomeFeaturedCourse)
class HomeFeaturedCourseAdmin(admin.ModelAdmin):
    list_display = ("course_id", "title", "level", "status")
    search_fields = ("course_id", "title")


@admin.register(HomeFeaturedScholarship)
class HomeFeaturedScholarshipAdmin(admin.ModelAdmin):
    list_display = ("scholarship_id", "title", "provider", "deadline_urgency")
    search_fields = ("scholarship_id", "title")


@admin.register(HomeCompetition)
class HomeCompetitionAdmin(admin.ModelAdmin):
    list_display = ("key", "competition_id", "title")
    list_filter = ("key",)


@admin.register(HomeEvent)
class HomeEventAdmin(admin.ModelAdmin):
    list_display = ("key", "event_id", "title", "format", "is_featured")
    list_filter = ("key", "format", "is_featured")


@admin.register(HomeQuickLink)
class HomeQuickLinkAdmin(admin.ModelAdmin):
    list_display = ("link_id", "label", "icon", "target", "tone")
    list_filter = ("tone",)
