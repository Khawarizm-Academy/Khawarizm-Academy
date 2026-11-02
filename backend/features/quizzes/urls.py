"""Phase 6 learner and authoring quiz routes, mounted below /api/."""

from functools import wraps

from django.urls import include, path

from . import views


def _no_store(view):
    """Ensure private quiz/attempt responses are never cached, including errors."""

    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    return wrapped


urlpatterns = [
    path("", include("features.quizzes.studio_urls")),
    path("problems", views.problems_list, name="problems-list"),
    path("courses/<str:slug>/problems", views.course_problems, name="course-problems"),
    path("courses/<str:slug>/quizzes", _no_store(views.course_quizzes), name="course-quizzes"),
    path("quizzes/<uuid:quiz_id>/attempts", _no_store(views.start_quiz_attempt), name="quiz-attempt-start"),
    path("attempts/<uuid:attempt_id>", _no_store(views.quiz_attempt_detail), name="quiz-attempt-detail"),
    path("attempts/<uuid:attempt_id>/answers", _no_store(views.quiz_attempt_answers), name="quiz-attempt-answers"),
    path("attempts/<uuid:attempt_id>/submit", _no_store(views.submit_quiz_attempt), name="quiz-attempt-submit"),
    path("questions/<uuid:question_id>/check", _no_store(views.quiz_practice_check), name="quiz-practice-check"),
    path("problems/<str:problem_id>/check", _no_store(views.legacy_problem_check), name="legacy-problem-check"),
]
