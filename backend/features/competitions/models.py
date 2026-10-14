"""Competition model — a global competition/challenge row."""

from __future__ import annotations

from django.db import models


class Competition(models.Model):
    competition_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    badge = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    days_remaining = models.CharField(max_length=10, blank=True)
    hours_remaining = models.CharField(max_length=10, blank=True)
    action_text = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["competition_id"]

    def __str__(self) -> str:
        return self.title
