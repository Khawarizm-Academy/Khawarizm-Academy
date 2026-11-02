from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework import status

from features.common.choices import Role
from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseProblem, CourseProblemOption
from features.dashboard.models import Enrollment

from .models import Attempt, AttemptStatus, Option, Question, QuestionKind, Quiz, QuizKind, RevealPolicy


class QuizLearnerApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.student = make_user(email="quiz-learner@example.com", role=Role.STUDENT)
        self.course = make_course(slug="quiz-api-course", status="published")
        self.enrollment = Enrollment.objects.create(user=self.student, course=self.course, progress=100)
        self.quiz = Quiz.objects.create(
            course=self.course,
            kind=QuizKind.PRACTICE,
            title="Practice",
            is_published=True,
            max_attempts=2,
            reveal_policy=RevealPolicy.AFTER_SUBMIT,
        )
        self.question = Question.objects.create(
            quiz=self.quiz,
            kind=QuestionKind.SINGLE,
            prompt="Which option is correct?",
            explanation="Because the server says so.",
            hint="Think carefully.",
            points=2,
        )
        self.correct = Option.objects.create(question=self.question, label="A", is_correct=True, order=0)
        self.wrong = Option.objects.create(question=self.question, label="B", order=1)
        authenticate(self.client, self.student)

    def test_course_summary_and_active_attempt_never_include_answer_secrets(self):
        summary = self.client.get(f"/api/courses/{self.course.slug}/quizzes")
        self.assertEqual(summary.status_code, status.HTTP_200_OK)
        self.assertEqual(summary.data["items"][0]["id"], str(self.quiz.pk))
        self.assertEqual(summary.data["items"][0]["attemptsLeft"], 2)

        started = self.client.post(f"/api/quizzes/{self.quiz.pk}/attempts", {}, format="json")
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        self.assertEqual(started["Cache-Control"], "private, no-store")
        self.assertEqual(started.data["answers"], [])
        serialized = str(started.data)
        for secret in ("isCorrect", "explanation", "hint"):
            self.assertNotIn(secret, serialized)
        self.assertEqual(started.data["questions"][0]["id"], str(self.question.pk))

    def test_saved_answers_resume_and_submit_are_server_graded(self):
        attempt_data = self.client.post(f"/api/quizzes/{self.quiz.pk}/attempts", {}, format="json").data
        attempt_id = attempt_data["attemptId"]
        save = self.client.put(
            f"/api/attempts/{attempt_id}/answers",
            {"answers": [{"questionId": str(self.question.pk), "optionIds": [str(self.correct.pk)]}]},
            format="json",
        )
        self.assertEqual(save.status_code, status.HTTP_200_OK)
        resumed = self.client.get(f"/api/attempts/{attempt_id}")
        self.assertEqual(resumed.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resumed.data["answers"], [{"questionId": str(self.question.pk), "optionIds": [str(self.correct.pk)]}]
        )
        self.assertNotIn("explanation", str(resumed.data))

        submitted = self.client.post(f"/api/attempts/{attempt_id}/submit", {}, format="json")
        self.assertEqual(submitted.status_code, status.HTTP_200_OK)
        self.assertEqual(submitted.data["status"], AttemptStatus.SUBMITTED)
        self.assertEqual(submitted.data["result"]["percent"], 100)
        self.assertTrue(submitted.data["result"]["feedbackAvailable"])
        self.assertEqual(submitted.data["result"]["questions"][0]["correctOptionIds"], [str(self.correct.pk)])
        self.assertEqual(submitted.data["result"]["questions"][0]["explanation"], "Because the server says so.")

    def test_never_reveal_policy_never_serializes_answer_details(self):
        self.quiz.reveal_policy = RevealPolicy.NEVER
        self.quiz.save(update_fields=["reveal_policy"])
        attempt_data = self.client.post(f"/api/quizzes/{self.quiz.pk}/attempts", {}, format="json").data
        response = self.client.post(f"/api/attempts/{attempt_data['attemptId']}/submit", {}, format="json")
        result = response.data["result"]
        self.assertFalse(result["feedbackAvailable"])
        self.assertNotIn("questions", result)
        self.assertNotIn("correctOptionIds", str(result))
        self.assertNotIn("explanation", str(result))

    def test_overdue_attempt_is_expired_when_resumed(self):
        attempt = Attempt.objects.create(
            quiz=self.quiz,
            user=self.student,
            status=AttemptStatus.IN_PROGRESS,
            started_at=timezone.now() - timedelta(minutes=2),
            deadline_at=timezone.now() - timedelta(seconds=20),
            question_order=[str(self.question.pk)],
            option_order={str(self.question.pk): [str(self.correct.pk), str(self.wrong.pk)]},
            max_score=2,
        )
        response = self.client.get(f"/api/attempts/{attempt.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], AttemptStatus.EXPIRED)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, AttemptStatus.EXPIRED)

    def test_practice_check_returns_feedback_but_public_legacy_list_does_not(self):
        problem = CourseProblem.objects.create(
            problem_id="legacy-p1",
            prompt="Legacy prompt",
            correct_option_id="legacy-a",
            explanation="Legacy feedback",
            hint="Legacy hint",
        )
        CourseProblemOption.objects.create(problem=problem, option_id="legacy-a", label="A")
        CourseProblemOption.objects.create(problem=problem, option_id="legacy-b", label="B")
        listed = self.client.get("/api/problems").data["items"][0]
        self.assertNotIn("correctOptionId", listed)
        self.assertNotIn("explanation", listed)
        self.assertNotIn("hint", listed)
        checked = self.client.post("/api/problems/legacy-p1/check", {"optionIds": ["legacy-a"]}, format="json")
        self.assertEqual(checked.status_code, status.HTTP_200_OK)
        self.assertTrue(checked.data["correct"])
        self.assertEqual(checked.data["explanation"], "Legacy feedback")
        self.assertEqual(checked.data["hint"], "Legacy hint")

    def test_unenrolled_student_cannot_start_an_attempt(self):
        self.enrollment.delete()
        response = self.client.post(f"/api/quizzes/{self.quiz.pk}/attempts", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
