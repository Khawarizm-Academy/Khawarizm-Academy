"""App config for the auth feature.

The folder is ``features/auth`` but the app label is ``accounts`` so it never
collides with Django's built-in ``django.contrib.auth``.
"""

from django.apps import AppConfig


class AuthConfig(AppConfig):
    name = "features.auth"
    label = "accounts"
    verbose_name = "Auth & Accounts"
    default_auto_field = "django.db.models.BigAutoField"
