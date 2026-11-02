"""Course models — catalog rows plus the owned curriculum and lifecycle."""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Q

from features.common.choices import (
    CourseLevel,
    CoursePriceType,
    CourseStaffKind,
    CourseStatus,
    LessonKind,
    LessonResourceKind,
    LiveSessionState,
)
from features.common.models import TimeStampedModel, UUIDModel

LANGUAGES = [("arabic", "arabic"), ("english", "english"), ("french", "french")]


class CourseQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=CourseStatus.PUBLISHED)

    def visible_to(self, user):
        public = Q(status__in=(CourseStatus.PUBLISHED, CourseStatus.ARCHIVED))
        if not getattr(user, "is_authenticated", False):
            return self.filter(public)
        from features.access.services import has_perm

        if has_perm(user, "courses.edit_any"):
            return self.all()
        if has_perm(user, "courses.edit_own"):
            public |= Q(
                status__in=(CourseStatus.DRAFT, CourseStatus.IN_REVIEW),
                staff__user=user,
                staff__kind__in=(CourseStaffKind.OWNER, CourseStaffKind.CO_INSTRUCTOR),
            )
        return self.filter(public).distinct()


class Course(UUIDModel):
    """One course: the card summary and the full detail record share this row."""

    slug = models.CharField(max_length=80, unique=True, help_text="Public id used in URLs, e.g. course-1")
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=12, choices=CourseStatus.choices, default=CourseStatus.PUBLISHED)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="owned_courses",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)
    total_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    # Summary fields — legacy display fields remain stable for public clients.
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

    exam_question_count = models.PositiveIntegerField(default=25)
    exam_minutes = models.PositiveIntegerField(default=45)
    exam_pass_threshold = models.PositiveIntegerField(default=70)
    exam_attempts_left = models.PositiveIntegerField(default=2)

    objects = CourseQuerySet.as_manager()

    class Meta:
        ordering = ["slug"]
        indexes = [models.Index(fields=["status", "slug"], name="idx_course_status_slug")]

    def __str__(self) -> str:
        return self.title


class CourseStaff(UUIDModel, TimeStampedModel):
    """Explicit course staff; ownership is never inferred from display text."""

    course = models.ForeignKey(Course, related_name="staff", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="course_staff", on_delete=models.CASCADE)
    kind = models.CharField(max_length=20, choices=CourseStaffKind.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["course", "user"], name="uniq_course_staff_user"),
            models.UniqueConstraint(
                fields=["course"], condition=Q(kind=CourseStaffKind.OWNER), name="uniq_course_owner_staff"
            ),
        ]
        indexes = [models.Index(fields=["user", "kind"], name="idx_coursestaff_user_kind")]

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.user_id}:{self.kind}"


class CourseModule(UUIDModel):
    """A curriculum module grouping ordered lessons."""

    course = models.ForeignKey(Course, related_name="modules", on_delete=models.CASCADE)
    module_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["course", "order", "module_id"]
        unique_together = ("course", "module_id")

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.module_id}"


class CourseLesson(UUIDModel):
    """One additive lesson row; legacy duration and summary remain intact."""

    module = models.ForeignKey(CourseModule, related_name="lessons", on_delete=models.CASCADE)
    lesson_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    duration = models.CharField(max_length=20, blank=True)
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    kind = models.CharField(max_length=12, choices=LessonKind.choices, default=LessonKind.VIDEO)
    video_asset = models.ForeignKey(
        "videohosting.VideoAsset",
        related_name="lessons",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_index=False,
    )
    is_free_preview = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    content = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["module", "order", "lesson_id"]
        unique_together = ("module", "lesson_id")
        indexes = [models.Index(fields=["video_asset"], name="idx_courselesson_video")]

    def __str__(self) -> str:
        return f"{self.module.module_id}:{self.lesson_id}"


class LessonResource(UUIDModel):
    """A safe external resource link attached to one lesson."""

    lesson = models.ForeignKey(CourseLesson, related_name="resources", on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    url = models.URLField(max_length=400)
    kind = models.CharField(max_length=20, choices=LessonResourceKind.choices, default=LessonResourceKind.LINK)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["lesson", "order", "id"]

    def __str__(self) -> str:
        return f"{self.lesson.lesson_id}:{self.title}"


class LessonProgress(UUIDModel, TimeStampedModel):
    """A learner's watch-progress ledger for one lesson."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="lesson_progress", on_delete=models.CASCADE)
    lesson = models.ForeignKey(CourseLesson, related_name="progress_rows", on_delete=models.CASCADE)
    position_seconds = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(default=0)
    watched_seconds = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="uniq_lp_user_lesson"),
        ]
        indexes = [models.Index(fields=["lesson", "completed"], name="idx_lp_lesson_completed")]


class CourseLiveSession(UUIDModel):
    """A scheduled weekly review session — a launchpad, never an embedded call."""

    course = models.ForeignKey(Course, related_name="live_sessions", on_delete=models.CASCADE)
    session_id = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    state = models.CharField(max_length=12, choices=LiveSessionState.choices, default=LiveSessionState.UPCOMING)
    date_label = models.CharField(max_length=60)
    time_label = models.CharField(max_length=60)
    meet_url = models.URLField(max_length=400, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["course", "order", "session_id"]
        unique_together = ("course", "session_id")

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.session_id}"


class CourseProblem(UUIDModel):
    """One practice problem, shared across courses today."""

    problem_id = models.CharField(max_length=40, unique=True)
    prompt = models.CharField(max_length=240)
    code = models.TextField(blank=True)
    correct_option_id = models.CharField(max_length=10)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "problem_id"]

    def __str__(self) -> str:
        return self.problem_id


class CourseProblemOption(UUIDModel):
    """One answer option belonging to a practice problem."""

    problem = models.ForeignKey(CourseProblem, related_name="options", on_delete=models.CASCADE)
    option_id = models.CharField(max_length=10)
    label = models.CharField(max_length=200)

    class Meta:
        ordering = ["problem", "option_id"]
        unique_together = ("problem", "option_id")

    def __str__(self) -> str:
        return f"{self.problem.problem_id}:{self.option_id}"
