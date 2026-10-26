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

    def ready(self):
        # Dev advisory: a lagging WSL clock fails every sign-in with a bare
        # 401 — call it out at server start so the fix is one line away.
        # RUN_MAIN=true marks the autoreloader's serving process, so the
        # advisory prints once, not once per reload parent.
        import os
        import sys

        from features.auth import clock

        if "runserver" in sys.argv and os.environ.get("RUN_MAIN") == "true":
            clock.warn_background()
