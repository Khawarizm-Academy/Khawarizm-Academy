"""Makes `features.common` an installed app so it can host shared commands."""

from django.apps import AppConfig


class CommonConfig(AppConfig):
    name = "features.common"
    label = "common"
    verbose_name = "Shared"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        # Model-write → cache-version invalidation (features/common/cache_invalidation.py).
        from features.common import cache_invalidation

        cache_invalidation.connect()
