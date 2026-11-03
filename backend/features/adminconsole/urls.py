"""Admin console routes, mounted under /api/ and gated to admins."""

from django.urls import include, path

from features.adminconsole import role_views, views

urlpatterns = [
    # Role manager statics must precede the UUID route below.
    path("admin/roles/catalog", role_views.role_catalog, name="admin-role-catalog"),
    path("admin/roles/reorder", role_views.reorder_roles, name="admin-role-reorder"),
    path("admin/roles", role_views.roles, name="admin-roles"),
    path("admin/roles/<uuid:role_id>/members", role_views.role_members, name="admin-role-members"),
    path(
        "admin/roles/<uuid:role_id>/members/<uuid:user_id>",
        role_views.role_member_detail,
        name="admin-role-member-detail",
    ),
    path("admin/roles/<uuid:role_id>", role_views.role_detail, name="admin-role-detail"),
    path("admin/users/<uuid:user_id>/roles", role_views.user_roles, name="admin-user-roles"),
    path("admin/audit", role_views.audit, name="admin-audit"),
    path("admin/overview", views.overview, name="admin-overview"),
    path("admin/users", views.users, name="admin-users"),
    path("admin/users/<uuid:user_id>", views.user_detail, name="admin-user-detail"),
    # Phase 12: legacy POST|PATCH /admin/users/<id>/role retired — role edits go
    # through /admin/roles/* and PUT /admin/users/<id>/roles.
    path("admin/users/bulk-roles", views.bulk_roles, name="admin-users-bulk-roles"),
    path(
        "admin/users/<uuid:user_id>/effective-permissions",
        views.user_effective_permissions,
        name="admin-user-effective-permissions",
    ),
    path("admin/sessions", views.sessions, name="admin-sessions"),
    path("admin/sessions/<uuid:session_id>/revoke", views.revoke_session, name="admin-session-revoke"),
    path("admin/analytics/logins", views.logins_series, name="admin-analytics-logins"),
    path("admin/analytics/devices", views.devices, name="admin-analytics-devices"),
    path("admin/events", views.events, name="admin-events"),
    # The maintenance job's HTTP surface (the command lives in features/common).
    path("admin/maintenance/cleanup", views.maintenance_cleanup, name="admin-maintenance-cleanup"),
    # The generic content editor: schema first so it never reads as a type key.
    path("admin/content/schema", views.content_schema, name="admin-content-schema"),
    path("admin/content/<str:type_key>", views.content_items, name="admin-content-items"),
    path("admin/content/<str:type_key>/<uuid:pk>", views.content_detail, name="admin-content-detail"),
    # Video hosting routes are owned by features/videohosting.console; paths and URL names unchanged.
    path("admin/", include("features.videohosting.console.urls")),
]
