"""Root URL configuration.

Every feature app contributes its own routes; all are mounted under /api/. The
Django admin is available at /admin/ as the data editor.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("features.auth.urls")),
    path("api/", include("features.catalog.urls")),
    path("api/", include("features.courses.urls")),
    path("api/", include("features.scholarships.urls")),
    path("api/", include("features.dashboard.urls")),
    path("api/", include("features.home.urls")),
    path("api/", include("features.events.urls")),
    path("api/", include("features.competitions.urls")),
    path("api/", include("features.profile.urls")),
    path("api/", include("features.adminconsole.urls")),
]
