"""Shared abstract model bases every feature table inherits."""

from __future__ import annotations

import uuid

from django.db import models


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
