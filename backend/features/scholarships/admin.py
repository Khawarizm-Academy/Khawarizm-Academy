"""Django admin registration for the scholarships feature."""

from __future__ import annotations

from django.contrib import admin

from features.scholarships.models import Scholarship


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "country", "degree_level", "coverage_type", "status", "days_remaining")
    list_filter = ("status", "degree_level", "coverage_type", "country_slug")
    search_fields = ("slug", "title", "provider")
