"""Content models for home, events and competitions."""

from __future__ import annotations

from django.db import models

from academy.choices import EventFormat, QuickLinkTone, ThumbnailType


class HomeFeaturedCourse(models.Model):
    course_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    category = models.CharField(max_length=80, blank=True)
    level = models.CharField(max_length=20, blank=True)
    duration = models.CharField(max_length=40, blank=True)
    students_count = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=40, blank=True)
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)

    class Meta:
        ordering = ["course_id"]


class HomeFeaturedScholarship(models.Model):
    scholarship_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    provider = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=80, blank=True)
    deadline_text = models.CharField(max_length=60, blank=True)
    deadline_urgency = models.CharField(max_length=10, blank=True)
    coverage = models.CharField(max_length=80, blank=True)
    degree_level = models.CharField(max_length=40, blank=True)
    icon_type = models.CharField(max_length=20, choices=[("university", "university"), ("globe", "globe"), ("briefcase", "briefcase")], blank=True)
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)

    class Meta:
        ordering = ["scholarship_id"]


class HomeCompetition(models.Model):
    key = models.CharField(max_length=40, unique=True, help_text="mobile or desktop")
    competition_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    badge = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    days_remaining = models.CharField(max_length=10, blank=True)
    hours_remaining = models.CharField(max_length=10, blank=True)
    action_text = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["key"]


class HomeEvent(models.Model):
    key = models.CharField(max_length=40, unique=True, help_text="mobile or desktopFeatured or desktopWorkshop")
    event_id = models.CharField(max_length=80)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    badge = models.CharField(max_length=80, blank=True)
    date = models.CharField(max_length=80, blank=True)
    format = models.CharField(max_length=40, choices=EventFormat.choices, blank=True)
    is_featured = models.BooleanField(default=False)
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)

    class Meta:
        ordering = ["key"]


class HomeQuickLink(models.Model):
    link_id = models.CharField(max_length=40, unique=True)
    icon = models.CharField(max_length=40, blank=True)
    label = models.CharField(max_length=60, blank=True)
    subtitle = models.CharField(max_length=80, blank=True)
    tone = models.CharField(max_length=10, choices=QuickLinkTone.choices, default=QuickLinkTone.BLUE)
    target = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["link_id"]
