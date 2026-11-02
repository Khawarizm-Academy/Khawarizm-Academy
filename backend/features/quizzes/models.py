from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Q

from features.common.choices import QuestionKind, QuizKind, RevealPolicy
from features.common.models import TimeStampedModel, UUIDModel


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", "In progress"
    SUBMITTED = "submitted", "Submitted"
    EXPIRED = "expired", "Expired"


class Quiz(UUIDModel, TimeStampedModel):
    course = models.ForeignKey("courses.Course", related_name="quizzes", on_delete=models.CASCADE)
    lesson = models.ForeignKey(
        "courses.CourseLesson", related_name="quizzes", null=True, blank=True, on_delete=models.SET_NULL
    )
    kind = models.CharField(max_length=20, choices=QuizKind.choices)
    title = models.CharField(max_length=160)
    instructions = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    pass_threshold = models.PositiveIntegerField(default=70)
    max_attempts = models.PositiveIntegerField(null=True, blank=True)
    draw_count = models.PositiveIntegerField(null=True, blank=True)
    shuffle_questions = models.BooleanField(default=False)
    shuffle_options = models.BooleanField(default=False)
    reveal_policy = models.CharField(max_length=20, choices=RevealPolicy.choices, default=RevealPolicy.AFTER_SUBMIT)
    unlock_progress_percent = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="created_quizzes", null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["course", "order", "title"]
        constraints = [
            models.UniqueConstraint(fields=["course"], condition=Q(kind=QuizKind.EXAM), name="uniq_quiz_exam_course"),
            models.CheckConstraint(condition=Q(pass_threshold__lte=100), name="quiz_pass_threshold_le_100"),
            models.CheckConstraint(condition=Q(unlock_progress_percent__lte=100), name="quiz_unlock_progress_le_100"),
        ]
        indexes = [models.Index(fields=["course", "kind", "is_published"], name="idx_quiz_course_kind_pub")]

    def __str__(self) -> str:
        return self.title


class Question(UUIDModel):
    quiz = models.ForeignKey(Quiz, related_name="questions", on_delete=models.CASCADE)
    kind = models.CharField(max_length=12, choices=QuestionKind.choices)
    prompt = models.TextField()
    code = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    partial_credit = models.BooleanField(default=False)

    class Meta:
        ordering = ["quiz", "order", "id"]
        indexes = [models.Index(fields=["quiz", "order"], name="idx_question_quiz_order")]


class Option(UUIDModel):
    question = models.ForeignKey(Question, related_name="options", on_delete=models.CASCADE)
    label = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["question", "order", "id"]
        constraints = [models.UniqueConstraint(fields=["question", "order"], name="uniq_option_question_order")]
        indexes = [models.Index(fields=["question", "is_correct"], name="idx_option_question_correct")]


class Attempt(UUIDModel, TimeStampedModel):
    quiz = models.ForeignKey(Quiz, related_name="attempts", on_delete=models.PROTECT)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="quiz_attempts", on_delete=models.CASCADE)
    status = models.CharField(max_length=15, choices=AttemptStatus.choices, default=AttemptStatus.IN_PROGRESS)
    started_at = models.DateTimeField()
    deadline_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    pass_threshold = models.PositiveSmallIntegerField(default=70)
    reveal_policy = models.CharField(max_length=20, choices=RevealPolicy.choices, default=RevealPolicy.AFTER_SUBMIT)
    question_order = models.JSONField(default=list)
    option_order = models.JSONField(default=dict)
    score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    percent = models.PositiveSmallIntegerField(null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ["user", "quiz", "-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "quiz"],
                condition=Q(status=AttemptStatus.IN_PROGRESS),
                name="uniq_attempt_live_user_quiz",
            )
        ]
        indexes = [models.Index(fields=["user", "quiz", "-started_at"], name="idx_attempt_user_quiz_date")]


class Answer(UUIDModel):
    attempt = models.ForeignKey(Attempt, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(Question, related_name="answers", on_delete=models.PROTECT)
    selected = models.JSONField(default=list)
    correct_option_ids = models.JSONField(default=list, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    points_awarded = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attempt", "question"], name="uniq_answer_attempt_question")]
        indexes = [models.Index(fields=["question", "is_correct"], name="idx_answer_question_correct")]


class AttemptGrant(UUIDModel, TimeStampedModel):
    quiz = models.ForeignKey(Quiz, related_name="attempt_grants", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="quiz_attempt_grants", on_delete=models.CASCADE)
    extra = models.PositiveIntegerField()
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="granted_quiz_attempts", null=True, blank=True, on_delete=models.SET_NULL
    )
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["quiz", "user"], name="uniq_attempt_grant_quiz_user")]
        indexes = [models.Index(fields=["user", "quiz"], name="idx_attempt_grant_user_quiz")]
