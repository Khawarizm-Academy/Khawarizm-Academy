"""App configuration for centralized access control."""

from django.apps import AppConfig


class AccessConfig(AppConfig):
    name = "features.access"
    label = "access"
    verbose_name = "Access control"
    default_auto_field = "django.db.models.BigAutoField"
