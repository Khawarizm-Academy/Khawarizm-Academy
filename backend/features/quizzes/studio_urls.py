"""Phase 6 quiz authoring routes; mounted by the quizzes root URLConf."""

from functools import wraps

from django.urls import path

from . import studio_views


def _private(view):
    """Set no-store after DRF handles both normal responses and API exceptions."""

    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    return wrapped


urlpatterns = [
    path("studio/courses/<slug:slug>/quizzes", _private(studio_views.course_quizzes), name="studio-course-quizzes"),
    path("studio/quizzes/<uuid:quiz_id>", _private(studio_views.quiz_detail), name="studio-quiz-detail"),
    path("studio/quizzes/<uuid:quiz_id>/publish", _private(studio_views.publish_quiz), name="studio-quiz-publish"),
    path(
        "studio/quizzes/<uuid:quiz_id>/unpublish", _private(studio_views.unpublish_quiz), name="studio-quiz-unpublish"
    ),
    path(
        "studio/quizzes/<uuid:quiz_id>/questions", _private(studio_views.create_question), name="studio-quiz-questions"
    ),
    path(
        "studio/quizzes/<uuid:quiz_id>/questions/reorder",
        _private(studio_views.reorder_questions),
        name="studio-quiz-question-reorder",
    ),
    path("studio/quizzes/<uuid:quiz_id>/import", _private(studio_views.import_questions), name="studio-quiz-import"),
    path("studio/quizzes/<uuid:quiz_id>/stats", _private(studio_views.quiz_stats), name="studio-quiz-stats"),
    path("studio/quizzes/<uuid:quiz_id>/attempts", _private(studio_views.quiz_attempts), name="studio-quiz-attempts"),
    path(
        "studio/quizzes/<uuid:quiz_id>/results.csv",
        _private(studio_views.quiz_results_csv),
        name="studio-quiz-results-csv",
    ),
    path(
        "studio/quizzes/<uuid:quiz_id>/extra-attempts",
        _private(studio_views.extra_attempts),
        name="studio-quiz-extra-attempts",
    ),
    path("studio/questions/<uuid:question_id>", _private(studio_views.question_detail), name="studio-question-detail"),
]
