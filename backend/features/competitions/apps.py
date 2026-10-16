"""App config for the competitions feature."""

from django.apps import AppConfig


class CompetitionsConfig(AppConfig):
    name = "features.competitions"
    label = "competitions"
    verbose_name = "Competitions"
    default_auto_field = "django.db.models.BigAutoField"
