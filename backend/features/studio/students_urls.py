"""Private Phase 10.4 Studio roster, learner-detail, and note routes."""

from functools import wraps

from django.urls import path

from features.studio import students_views


def _private(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = students_views.NO_STORE
        return response

    return wrapped


urlpatterns = [
    path("studio/students/courses", _private(students_views.student_courses), name="studio-student-courses"),
    path("studio/students", _private(students_views.students), name="studio-students"),
    path("studio/students.csv", _private(students_views.students_csv), name="studio-students-csv"),
    path(
        "studio/students/<uuid:student_id>",
        _private(students_views.student_detail_view),
        name="studio-student-detail",
    ),
    path(
        "studio/students/<uuid:student_id>/notes",
        _private(students_views.student_notes),
        name="studio-student-notes",
    ),
    path(
        "studio/students/<uuid:student_id>/nudge",
        _private(students_views.student_nudge),
        name="studio-student-nudge",
    ),
    path(
        "studio/students/<uuid:student_id>/extra-attempt",
        _private(students_views.student_extra_attempt),
        name="studio-student-extra-attempt",
    ),
]
