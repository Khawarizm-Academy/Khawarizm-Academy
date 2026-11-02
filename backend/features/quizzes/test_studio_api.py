from __future__ import annotations

from django.test import override_settings
from django.urls import include, path, reverse
from rest_framework import status

from features.access.models import AccessRole, RoleAssignment
from features.access.registry import PERMISSION_COLORS
from features.common.choices import Role
from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseLesson, CourseModule, CourseStaff

from .models import Answer, Attempt, AttemptStatus, Option, Question, QuestionKind, Quiz, QuizKind

urlpatterns = [path("api/", include("features.quizzes.studio_urls"))]


@override_settings(ROOT_URLCONF=__name__)
class QuizStudioApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.actor = make_user(email="studio-quiz-author@example.com", role=Role.INSTRUCTOR)
        self.course = make_course(slug="studio-quiz-course", status="published")
        CourseStaff.objects.create(course=self.course, user=self.actor, kind="owner")
        authenticate(self.client, self.actor)

    def quiz(self, **kwargs):
        values = {"course": self.course, "created_by": self.actor, "kind": QuizKind.PRACTICE, "title": "Practice"}
        values.update(kwargs)
        return Quiz.objects.create(**values)

    def question(self, quiz, prompt="2 + 2?"):
        question = Question.objects.create(quiz=quiz, kind=QuestionKind.SINGLE, prompt=prompt)
        Option.objects.create(question=question, label="4", is_correct=True, order=0)
        Option.objects.create(question=question, label="5", order=1)
        return question

    def test_routes_require_auth_and_reject_unknown_fields(self):
        self.client.credentials()
        response = self.client.get(reverse("studio-course-quizzes", args=[self.course.slug]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        authenticate(self.client, self.actor)
        response = self.client.post(
            reverse("studio-course-quizzes", args=[self.course.slug]), {"title": "x", "wat": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertIn("غير معروفة", str(response.data))

    def test_create_defaults_and_lesson_ownership(self):
        response = self.client.post(
            reverse("studio-course-quizzes", args=[self.course.slug]), {"title": "Exam", "kind": "exam"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["revealPolicy"], "after_close")
        self.assertEqual(response.data["unlockProgressPercent"], 80)
        module = CourseModule.objects.create(course=self.course, module_id="m1", title="Module")
        lesson = CourseLesson.objects.create(module=module, lesson_id="l1", title="Lesson", kind="quiz")
        response = self.client.post(
            reverse("studio-course-quizzes", args=[self.course.slug]),
            {"title": "Lesson", "kind": "lesson_quiz", "lessonId": str(lesson.pk)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_crud_delete_conflict_and_publish_validation(self):
        quiz = self.quiz()
        detail = self.client.get(reverse("studio-quiz-detail", args=[quiz.pk]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail["Cache-Control"], "private, no-store")
        response = self.client.post(reverse("studio-quiz-publish", args=[quiz.pk]))
        self.assertEqual(response.status_code, 422)
        quiz.refresh_from_db()
        self.assertFalse(quiz.is_published)
        self.question(quiz)
        response = self.client.post(reverse("studio-quiz-publish", args=[quiz.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quiz.refresh_from_db()
        self.assertTrue(quiz.is_published)
        Attempt.objects.create(quiz=quiz, user=self.actor, status=AttemptStatus.SUBMITTED, started_at=quiz.created_at)
        response = self.client.delete(reverse("studio-quiz-detail", args=[quiz.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "has_attempts")

    def test_attempt_sensitive_settings_and_questions_are_protected(self):
        quiz = self.quiz(is_published=True)
        question = self.question(quiz)
        attempt = Attempt.objects.create(
            quiz=quiz,
            user=self.actor,
            status=AttemptStatus.IN_PROGRESS,
            started_at=quiz.created_at,
            question_order=[str(question.pk)],
            option_order={str(question.pk): [str(option.pk) for option in question.options.all()]},
        )
        response = self.client.patch(
            reverse("studio-quiz-detail", args=[quiz.pk]), {"revealPolicy": "never"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(response.data["code"], "has_attempts")
        response = self.client.delete(reverse("studio-question-detail", args=[question.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertTrue(Question.objects.filter(pk=question.pk).exists())
        self.assertTrue(Attempt.objects.filter(pk=attempt.pk).exists())

    def test_assistant_can_grant_attempts_without_quiz_edit_permission(self):
        from features.dashboard.models import Enrollment

        assistant = make_user(email="quiz-assistant@example.com", role=Role.STUDENT)
        student = make_user(email="quiz-grant-student@example.com", role=Role.STUDENT)
        role = AccessRole.objects.create(
            slug="quiz-assistant",
            name="Quiz assistant",
            color=PERMISSION_COLORS[0],
            position=10,
            permissions=["quizzes.reset_attempts", "quizzes.results_own"],
        )
        RoleAssignment.objects.create(user=assistant, role=role)
        CourseStaff.objects.create(course=self.course, user=assistant, kind="assistant")
        Enrollment.objects.create(user=student, course=self.course, progress=100)
        quiz = self.quiz()
        authenticate(self.client, assistant)
        response = self.client.post(
            reverse("studio-quiz-extra-attempts", args=[quiz.pk]),
            {"userId": str(student.pk), "count": 1, "note": "approved"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(response.data["extra"], 1)

    def test_question_update_uses_owning_quiz_and_reports_previous_answers(self):
        quiz = self.quiz()
        other = self.quiz(title="Other")
        question = self.question(quiz)
        other_question = self.question(other, "Other")
        Answer.objects.create(
            attempt=Attempt.objects.create(
                quiz=quiz, user=self.actor, status=AttemptStatus.SUBMITTED, started_at=quiz.created_at
            ),
            question=question,
        )
        response = self.client.put(
            reverse("studio-question-detail", args=[question.pk]),
            {"kind": "single", "prompt": "Updated", "options": [{"label": "yes", "isCorrect": True}, {"label": "no"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["previousAnswerCount"], 1)
        response = self.client.post(
            reverse("studio-quiz-question-reorder", args=[other.pk]), {"orderedIds": [str(question.pk)]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Question.objects.filter(pk=other_question.pk, quiz=other).exists())

    def test_import_dry_run_commit_and_error_report(self):
        quiz = self.quiz()
        payload = {
            "dryRun": True,
            "rows": [
                {"prompt": "valid", "kind": "single", "options": [{"label": "a", "isCorrect": True}, {"label": "b"}]},
                {"prompt": "bad", "kind": "single", "options": []},
            ],
        }
        response = self.client.post(reverse("studio-quiz-import", args=[quiz.pk]), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["dryRun"])
        self.assertEqual(response.data["committed"], 0)
        self.assertEqual(len(response.data["errors"]), 1)
        response = self.client.post(
            reverse("studio-quiz-import", args=[quiz.pk]),
            {"dryRun": False, "rows": [payload["rows"][0]]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["committed"], 1)
        self.assertEqual(quiz.questions.count(), 1)

    def test_attempt_pagination_and_csv_formula_neutralization(self):
        quiz = self.quiz()
        user = make_user(email="formula@example.com", full_name="=formula")
        Attempt.objects.create(
            quiz=quiz, user=user, status=AttemptStatus.SUBMITTED, started_at=quiz.created_at, percent=90, passed=True
        )
        response = self.client.get(reverse("studio-quiz-attempts", args=[quiz.pk]), {"page": 1, "pageSize": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pageSize"], 1)
        csv_response = self.client.get(reverse("studio-quiz-results-csv", args=[quiz.pk]))
        self.assertEqual(csv_response.status_code, status.HTTP_200_OK)
        body = b"".join(csv_response.streaming_content).decode()
        self.assertIn("'=formula", body)
        self.assertNotIn(",=formula@example.com,", body)
