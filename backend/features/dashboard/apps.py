"""App config for the dashboard feature."""

from django.apps import AppConfig


class DashboardConfig(AppConfig):
    name = "features.dashboard"
    label = "dashboard"
    verbose_name = "Dashboard"
    default_auto_field = "django.db.models.BigAutoField"
