"""Django admin registration for the catalog feature (categories + filters)."""

from __future__ import annotations

from django.contrib import admin

from features.catalog.models import Category, FilterGroup, FilterOption


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("slug", "label")
    search_fields = ("slug", "label")


class FilterOptionInline(admin.TabularInline):
    model = FilterOption
    extra = 1


@admin.register(FilterGroup)
class FilterGroupAdmin(admin.ModelAdmin):
    list_display = ("key", "label", "kind", "tone", "order", "is_active")
    list_editable = ("order", "is_active")
    list_filter = ("kind", "is_active")
    search_fields = ("key", "label")
    inlines = [FilterOptionInline]


@admin.register(FilterOption)
class FilterOptionAdmin(admin.ModelAdmin):
    list_display = ("group", "value", "label", "order", "is_active")
    list_filter = ("group", "is_active")
    search_fields = ("value", "label")
