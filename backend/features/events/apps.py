"""App config for the events feature."""

from django.apps import AppConfig


class EventsConfig(AppConfig):
    name = "features.events"
    label = "events"
    verbose_name = "Events"
    default_auto_field = "django.db.models.BigAutoField"
