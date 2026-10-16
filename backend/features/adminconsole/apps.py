"""App config for the admin console feature (staff-only analytics API)."""

from django.apps import AppConfig


class AdminConsoleConfig(AppConfig):
    name = "features.adminconsole"
    label = "adminconsole"
    verbose_name = "Admin Console"
    default_auto_field = "django.db.models.BigAutoField"
