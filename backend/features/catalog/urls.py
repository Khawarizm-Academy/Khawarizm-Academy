"""Catalog routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.catalog import views

urlpatterns = [
    path("catalog", views.catalog_list, name="catalog-list"),
    path("catalog/filters", views.catalog_filters_view, name="catalog-filters"),
    path("catalog/<str:slug>", views.catalog_detail, name="catalog-detail"),
]
