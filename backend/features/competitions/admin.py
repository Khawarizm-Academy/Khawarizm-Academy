"""Django admin registration for the competitions feature."""

from __future__ import annotations

from django.contrib import admin

from features.competitions.models import Competition


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ("competition_id", "title", "days_remaining", "hours_remaining")
    search_fields = ("competition_id", "title")
