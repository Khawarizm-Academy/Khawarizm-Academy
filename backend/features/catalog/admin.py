"""Django admin registration for the catalog feature."""

from __future__ import annotations

from django.contrib import admin

from features.catalog.models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("slug", "label")
    search_fields = ("slug", "label")
