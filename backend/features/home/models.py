"""Home content models — placements that point at the real feature rows.

The home rails never copy a course/scholarship/event/competition: each row here
stores only the presentation extras and a foreign key to the owning table.
"""

from __future__ import annotations

from django.db import models

from features.common.choices import QuickLinkTone, ThumbnailType
from features.common.models import UUIDModel


class HomeFeaturedCourse(UUIDModel):
    """Pins a real Course onto the home featured rail."""

    course = models.OneToOneField("courses.Course", related_name="home_featured", on_delete=models.CASCADE)
    students_count = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=40, blank=True)
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return f"home-course:{self.course.slug}"


class HomeFeaturedScholarship(UUIDModel):
    """Pins a real Scholarship onto the home featured rail."""

    scholarship = models.OneToOneField("scholarships.Scholarship", related_name="home_featured", on_delete=models.CASCADE)
    deadline_text = models.CharField(max_length=60, blank=True)
    icon_type = models.CharField(max_length=20, blank=True, help_text="university, globe, or briefcase")
    thumbnail_type = models.CharField(max_length=30, choices=ThumbnailType.choices, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return f"home-scholarship:{self.scholarship.slug}"


class HomeCompetitionSpot(UUIDModel):
    """Places a real Competition at a named home slot (mobile / desktop)."""

    key = models.CharField(max_length=40, unique=True, help_text="mobile or desktop")
    competition = models.ForeignKey("competitions.Competition", related_name="home_spots", on_delete=models.CASCADE)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return f"home-competition:{self.key}"


class HomeEventSpot(UUIDModel):
    """Places a real EventItem at a named home slot."""

    key = models.CharField(max_length=40, unique=True, help_text="mobile, desktopFeatured, or desktopWorkshop")
    event = models.ForeignKey("events.EventItem", related_name="home_spots", on_delete=models.CASCADE)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return f"home-event:{self.key}"


class HomeQuickLink(UUIDModel):
    link_id = models.CharField(max_length=40, unique=True)
    icon = models.CharField(max_length=40, blank=True)
    label = models.CharField(max_length=60, blank=True)
    subtitle = models.CharField(max_length=80, blank=True)
    tone = models.CharField(max_length=10, choices=QuickLinkTone.choices, default=QuickLinkTone.BLUE)
    target = models.CharField(max_length=20, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "link_id"]

    def __str__(self) -> str:
        return self.label or self.link_id
