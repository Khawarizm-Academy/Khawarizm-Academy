"""Events and competitions."""

from __future__ import annotations

from django.db import models

from academy.choices import EventFormat


class EventItem(models.Model):
    event_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    badge = models.CharField(max_length=80, blank=True)
    date = models.CharField(max_length=80, blank=True)
    format = models.CharField(max_length=40, choices=EventFormat.choices, blank=True)
    is_featured = models.BooleanField(default=False)
    thumbnail_type = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ["event_id"]


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
