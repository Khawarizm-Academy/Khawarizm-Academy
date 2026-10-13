"""Data models for Khawarizm Academy.

These models store the mocked domain data so the API can return
camelCase-shaped JSON that matches the frontend types exactly.
"""

from __future__ import annotations

from typing import Any

from django.db import models

from academy.choices import (
    CategorySlug,
    CompetitionActionVariant,
    CompetitionStatusColor,
    CourseLevel,
    CoursePriceType,
    CourseTrackIcon,
    EventFormat,
    ItemType,
    LiveSessionState,
    NotificationType,
    QuickLinkTone,
    ScholarshipCheckIcon,
    ScholarshipCheckKind,
    ScholarshipCountrySlug,
    ScholarshipCoverageType,
    ScholarshipDeadlineUrgency,
    ScholarshipDegreeLevel,
    ScholarshipStatus,
    ThumbnailType,
)


# Catalog and courses


class Category(models.Model):
    slug = models.CharField(max_length=40, unique=True, choices=CategorySlug.choices)
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:  # pragma: no cover - simple
        return self.label


class Course(models.Model):
    slug = models.CharField(max_length=80, primary_key=True, unique=True, help_text="Matches frontend id like course-1")
    title = models.CharField(max_length=200)
    category_label = models.CharField(max_length=120)
    category_slug = models.CharField(max_length=40, choices=CategorySlug.choices)
    thumbnail_url = models.URLField(max_length=400)
    rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    duration = models.CharField(max_length=40, blank=True)
    lessons_count = models.PositiveIntegerField(default=0)
    instructor = models.CharField(max_length=120, blank=True)
    course_level = models.CharField(max_length=20, choices=CourseLevel.choices)
    course_level_ar = models.CharField(max_length=40, blank=True)
    price_type = models.CharField(max_length=10, choices=CoursePriceType.choices, default=CoursePriceType.FREE)
    price_label = models.CharField(max_length=40, blank=True)
    progress_badge = models.CharField(max_length=40, blank=True)
    language = models.CharField(max_length=12, default="arabic", choices=[("arabic", "arabic"), ("english", "english"), ("french", "french")])

    # Detail fields
    tagline = models.CharField(max_length=240, blank=True)
    about = models.TextField(blank=True)
    instructor_credential = models.CharField(max_length=200, blank=True)
    instructor_bio = models.TextField(blank=True)
    review_count = models.PositiveIntegerField(default=0)
    enrolled_count = models.PositiveIntegerField(default=0)
    started_lesson_slug = models.CharField(max_length=120, blank=True)
    outcomes = models.JSONField(default=list, blank=True)
    exam_question_count = models.PositiveIntegerField(default=25)
    exam_minutes = models.PositiveIntegerField(default=45)
    exam_pass_threshold = models.PositiveIntegerField(default=70)
    exam_attempts_left = models.PositiveIntegerField(default=2)
    related_ids = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:  # pragma: no cover - simple
        return self.title


class CourseModule(models.Model):
    course = models.ForeignKey(Course, related_name="modules", on_delete=models.CASCADE)
    module_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["course", "order", "id"]
        unique_together = ("course", "module_id")

    def __str__(self) -> str:  # pragma: no cover - simple
        return f"{self.course.slug}:{self.module_id}"


class CourseLesson(models.Model):
    module = models.ForeignKey(CourseModule, related_name="lessons", on_delete=models.CASCADE)
    lesson_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    duration = models.CharField(max_length=20)
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["module", "order", "id"]
        unique_together = ("module", "lesson_id")

    def __str__(self) -> str:  # pragma: no cover - simple
        return f"{self.module.module_id}:{self.lesson_id}"


class CourseLiveSession(models.Model):
    course = models.ForeignKey(Course, related_name="live_sessions", on_delete=models.CASCADE)
    session_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    state = models.CharField(max_length=12, choices=LiveSessionState.choices, default=LiveSessionState.UPCOMING)
    date_label = models.CharField(max_length=60)
    time_label = models.CharField(max_length=60)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["course", "order", "id"]
        unique_together = ("course", "session_id")

    def __str__(self) -> str:  # pragma: no cover - simple
        return f"{self.course.slug}:{self.session_id}"


class CourseProblem(models.Model):
    problem_id = models.CharField(max_length=40, primary_key=True, unique=True)
    prompt = models.CharField(max_length=240)
    code = models.TextField(blank=True)
    correct_option_id = models.CharField(max_length=10)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)

    class Meta:
        ordering = ["problem_id"]

    def __str__(self) -> str:  # pragma: no cover - simple
        return self.problem_id


class CourseProblemOption(models.Model):
    problem = models.ForeignKey(CourseProblem, related_name="options", on_delete=models.CASCADE)
    option_id = models.CharField(max_length=10)
    label = models.CharField(max_length=200)

    class Meta:
        ordering = ["problem", "option_id"]

    def __str__(self) -> str:  # pragma: no cover - simple
        return f"{self.problem.problem_id}:{self.option_id}"


class Scholarship(models.Model):
    slug = models.CharField(max_length=80, primary_key=True, unique=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=120, blank=True)
    category_slug = models.CharField(max_length=40, choices=CategorySlug.choices, blank=True)
    thumbnail_url = models.URLField(max_length=400)
    country = models.CharField(max_length=80, blank=True)
    country_slug = models.CharField(max_length=40, choices=ScholarshipCountrySlug.choices, blank=True)
    degree_level = models.CharField(max_length=20, choices=ScholarshipDegreeLevel.choices, blank=True)
    degree_label = models.CharField(max_length=80, blank=True)
    provider = models.CharField(max_length=120, blank=True)
    coverage_type = models.CharField(max_length=20, choices=ScholarshipCoverageType.choices, blank=True)
    coverage_label = models.CharField(max_length=120, blank=True)
    days_remaining = models.PositiveIntegerField(null=True, blank=True)
    deadline_badge = models.CharField(max_length=40, blank=True)
    deadline_urgency = models.CharField(max_length=10, choices=ScholarshipDeadlineUrgency.choices, blank=True)
    status = models.CharField(max_length=20, choices=ScholarshipStatus.choices, blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:  # pragma: no cover - simple
        return self.title


# Split-out model groups are imported into this namespace so both Django (model
# registration) and the seed command (``academy.models.<Name>``) can see them.
from academy.models_content import *  # noqa: E402,F401,F403
from academy.models_dashboard import *  # noqa: E402,F401,F403
from academy.models_events_competitions import *  # noqa: E402,F401,F403
