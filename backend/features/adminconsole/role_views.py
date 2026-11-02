"""Phase 2 role-manager HTTP endpoints.

Handlers resolve/authenticate the caller, validate only transport concerns, call
one access service, and hand pre-annotated rows to serializers.
"""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers as ser
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from features.access import registry, services
from features.access import serializers as access_serializers
from features.access.permissions import perm
from features.adminconsole import serializers as admin_serializers
from features.auth.authentication import AccessTokenAuthentication
from features.common.errors import InvalidParameter, RoleHasMembers
from features.common.http_cache import etag_response
from features.common.throttling import scoped_throttle

PAGE_SIZE = 20


def _method_permission(methods: dict[str, str]) -> type[BasePermission]:
    """Build a permission class for handlers that expose read and write verbs."""
    classes = {method: perm(key) for method, key in methods.items()}

    class MethodPermission(BasePermission):
        def has_permission(self, request, view) -> bool:
            return classes[request.method]().has_permission(request, view)

    MethodPermission.__name__ = "RoleManagerMethodPermission"
    return MethodPermission


RoleCollectionPermission = _method_permission({"GET": "roles.view", "POST": "roles.manage"})
RoleDetailPermission = _method_permission({"GET": "roles.view", "PATCH": "roles.manage", "DELETE": "roles.manage"})
RoleMembersPermission = _method_permission({"GET": "roles.view", "POST": "users.assign_roles"})


def _body(request) -> dict[str, Any]:
    """Return an object body; services own field validation and error wording."""
    data = request.data
    if not isinstance(data, dict):
        raise InvalidParameter()
    return data


def _page(request) -> int:
    raw = request.query_params.get("page", "1")
    try:
        value = int(raw)
    except TypeError, ValueError:
        raise InvalidParameter() from None
    return max(value, 1)


def _mark_role(role: Any, actor: Any) -> Any:
    """Attach non-persistent presentation annotations before serialization."""
    if not hasattr(role, "member_count"):
        role.member_count = 0
    role.can_manage = services.can_manage_role(actor, role)
    return role


def _role_payload(role: Any, actor: Any) -> dict[str, Any]:
    return access_serializers.role_row(_mark_role(role, actor), actor)


def _role_items(roles: list[Any], actor: Any) -> list[dict[str, Any]]:
    return [_role_payload(role, actor) for role in roles]


def _user_payload(user: Any, role_map: dict[Any, list[Any]]) -> dict[str, Any]:
    roles = role_map.get(user.pk, role_map.get(str(user.pk), []))
    return admin_serializers.user_row(user, roles=roles)


def _role_member_error(exc: RoleHasMembers) -> Response:
    """Keep the role deletion conflict machine-readable, including its count."""
    return Response(
        {"detail": str(exc.detail), "code": exc.default_code, "count": exc.count},
        status=status.HTTP_409_CONFLICT,
    )


@extend_schema(
    operation_id="admin_roles_catalog",
    summary="Permission groups, role templates, and supported colors.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, perm("roles.view")])
@scoped_throttle("admin_burst")
def role_catalog(request):
    """Return the code-defined catalog with private ETag revalidation."""
    data = {
        "groups": registry.grouped_permission_catalog(),
        "templates": registry.template_catalog(),
        "colors": list(registry.PERMISSION_COLORS),
    }
    return etag_response(request, data, public=False)


@extend_schema(
    methods=["GET"],
    operation_id="admin_roles_list",
    summary="List roles ordered by hierarchy.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="admin_roles_create",
    summary="Create a role or materialize a role template.",
    request=inline_serializer(
        "AdminRoleCreateRequest",
        fields={
            "name": ser.CharField(),
            "slug": ser.CharField(required=False),
            "color": ser.CharField(),
            "description": ser.CharField(required=False, allow_blank=True),
            "permissions": ser.ListField(child=ser.CharField(), required=False),
            "templateKey": ser.CharField(required=False),
        },
    ),
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, RoleCollectionPermission])
@scoped_throttle("admin_burst")
def roles(request):
    """List roles or create one through the access service."""
    if request.method == "GET":
        return Response({"items": _role_items(services.list_roles(), request.user)})

    data = _body(request)
    template_key = data.get("templateKey")
    if template_key:
        overrides = {key: data[key] for key in ("name", "slug", "color", "description") if key in data}
        role = services.create_role_from_template(request.user, template_key, overrides, request=request)
    else:
        role = services.create_role(request.user, data, request=request)
    return Response(_role_payload(role, request.user), status=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="admin_roles_reorder",
    summary="Reorder editable roles from strongest to weakest.",
    request=inline_serializer(
        "AdminRoleReorderRequest",
        fields={"orderedIds": ser.ListField(child=ser.UUIDField())},
    ),
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, perm("roles.manage")])
@scoped_throttle("admin_burst")
def reorder_roles(request):
    data = _body(request)
    items = services.reorder_roles(request.user, data.get("orderedIds"), request=request)
    return Response({"items": _role_items(items, request.user)})


@extend_schema(
    methods=["GET"],
    operation_id="admin_role_read",
    summary="Read one role.",
    parameters=[OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="admin_role_update",
    summary="Update a role with optimistic concurrency.",
    parameters=[OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=inline_serializer(
        "AdminRolePatchRequest",
        fields={
            "name": ser.CharField(required=False),
            "color": ser.CharField(required=False),
            "description": ser.CharField(required=False, allow_blank=True),
            "permissions": ser.ListField(child=ser.CharField(), required=False),
            "expectedUpdatedAt": ser.DateTimeField(),
        },
    ),
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT), 409: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="admin_role_delete",
    summary="Delete a role, optionally reassigning its members.",
    parameters=[
        OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        OpenApiParameter("reassignTo", OpenApiTypes.UUID, OpenApiParameter.QUERY, required=False),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT), 409: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, RoleDetailPermission])
@scoped_throttle("admin_burst")
def role_detail(request, role_id):
    """Read or mutate one role; access services enforce hierarchy and locks."""
    role = services.get_role(role_id)
    if request.method == "GET":
        return Response(_role_payload(role, request.user))
    if request.method == "PATCH":
        data = _body(request)
        if "expectedUpdatedAt" not in data:
            raise InvalidParameter()
        updated = services.update_role(request.user, role, data, request=request)
        updated.member_count = getattr(role, "member_count", 0)
        return Response(_role_payload(updated, request.user))
    try:
        services.delete_role(
            request.user,
            role,
            reassign_to=request.query_params.get("reassignTo"),
            request=request,
        )
    except RoleHasMembers as exc:
        return _role_member_error(exc)
    return Response({"deleted": True})


@extend_schema(
    methods=["GET"],
    operation_id="admin_role_members_list",
    summary="List members of a role.",
    parameters=[
        OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="admin_role_members_add",
    summary="Assign a role to multiple users with per-user outcomes.",
    parameters=[OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=inline_serializer(
        "AdminRoleMembersAddRequest",
        fields={"userIds": ser.ListField(child=ser.UUIDField())},
    ),
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, RoleMembersPermission])
@scoped_throttle("admin_burst")
def role_members(request, role_id):
    """Page role members or run the assignment batch."""
    if request.method == "POST":
        data = _body(request)
        results = services.bulk_add_role_members(request.user, role_id, data.get("userIds"), request=request)
        return Response({"results": results})

    page = _page(request)
    total, users, role_map = services.role_members_page(
        role_id,
        query=request.query_params.get("q", ""),
        page=page,
        page_size=PAGE_SIZE,
        actor=request.user,
    )
    return Response(
        {
            "total": total,
            "page": page,
            "pageSize": PAGE_SIZE,
            "results": [_user_payload(user, role_map) for user in users],
        }
    )


@extend_schema(
    operation_id="admin_role_member_remove",
    summary="Remove one explicit role assignment.",
    parameters=[
        OpenApiParameter("role_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
        OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["DELETE"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, perm("users.assign_roles")])
@scoped_throttle("admin_burst")
def role_member_detail(request, role_id, user_id):
    services.revoke_role(request.user, user_id, role_id, request=request)
    return Response({"removed": True})


@extend_schema(
    operation_id="admin_user_roles_replace",
    summary="Replace a user's explicit role assignments.",
    parameters=[OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=inline_serializer(
        "AdminUserRolesReplaceRequest",
        fields={"roleIds": ser.ListField(child=ser.UUIDField())},
    ),
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["PUT"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, perm("users.assign_roles")])
@scoped_throttle("admin_burst")
def user_roles(request, user_id):
    data = _body(request)
    user = services.assign_roles(request.user, user_id, data.get("roleIds"), request=request)
    role_map = services.user_role_map([user.pk], request.user)
    return Response(_user_payload(user, role_map))


@extend_schema(
    operation_id="admin_audit_list",
    summary="Page and filter role and assignment audit events.",
    parameters=[
        OpenApiParameter("action", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("actor", OpenApiTypes.UUID, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("targetType", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("targetId", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated, perm("audit.view")])
@scoped_throttle("admin_burst")
def audit(request):
    page = _page(request)
    total, rows = services.audit_page(
        action=request.query_params.get("action", ""),
        actor_id=request.query_params.get("actor", ""),
        target_type=request.query_params.get("targetType", ""),
        target_id=request.query_params.get("targetId", ""),
        page=page,
        page_size=PAGE_SIZE,
    )
    results = []
    for row in rows:
        actor = getattr(row, "actor", None)
        results.append(
            {
                "id": str(row.pk),
                "action": row.action,
                "actor": (
                    {
                        "id": str(actor.pk),
                        "name": actor.full_name or actor.email,
                        "email": actor.email,
                    }
                    if actor is not None
                    else None
                ),
                "targetType": row.target_type,
                "targetId": row.target_id,
                "targetName": getattr(row, "target_name", None),
                "detail": row.detail,
                "createdAt": row.created_at.isoformat(),
            }
        )
    return Response({"total": total, "page": page, "pageSize": PAGE_SIZE, "results": results})
