"""Course models — the catalog summary plus the landing/player curriculum."""

from __future__ import annotations

from django.db import models

from features.common.choices import CourseLevel, CoursePriceType, LiveSessionState

LANGUAGES = [("arabic", "arabic"), ("english", "english"), ("french", "french")]


class Course(models.Model):
    """One course: the card summary and the full detail record share this row."""

    slug = models.CharField(max_length=80, primary_key=True, unique=True, help_text="Matches the frontend id like course-1")
    title = models.CharField(max_length=200)

    # Summary fields — the CatalogItem and course card.
    category_label = models.CharField(max_length=120)
    category_slug = models.CharField(max_length=40)
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
    language = models.CharField(max_length=12, default="arabic", choices=LANGUAGES)

    # Detail fields — the landing page and player.
    tagline = models.CharField(max_length=240, blank=True)
    about = models.TextField(blank=True)
    instructor_credential = models.CharField(max_length=200, blank=True)
    instructor_bio = models.TextField(blank=True)
    review_count = models.PositiveIntegerField(default=0)
    enrolled_count = models.PositiveIntegerField(default=0)
    started_lesson_slug = models.CharField(max_length=120, blank=True)
    outcomes = models.JSONField(default=list, blank=True, help_text="List of learning outcomes")
    related_ids = models.JSONField(default=list, blank=True, help_text="Slugs of related courses")

    # Exam parameters shown before the end-of-course exam unlocks.
    exam_question_count = models.PositiveIntegerField(default=25)
    exam_minutes = models.PositiveIntegerField(default=45)
    exam_pass_threshold = models.PositiveIntegerField(default=70)
    exam_attempts_left = models.PositiveIntegerField(default=2)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.title


class CourseModule(models.Model):
    """A curriculum module grouping ordered lessons."""

    course = models.ForeignKey(Course, related_name="modules", on_delete=models.CASCADE)
    module_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["course", "order", "id"]
        unique_together = ("course", "module_id")

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.module_id}"


class CourseLesson(models.Model):
    """One lesson inside a module (title, duration, summary only)."""

    module = models.ForeignKey(CourseModule, related_name="lessons", on_delete=models.CASCADE)
    lesson_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    duration = models.CharField(max_length=20)
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["module", "order", "id"]
        unique_together = ("module", "lesson_id")

    def __str__(self) -> str:
        return f"{self.module.module_id}:{self.lesson_id}"


class CourseLiveSession(models.Model):
    """A scheduled weekly review session — a launchpad, never an embedded call."""

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

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.session_id}"


class CourseProblem(models.Model):
    """One practice problem, shared across courses today."""

    problem_id = models.CharField(max_length=40, primary_key=True, unique=True)
    prompt = models.CharField(max_length=240)
    code = models.TextField(blank=True)
    correct_option_id = models.CharField(max_length=10)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)

    class Meta:
        ordering = ["problem_id"]

    def __str__(self) -> str:
        return self.problem_id


class CourseProblemOption(models.Model):
    """One answer option belonging to a practice problem."""

    problem = models.ForeignKey(CourseProblem, related_name="options", on_delete=models.CASCADE)
    option_id = models.CharField(max_length=10)
    label = models.CharField(max_length=200)

    class Meta:
        ordering = ["problem", "option_id"]

    def __str__(self) -> str:
        return f"{self.problem.problem_id}:{self.option_id}"
