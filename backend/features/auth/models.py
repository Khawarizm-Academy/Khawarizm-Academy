"""Learner identity — the single account the API acts as while auth is stubbed."""

from __future__ import annotations

from django.db import models

# Internal learning keys stay English; Arabic only appears at render time.
LEARNING_LEVELS = [("beginner", "beginner"), ("intermediate", "intermediate"), ("advanced", "advanced")]


class Learner(models.Model):
    email = models.EmailField(primary_key=True, unique=True, help_text="Identity key; also the primary key")
    full_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    membership_status = models.CharField(max_length=140, blank=True, help_text="Display line, e.g. 'متعلّم منذ مارس 2024'")
    avatar_initials = models.CharField(max_length=10, blank=True)
    avatar_url = models.URLField(max_length=400, blank=True)
    learning_level = models.CharField(max_length=20, choices=LEARNING_LEVELS, default="intermediate")

    # Preferences — edited from the profile feature.
    interests = models.JSONField(default=list, blank=True, help_text="List of interest labels")
    notifications_preferences = models.JSONField(default=dict, blank=True, help_text="liveSessionReminders / weeklyProgressSummary / recommendedOpportunities")
    language = models.CharField(max_length=10, default="ar")
    timezone = models.CharField(max_length=60, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Learner"
        verbose_name_plural = "Learners"

    def __str__(self) -> str:
        return self.full_name or self.email
