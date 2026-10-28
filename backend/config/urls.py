"""Root URL configuration.

Every feature app contributes its own routes; all are mounted under /api/. The
Django admin is available at /admin/ as the data editor.
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from config.views import healthz, readyz, root

urlpatterns = [
    path("", root),
    path("healthz", healthz),
    path("readyz", readyz),
    path("admin/", admin.site.urls),
    # The generated contract: schema first so `docs` never reads as a path
    # parameter — the same static-before-parameterized rule the features use.
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="schema-docs"),
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
    path("api/", include("features.videohosting.urls")),
]
