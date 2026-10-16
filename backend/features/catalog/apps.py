"""App config for the catalog feature."""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    name = "features.catalog"
    label = "catalog"
    verbose_name = "Catalog"
    default_auto_field = "django.db.models.BigAutoField"
