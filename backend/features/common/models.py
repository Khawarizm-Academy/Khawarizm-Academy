"""Shared abstract model bases every feature table inherits."""

from __future__ import annotations

import uuid

from django.db import models
from django.utils import timezone

from features.common.choices import MaintenanceRunStatus


class UUIDModel(models.Model):
    """A UUID primary key — every table uses one instead of an integer id."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Adds created/updated timestamps for audit-friendly tables."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class MaintenanceRun(UUIDModel):
    """One `cleanup_expired` execution — the overlap marker and its audit row.

    The guard is the existence check: a row still `running` (and younger than
    the grace window in `maintenance.py`) makes the next run exit with
    "skipped". A crashed run therefore blocks at most one grace window, and
    every run leaves its per-family delete counts behind for the operator.
    """

    trigger = models.CharField(max_length=20, help_text="command | endpoint | cron")
    status = models.CharField(
        max_length=10, choices=MaintenanceRunStatus.choices, default=MaintenanceRunStatus.RUNNING, db_index=True
    )
    started_at = models.DateTimeField(default=timezone.now, db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    deleted = models.JSONField(default=dict, blank=True, help_text="Per-family delete counts")
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.trigger}@{self.started_at:%Y-%m-%d %H:%M} {self.status}"
