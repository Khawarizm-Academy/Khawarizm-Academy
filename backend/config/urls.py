"""Root URL configuration.

The whole API is namespaced under /api/ by api.urls; the Django admin is
available at /admin/ for inspecting seeded data.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
