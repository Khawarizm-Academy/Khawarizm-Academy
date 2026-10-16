"""Scholarship model — the catalog summary and detail record share this row."""

from __future__ import annotations

from django.db import models

from features.common.choices import (
    CategorySlug,
    ScholarshipCountrySlug,
    ScholarshipCoverageType,
    ScholarshipDeadlineUrgency,
    ScholarshipDegreeLevel,
    ScholarshipStatus,
)


class Scholarship(models.Model):
    slug = models.CharField(max_length=80, primary_key=True, unique=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=120, blank=True)
    category_slug = models.CharField(max_length=40, choices=CategorySlug.choices, blank=True)
    thumbnail_url = models.URLField(max_length=400)

    # Eligibility and funding.
    country = models.CharField(max_length=80, blank=True)
    country_slug = models.CharField(max_length=40, choices=ScholarshipCountrySlug.choices, blank=True)
    degree_level = models.CharField(max_length=20, choices=ScholarshipDegreeLevel.choices, blank=True)
    degree_label = models.CharField(max_length=80, blank=True)
    provider = models.CharField(max_length=120, blank=True)
    coverage_type = models.CharField(max_length=20, choices=ScholarshipCoverageType.choices, blank=True)
    coverage_label = models.CharField(max_length=120, blank=True)

    # Deadline window.
    days_remaining = models.PositiveIntegerField(null=True, blank=True)
    deadline_badge = models.CharField(max_length=40, blank=True)
    deadline_urgency = models.CharField(max_length=10, choices=ScholarshipDeadlineUrgency.choices, blank=True)
    status = models.CharField(max_length=20, choices=ScholarshipStatus.choices, blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.title
