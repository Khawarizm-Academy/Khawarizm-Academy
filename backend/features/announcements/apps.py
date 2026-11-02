"""Django app configuration for course announcements."""
from django.apps import AppConfig


class AnnouncementsConfig(AppConfig):
    name = "features.announcements"
    label = "announcements"
    verbose_name = "Course announcements"
    default_auto_field = "django.db.models.BigAutoField"
