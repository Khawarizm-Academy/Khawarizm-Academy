from datetime import timedelta
from decimal import Decimal

from django.test import TestCase

from features.common.choices import Role
from features.common.errors import Conflict
from features.common.testing import make_course, make_user
from features.courses.models import CourseStaff

from .models import AttemptStatus, Option, Question, QuestionKind, Quiz, QuizKind, RevealPolicy
from .serializers import attempt_payload
from .services import can_author, quiz_stats, result_view, start_attempt, submit_attempt, validate_quiz


class QuizDomainTests(TestCase):
    def setUp(self):
        self.user = make_user(role=Role.INSTRUCTOR)
        self.course = make_course(slug="quiz-course", status="published")
        CourseStaff.objects.create(course=self.course, user=self.user, kind="owner")
        self.quiz = Quiz.objects.create(course=self.course, kind=QuizKind.PRACTICE, title="Practice", is_published=True)
        self.question = Question.objects.create(quiz=self.quiz, kind=QuestionKind.SINGLE, prompt="2+2?", points=2)
        self.correct = Option.objects.create(question=self.question, label="4", is_correct=True, order=0)
        self.wrong = Option.objects.create(question=self.question, label="5", order=1)

    def test_validation_and_author_matrix(self):
        self.assertEqual(validate_quiz(self.quiz), [])
        self.assertTrue(can_author(self.user, self.quiz))
        self.correct.is_correct = False
        self.correct.save(update_fields=["is_correct"])
        self.assertEqual(validate_quiz(self.quiz)[0]["code"], "invalid_options")

    def test_start_is_redacted_and_idempotent(self):
        from features.dashboard.models import Enrollment

        Enrollment.objects.create(user=self.user, course=self.course)
        first = start_attempt(self.user, self.quiz)
        second = start_attempt(self.user, self.quiz)
        self.assertEqual(first.pk, second.pk)
        payload = attempt_payload(first)
        text = str(payload)
        self.assertNotIn("isCorrect", text)
        self.assertNotIn("explanation", text)
        self.assertNotIn("hint", text)

    def test_grading_is_idempotent_and_revealed_after_submit(self):
        from features.dashboard.models import Enrollment

        Enrollment.objects.create(user=self.user, course=self.course)
        attempt = start_attempt(self.user, self.quiz)
        from .services import save_answers

        save_answers(attempt, [{"questionId": str(self.question.pk), "optionIds": [str(self.correct.pk)]}])
        graded = submit_attempt(attempt)
        again = submit_attempt(graded)
        self.assertEqual(again.pk, graded.pk)
        self.assertEqual(graded.score, Decimal("2.00"))
        self.assertTrue(result_view(graded, self.user)["questions"])
        self.assertEqual(result_view(graded, self.user)["questions"][0]["correctOptionIds"], [str(self.correct.pk)])
        self.correct.is_correct = False
        self.correct.save(update_fields=["is_correct"])
        self.wrong.is_correct = True
        self.wrong.save(update_fields=["is_correct"])
        self.assertEqual(result_view(graded, self.user)["questions"][0]["correctOptionIds"], [str(self.correct.pk)])

    def test_deadline_grace_and_expiry(self):
        from features.dashboard.models import Enrollment

        Enrollment.objects.create(user=self.user, course=self.course)
        self.quiz.time_limit_minutes = 1
        self.quiz.save(update_fields=["time_limit_minutes"])
        attempt = start_attempt(self.user, self.quiz)
        now = attempt.deadline_at + timedelta(seconds=11)
        from .services import save_answers

        with self.assertRaises(Conflict):
            save_answers(attempt, [], now=now)
        expired = submit_attempt(attempt, expired=True, now=now)
        self.assertEqual(expired.status, AttemptStatus.EXPIRED)
        late_attempt = start_attempt(self.user, self.quiz)
        submitted_late = submit_attempt(late_attempt, now=late_attempt.deadline_at + timedelta(seconds=11))
        self.assertEqual(submitted_late.status, AttemptStatus.EXPIRED)

    def test_never_policy_redacts_feedback(self):
        from features.dashboard.models import Enrollment

        Enrollment.objects.create(user=self.user, course=self.course)
        self.quiz.reveal_policy = RevealPolicy.NEVER
        self.quiz.save(update_fields=["reveal_policy"])
        attempt = start_attempt(self.user, self.quiz)
        self.quiz.reveal_policy = RevealPolicy.AFTER_SUBMIT
        self.quiz.save(update_fields=["reveal_policy"])
        submit_attempt(attempt)
        result = result_view(attempt, self.user)
        self.assertNotIn("questions", result)
        self.assertFalse(result["feedbackAvailable"])

    def test_attempt_policy_and_threshold_are_snapshotted(self):
        from features.dashboard.models import Enrollment

        Enrollment.objects.create(user=self.user, course=self.course)
        self.quiz.reveal_policy = RevealPolicy.NEVER
        self.quiz.pass_threshold = 90
        self.quiz.save(update_fields=["reveal_policy", "pass_threshold"])
        attempt = start_attempt(self.user, self.quiz)
        self.quiz.reveal_policy = RevealPolicy.AFTER_SUBMIT
        self.quiz.pass_threshold = 10
        self.quiz.save(update_fields=["reveal_policy", "pass_threshold"])
        submit_attempt(attempt)
        self.assertEqual(attempt.pass_threshold, 90)
        self.assertEqual(attempt.reveal_policy, RevealPolicy.NEVER)
        self.assertFalse(result_view(attempt, self.user)["feedbackAvailable"])

    def test_after_pass_and_after_close_reveal_only_at_their_policy_boundary(self):
        from features.dashboard.models import Enrollment

        from .services import save_answers

        Enrollment.objects.create(user=self.user, course=self.course)
        self.quiz.reveal_policy = RevealPolicy.AFTER_PASS
        self.quiz.max_attempts = 2
        self.quiz.save(update_fields=["reveal_policy", "max_attempts"])
        failed = start_attempt(self.user, self.quiz)
        save_answers(failed, [{"questionId": str(self.question.pk), "optionIds": [str(self.wrong.pk)]}])
        failed = submit_attempt(failed)
        self.assertFalse(result_view(failed, self.user)["feedbackAvailable"])
        passed = start_attempt(self.user, self.quiz)
        save_answers(passed, [{"questionId": str(self.question.pk), "optionIds": [str(self.correct.pk)]}])
        passed = submit_attempt(passed)
        self.assertTrue(result_view(passed, self.user)["feedbackAvailable"])

        close_quiz = Quiz.objects.create(
            course=self.course,
            kind=QuizKind.PRACTICE,
            title="Closing",
            is_published=True,
            max_attempts=1,
            reveal_policy=RevealPolicy.AFTER_CLOSE,
        )
        close_question = Question.objects.create(quiz=close_quiz, kind=QuestionKind.SINGLE, prompt="Close?")
        Option.objects.create(question=close_question, label="Yes", is_correct=True, order=0)
        Option.objects.create(question=close_question, label="No", order=1)
        closed = start_attempt(self.user, close_quiz)
        closed = submit_attempt(closed)
        self.assertTrue(result_view(closed, self.user)["feedbackAvailable"])

    def test_stats_include_ten_bands_mean_median_and_question_diagnostics(self):
        from features.dashboard.models import Enrollment

        from .services import save_answers

        Enrollment.objects.create(user=self.user, course=self.course)
        perfect = start_attempt(self.user, self.quiz)
        save_answers(perfect, [{"questionId": str(self.question.pk), "optionIds": [str(self.correct.pk)]}])
        submit_attempt(perfect)
        failed = start_attempt(self.user, self.quiz)
        save_answers(failed, [{"questionId": str(self.question.pk), "optionIds": [str(self.wrong.pk)]}])
        submit_attempt(failed)
        stats = quiz_stats(self.quiz)
        self.assertEqual(stats["attempts"], 2)
        self.assertEqual(stats["meanScore"], 50)
        self.assertEqual(stats["medianScore"], 50)
        self.assertEqual(stats["passRate"], 0.5)
        self.assertEqual(len(stats["scoreHistogram"]), 10)
        self.assertEqual(stats["scoreHistogram"]["90-100"], 1)
        self.assertEqual(stats["perQuestion"][0]["correctPercent"], 50)
        self.assertEqual(stats["perQuestion"][0]["mostChosenWrongOptionId"], str(self.wrong.pk))
