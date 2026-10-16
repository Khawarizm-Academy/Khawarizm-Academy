"""App config for the profile feature."""

from django.apps import AppConfig


class ProfileConfig(AppConfig):
    name = "features.profile"
    label = "profile"
    verbose_name = "Profile"
    default_auto_field = "django.db.models.BigAutoField"
