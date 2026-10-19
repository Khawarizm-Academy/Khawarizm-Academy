"""Django admin for scholarships."""

from __future__ import annotations

from django.contrib import admin

from features.scholarships.models import Scholarship, ScholarshipApplication


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "provider", "country", "degree_level", "status")
    list_filter = ("category_slug", "country_slug", "degree_level", "status", "deadline_urgency")
    search_fields = ("slug", "title", "provider")


@admin.register(ScholarshipApplication)
class ScholarshipApplicationAdmin(admin.ModelAdmin):
    list_display = ("user", "scholarship", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__email", "scholarship__slug", "scholarship__title")
    autocomplete_fields = ("user", "scholarship")
