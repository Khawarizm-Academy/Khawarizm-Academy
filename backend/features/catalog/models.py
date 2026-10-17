"""Catalog taxonomy — categories plus the DB-driven filter metadata.

The catalog filter sidebar has no hard-coded JSON anymore: every group and
option is a row here, edited from Django admin.
"""

from __future__ import annotations

from django.db import models

from features.common.choices import CategorySlug, FilterGroupKind
from features.common.models import TimeStampedModel, UUIDModel


class Category(UUIDModel):
    slug = models.CharField(max_length=40, unique=True, choices=CategorySlug.choices)
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ["slug"]
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.label


class FilterGroup(UUIDModel, TimeStampedModel):
    """One filter row the catalog UI renders (key / label / tone / surfaces)."""

    key = models.CharField(max_length=40, unique=True)
    label = models.CharField(max_length=120)
    kind = models.CharField(max_length=10, choices=FilterGroupKind.choices, default=FilterGroupKind.CHOICE)
    tone = models.CharField(max_length=10, default="sky", help_text="gold or sky")
    mobile_tone = models.CharField(max_length=10, blank=True, help_text="Optional tone override on mobile")
    glow = models.BooleanField(default=False)
    surfaces = models.JSONField(default=list, help_text="Which surfaces show it, e.g. ['desktop','mobile']")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "key"]
        verbose_name = "Filter group"

    def __str__(self) -> str:
        return self.key


class FilterOption(UUIDModel):
    """One selectable value inside a filter group."""

    group = models.ForeignKey(FilterGroup, related_name="options", on_delete=models.CASCADE)
    value = models.CharField(max_length=40, help_text="The query-param value, e.g. 'ai'")
    label = models.CharField(max_length=120)
    tabs = models.JSONField(default=list, blank=True, help_text="Tabs it appears on; empty means every tab")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["group", "order", "value"]
        unique_together = ("group", "value")
        verbose_name = "Filter option"

    def __str__(self) -> str:
        return f"{self.group.key}:{self.value}"
