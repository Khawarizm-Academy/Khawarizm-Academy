"""App config for the courses feature."""

from django.apps import AppConfig


class CoursesConfig(AppConfig):
    name = "features.courses"
    label = "courses"
    verbose_name = "Courses"
    default_auto_field = "django.db.models.BigAutoField"
