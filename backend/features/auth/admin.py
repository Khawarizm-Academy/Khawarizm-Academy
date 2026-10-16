"""Django admin registration for the auth feature."""

from __future__ import annotations

from django.contrib import admin

from features.auth.models import Learner


@admin.register(Learner)
class LearnerAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "learning_level", "language", "last_seen_at")
    search_fields = ("email", "full_name")
    list_filter = ("learning_level", "language")
