"""Django admin for the home rails (placements over the real content)."""

from __future__ import annotations

from django.contrib import admin

from features.home.models import (
    HomeCompetitionSpot,
    HomeEventSpot,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)


@admin.register(HomeFeaturedCourse)
class HomeFeaturedCourseAdmin(admin.ModelAdmin):
    list_display = ("course", "students_count", "status", "order")
    list_editable = ("order",)
    search_fields = ("course__slug", "course__title")


@admin.register(HomeFeaturedScholarship)
class HomeFeaturedScholarshipAdmin(admin.ModelAdmin):
    list_display = ("scholarship", "deadline_text", "icon_type", "order")
    list_editable = ("order",)
    search_fields = ("scholarship__slug", "scholarship__title")


@admin.register(HomeCompetitionSpot)
class HomeCompetitionSpotAdmin(admin.ModelAdmin):
    list_display = ("key", "competition")


@admin.register(HomeEventSpot)
class HomeEventSpotAdmin(admin.ModelAdmin):
    list_display = ("key", "event")


@admin.register(HomeQuickLink)
class HomeQuickLinkAdmin(admin.ModelAdmin):
    list_display = ("link_id", "label", "target", "tone", "order")
    list_editable = ("order",)
