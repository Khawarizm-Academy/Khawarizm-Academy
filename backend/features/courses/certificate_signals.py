"""Completion event adapters for certificate issuance."""

from __future__ import annotations

from django.dispatch import receiver

from features.courses.certificate_services import issue_certificate_if_complete
from features.quizzes.signals import on_exam_passed


@receiver(on_exam_passed)
def issue_certificate_after_exam(sender, attempt, **kwargs):
    """The exam signal fires after commit, so issuance sees the final attempt state."""
    return issue_certificate_if_complete(attempt.user, attempt.quiz.course)
