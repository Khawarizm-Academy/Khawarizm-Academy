"""Catalog taxonomy — the shared category a course or scholarship belongs to."""

from __future__ import annotations

from django.db import models

from features.common.choices import CategorySlug


class Category(models.Model):
    slug = models.CharField(max_length=40, unique=True, choices=CategorySlug.choices)
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ["slug"]
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.label
