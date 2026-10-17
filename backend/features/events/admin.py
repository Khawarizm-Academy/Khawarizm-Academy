"""Django admin for events."""

from __future__ import annotations

from django.contrib import admin

from features.events.models import EventItem


@admin.register(EventItem)
class EventItemAdmin(admin.ModelAdmin):
    list_display = ("event_id", "title", "format", "date", "is_featured")
    list_filter = ("format", "is_featured")
    search_fields = ("event_id", "title")
