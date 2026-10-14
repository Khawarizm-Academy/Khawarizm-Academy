"""App config for the scholarships feature."""

from django.apps import AppConfig


class ScholarshipsConfig(AppConfig):
    name = "features.scholarships"
    label = "scholarships"
    verbose_name = "Scholarships"
    default_auto_field = "django.db.models.BigAutoField"
