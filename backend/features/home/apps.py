"""App config for the home feature."""

from django.apps import AppConfig


class HomeConfig(AppConfig):
    name = "features.home"
    label = "home"
    verbose_name = "Home"
    default_auto_field = "django.db.models.BigAutoField"
