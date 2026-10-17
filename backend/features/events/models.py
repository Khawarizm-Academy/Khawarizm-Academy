"""Event model — one event/workshop row (the single source for home rails too)."""

from __future__ import annotations

from django.db import models

from features.common.choices import EventFormat, ThumbnailType
from features.common.models import UUIDModel


class EventItem(UUIDModel):
    event_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    badge = models.CharField(max_length=80, blank=True)
    date = models.CharField(max_length=80, blank=True)
    format = models.CharField(max_length=40, choices=EventFormat.choices, blank=True)
    is_featured = models.BooleanField(default=False)
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)

    class Meta:
        ordering = ["event_id"]

    def __str__(self) -> str:
        return self.title
