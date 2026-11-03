"""Access-control policy and mutations; no resource feature models are imported here."""

from __future__ import annotations

import ipaddress
import math
import re
import sys
import uuid
from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Max, Q, Subquery, When
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify

from features.access.registry import (
    OWN_KINDS,
    PERMISSION_COLORS,
    PERMISSION_KEYS,
    PERMISSIONS,
    ROLE_TEMPLATES,
    SYSTEM_ROLE_SPECS,
    expand_permission_keys,
    validate_permission_keys,
)
from features.common.choices import AuditAction, Role
from features.common.errors import Conflict, InvalidParameter, NotFound, PermissionDenied, RoleHasMembers

_ROLE_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,38}$")
_ACCESS_CACHE_ATTR = "_access_control_snapshot"
_REDACTED_AUDIT_KEYS = {
    "password",
    "token",
    "accesstoken",
    "refreshtoken",
    "secret",
    "apikey",
    "credential",
    "authorization",
    "privatekey",
}


def _model_classes(apps=None):
    """Resolve live models at call time; migration callers may inject historical models."""
    if apps is not None:
        user_label, user_name = settings.AUTH_USER_MODEL.split(".", 1)
        return (
            apps.get_model("access", "AccessRole"),
            apps.get_model("access", "RoleAssignment"),
            apps.get_model("access", "AuditEvent"),
            apps.get_model(user_label, user_name),
        )

    from features.access.models import AccessRole, AuditEvent, RoleAssignment

    return AccessRole, RoleAssignment, AuditEvent, get_user_model()


def _is_authenticated(user: Any) -> bool:
    state = getattr(user, "_state", None)
    return bool(
        user is not None
        and getattr(user, "is_authenticated", False)
        and getattr(user, "pk", None) is not None
        and not getattr(state, "adding", False)
    )


def _clear_permission_cache(user: Any) -> None:
    if user is None or not hasattr(user, "__dict__"):
        return
    user.__dict__.pop(_ACCESS_CACHE_ATTR, None)
    user.__dict__.pop("_effective_permissions_cache", None)
    user.__dict__.pop("_access_roles_cache", None)
    user.__dict__.pop("_access_highest_position_cache", None)


def _access_snapshot(user: Any) -> tuple[tuple[Any, ...], frozenset[str]]:
    """Load assignments plus the implicit default in at most two queries."""
    if not _is_authenticated(user):
        return (), frozenset()

    cached = user.__dict__.get(_ACCESS_CACHE_ATTR)
    if cached is not None:
        return cached

    AccessRole, RoleAssignment, _AuditEvent, _User = _model_classes()
    assigned_roles = [
        assignment.role
        for assignment in RoleAssignment.objects.filter(user_id=user.pk)
        .select_related("role")
        .order_by("-role__position", "role__name", "role__slug")
    ]
    default_role = AccessRole.objects.filter(is_default=True).first()

    roles_by_id = {role.pk: role for role in assigned_roles}
    if default_role is not None:
        roles_by_id.setdefault(default_role.pk, default_role)
    roles = tuple(sorted(roles_by_id.values(), key=lambda role: (-role.position, role.name, role.slug)))

    keys: set[str] = set()
    for role in roles:
        # Writes are validated, but fail closed if a manual SQL edit bypassed them.
        role_keys = role.permissions if isinstance(role.permissions, list) else []
        keys.update(key for key in role_keys if isinstance(key, str) and key in PERMISSIONS)
    # Legacy compatibility bridge for old/staff-only accounts and Django admin.
    if getattr(user, "is_admin", False):
        keys.add("administrator")

    effective = expand_permission_keys(list(keys)) if keys else frozenset()
    snapshot = (roles, effective)
    user.__dict__[_ACCESS_CACHE_ATTR] = snapshot
    user.__dict__["_access_roles_cache"] = roles
    user.__dict__["_effective_permissions_cache"] = effective
    return snapshot


def effective_permissions(user: Any) -> frozenset[str]:
    """Return the user's effective permissions; anonymous users have none."""
    return _access_snapshot(user)[1]


def effective_roles(user: Any) -> tuple[Any, ...]:
    """Return explicit roles plus the implicit default, ordered by hierarchy."""
    return _access_snapshot(user)[0]


def has_perm(user: Any, key: str) -> bool:
    """Check one catalog key, surfacing typos in development and tests."""
    if key not in PERMISSIONS:
        if _strict_permission_checks():
            raise ValueError(f"Unknown permission key: {key}")
        return False
    # The legacy admin bridge is an unconditional full-catalog grant; avoid
    # loading role rows merely to answer a single permission check.
    if getattr(user, "is_admin", False):
        return True
    return key in effective_permissions(user)


def has_object_perm(user: Any, key: str, kinds: Sequence[str] | set[str]) -> bool:
    """Check an object permission using caller-supplied ownership kinds.

    CourseStaff lookups stay in their owning feature; this function only knows
    the registry's data-driven permission-to-kind matrix.
    """
    if key not in PERMISSIONS:
        return has_perm(user, key)  # preserve the debug/test typo behavior
    granted = effective_permissions(user)
    if key not in granted:
        return False

    any_key = key.removesuffix("_own") + "_any" if key.endswith("_own") else None
    if any_key and any_key in granted:
        return True
    allowed_kinds = OWN_KINDS.get(key)
    if allowed_kinds is None:
        # Self-owned non-course resources must add their own identity check in
        # the owning feature; never treat an unmapped *_own key as global.
        return not key.endswith("_own")
    return bool(set(kinds or ()) & allowed_kinds)


def highest_position(user: Any) -> int | float:
    """Return the highest explicit role position (default=0, admin=infinity)."""
    if not _is_authenticated(user):
        return 0
    cached = user.__dict__.get("_access_highest_position_cache")
    if cached is not None:
        return cached
    if getattr(user, "is_admin", False) or "administrator" in effective_permissions(user):
        user.__dict__["_access_highest_position_cache"] = math.inf
        return math.inf

    _AccessRole, RoleAssignment, _AuditEvent, _User = _model_classes()
    position = RoleAssignment.objects.filter(user_id=user.pk).aggregate(value=Max("role__position"))["value"] or 0
    user.__dict__["_access_highest_position_cache"] = position
    return position


def can_manage_role(actor: Any, role: Any) -> bool:
    """Enforce roles.manage, strict hierarchy, and the system-admin lock."""
    if not has_perm(actor, "roles.manage"):
        return False
    is_administrator = has_perm(actor, "administrator")
    if role.slug == "admin":
        return is_administrator
    return is_administrator or highest_position(actor) > role.position


def can_grant(actor: Any, keys: Sequence[str] | set[str]) -> bool:
    """An actor can only grant permissions they effectively hold."""
    try:
        requested = validate_permission_keys(list(keys))
    except TypeError, ValueError:
        return False
    if has_perm(actor, "administrator"):
        return True
    held = effective_permissions(actor)
    return all(key in held for key in requested)


def _strict_permission_checks() -> bool:
    return bool(
        settings.DEBUG
        or getattr(settings, "TESTING", False)
        or "test" in sys.argv
        or "pytest" in sys.modules
        or any("pytest" in argument for argument in sys.argv)
    )


def _lock_role_mutation_guard(actor: Any = None) -> None:
    """Serialize role mutations that can affect the last administrator."""
    AccessRole, _RoleAssignment, _AuditEvent, UserModel = _model_classes()
    AccessRole.objects.select_for_update().get(slug="admin")
    if _is_authenticated(actor):
        try:
            actor.refresh_from_db(fields=["role", "is_staff"])
        except UserModel.DoesNotExist as exc:
            raise PermissionDenied("تعذّر التحقق من صلاحيات المنفّذ.") from exc
        _clear_permission_cache(actor)


def _raise_invalid(message: str) -> None:
    raise InvalidParameter(message)


def _role_by_id(role_or_id: Any, *, using: str | None = None, lock: bool = False):
    AccessRole, _RoleAssignment, _AuditEvent, _User = _model_classes()
    queryset = AccessRole.objects.using(using) if using else AccessRole.objects.all()
    if lock:
        queryset = queryset.select_for_update()
    role_id = getattr(role_or_id, "pk", role_or_id)
    try:
        return queryset.get(pk=role_id)
    except (AccessRole.DoesNotExist, ValueError, TypeError, ValidationError) as exc:
        raise NotFound("الدور المطلوب غير موجود.") from exc


def _actor_is_administrator(actor: Any) -> bool:
    return has_perm(actor, "administrator")


def _require_manage(actor: Any, role: Any | None = None) -> None:
    if role is None:
        if not has_perm(actor, "roles.manage"):
            raise PermissionDenied("لا تملك صلاحية إدارة الأدوار.")
    elif not can_manage_role(actor, role):
        raise PermissionDenied("لا يمكنك إدارة دور أعلى من دورك.")


def _position_below_actor(actor: Any) -> int:
    top = highest_position(actor)
    if math.isinf(top):
        AccessRole, _RoleAssignment, _AuditEvent, _User = _model_classes()
        current_max = AccessRole.objects.exclude(slug="admin").aggregate(value=Max("position"))["value"] or 0
        return min(999, current_max + 1)
    position = int(top) - 1
    if position < 0:
        raise PermissionDenied("لا يمكن إنشاء دور أعلى من دورك.")
    return position


def _validate_position(actor: Any, position: Any) -> int:
    if isinstance(position, bool):
        _raise_invalid("ترتيب الدور غير صالح.")
    try:
        value = int(position)
    except (TypeError, ValueError) as exc:
        raise InvalidParameter("ترتيب الدور غير صالح.") from exc
    if value < 0 or value >= 1000:
        _raise_invalid("يجب أن يكون ترتيب الدور بين 0 و999.")
    if not _actor_is_administrator(actor) and value >= highest_position(actor):
        raise PermissionDenied("لا يمكن إنشاء دور مساوٍ لدورك أو أعلى منه.")
    return value


def _suggest_slug(base: str, *, using: str | None = None) -> str:
    AccessRole, _RoleAssignment, _AuditEvent, _User = _model_classes()
    candidate = slugify(base).lower().strip("-")
    if not candidate:
        candidate = f"role-{uuid.uuid4().hex[:8]}"
    candidate = candidate[:39].rstrip("-")
    if len(candidate) < 2:
        candidate = f"{candidate or 'r'}-1"
    manager = AccessRole.objects.using(using) if using else AccessRole.objects
    base_candidate = candidate
    suffix = 2
    while manager.filter(slug=candidate).exists():
        tail = f"-{suffix}"
        candidate = f"{base_candidate[: 39 - len(tail)].rstrip('-')}{tail}"
        suffix += 1
    return candidate


def _validate_slug(slug: Any) -> str:
    if not isinstance(slug, str) or not _ROLE_SLUG_RE.fullmatch(slug):
        _raise_invalid("معرّف الدور يجب أن يتكون من أحرف صغيرة وأرقام وشرطات فقط.")
    return slug


def _role_data(role: Any) -> dict[str, Any]:
    return {
        "slug": role.slug,
        "name": role.name,
        "description": role.description,
        "color": role.color,
        "position": role.position,
        "permissions": list(role.permissions),
    }


def _is_sensitive_audit_key(key: Any) -> bool:
    normalized = re.sub(r"[^a-z0-9]", "", str(key).lower())
    markers = ("password", "secret", "token", "credential", "authorization", "cookie", "privatekey", "apikey", "jwt")
    return normalized in _REDACTED_AUDIT_KEYS or any(marker in normalized for marker in markers)


def _safe_detail(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _safe_detail(item) for key, item in value.items() if not _is_sensitive_audit_key(key)}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_safe_detail(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _request_ip(request: Any) -> str | None:
    if request is None or not hasattr(request, "META"):
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    candidate = forwarded.split(",", 1)[0].strip() if forwarded else request.META.get("REMOTE_ADDR", "")
    try:
        return str(ipaddress.ip_address(candidate)) if candidate else None
    except ValueError:
        return None


def record_audit(
    action: str,
    *,
    actor: Any = None,
    target_type: str,
    target_id: Any,
    detail: Mapping[str, Any] | None = None,
    request: Any = None,
    using: str | None = None,
):
    """Append one safe audit row; request and IP are optional for tests/jobs."""
    _AccessRole, _RoleAssignment, AuditEvent, _User = _model_classes()
    manager = AuditEvent.objects.using(using) if using else AuditEvent.objects
    return manager.create(
        action=action,
        actor=actor if _is_authenticated(actor) else None,
        target_type=str(target_type)[:40],
        target_id=str(target_id)[:64],
        detail=_safe_detail(detail or {}),
        ip_address=_request_ip(request),
    )


def _permission_list(role: Any) -> list[str]:
    try:
        return validate_permission_keys(role.permissions)
    except ValueError as exc:
        raise InvalidParameter("يحتوي الدور على صلاحيات غير صالحة.") from exc


def _save_role(role: Any) -> Any:
    try:
        role.save()
    except (IntegrityError, ValueError, ValidationError) as exc:
        raise InvalidParameter("تعذّر حفظ الدور؛ تحقق من المعرّف والصلاحيات.") from exc
    return role


@transaction.atomic
def create_role(
    actor: Any,
    data: Mapping[str, Any] | None = None,
    *,
    request: Any = None,
    **overrides: Any,
):
    """Create a role after hierarchy, catalog, color, and grant validation."""
    _lock_role_mutation_guard(actor)
    values = dict(data or {})
    values.update(overrides)
    allowed_fields = {"name", "slug", "color", "description", "permissions", "position", "template_key", "templateKey"}
    unknown_fields = sorted(set(values) - allowed_fields)
    if unknown_fields:
        _raise_invalid(f"حقول غير معروفة: {', '.join(unknown_fields)}")
    template_key = values.get("template_key", values.get("templateKey", "")) or ""
    template = ROLE_TEMPLATES.get(template_key) if template_key else None
    if template_key and template is None:
        _raise_invalid("قالب الدور غير معروف.")
    _require_manage(actor)

    name_value = values.get("name", (template or {}).get("name", ""))
    if not isinstance(name_value, str) or not name_value.strip() or len(name_value.strip()) > 60:
        _raise_invalid("اسم الدور مطلوب وبحد أقصى 60 حرفًا.")
    name = name_value.strip()
    description_value = values.get("description", (template or {}).get("description", ""))
    if not isinstance(description_value, str) or len(description_value.strip()) > 240:
        _raise_invalid("وصف الدور يتجاوز 240 حرفًا.")
    description = description_value.strip()
    color = values.get("color", (template or {}).get("color", "cyan"))
    if color not in PERMISSION_COLORS:
        _raise_invalid("لون الدور يجب أن يكون رمزًا من لوحة الألوان المعتمدة.")

    slug_value = values.get("slug") or (template or {}).get("slug") or name
    slug = _validate_slug(slug_value) if values.get("slug") else _suggest_slug(slug_value)
    permission_values = values.get("permissions", (template or {}).get("permissions", []))
    try:
        permission_keys = validate_permission_keys(permission_values)
    except (TypeError, ValueError) as exc:
        raise InvalidParameter("قائمة صلاحيات الدور غير صالحة.") from exc
    if not can_grant(actor, permission_keys):
        raise PermissionDenied("لا يمكنك منح صلاحية لا تملكها.")

    position_value = values["position"] if "position" in values else _position_below_actor(actor)
    position = _validate_position(actor, position_value)
    AccessRole, _RoleAssignment, _AuditEvent, _User = _model_classes()
    role = AccessRole(
        slug=slug,
        name=name,
        description=description,
        color=color,
        position=position,
        permissions=permission_keys,
        is_system=False,
        is_default=False,
        template_key=template_key,
    )
    _save_role(role)
    record_audit(
        AuditAction.ROLE_CREATED,
        actor=actor,
        target_type="role",
        target_id=role.pk,
        detail={
            "before": {},
            "after": {
                "role": {
                    "slug": role.slug,
                    "name": role.name,
                    "description": role.description,
                    "color": role.color,
                    "position": role.position,
                },
                "permissionsAdded": permission_keys,
                "permissionsRemoved": [],
            },
        },
        request=request,
    )
    return role


def create_role_from_template(
    actor: Any,
    template_key: str,
    overrides: Mapping[str, Any] | None = None,
    *,
    request: Any = None,
):
    """Copy a registry template, allowing only identity/presentation overrides."""
    template = ROLE_TEMPLATES.get(template_key)
    if template is None:
        _raise_invalid("قالب الدور غير معروف.")
    values = dict(overrides or {})
    forbidden = set(values) - {"slug", "name", "description", "color", "position"}
    if forbidden:
        _raise_invalid("لا يمكن تعديل صلاحيات القالب أثناء إنشائه.")
    position = values.pop("position", None)
    payload = {
        "slug": values.pop("slug", template["slug"]),
        "name": values.pop("name", template["name"]),
        "description": values.pop("description", template["description"]),
        "color": values.pop("color", template["color"]),
        "position": position if position is not None else _position_below_actor(actor),
        "permissions": list(template["permissions"]),
        "template_key": template_key,
    }
    # Template slugs are defaults only; a second instance receives a safe suffix.
    if not (overrides or {}).get("slug"):
        payload["slug"] = _suggest_slug(template["slug"])
    return create_role(actor, payload, request=request)


def update_role(
    actor: Any,
    role: Any,
    data: Mapping[str, Any],
    *,
    request: Any = None,
):
    """Update an editable role with optional optimistic concurrency checking."""
    _AccessRole, RoleAssignment, _AuditEvent, UserModel = _model_classes()
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        current = _role_by_id(role, lock=True)
        _require_manage(actor, current)
        if current.slug == "admin":
            raise PermissionDenied("دور المشرف الكامل للقراءة فقط.")

        values = dict(data)
        expected = values.pop("expectedUpdatedAt", values.pop("expected_updated_at", None))
        immutable_fields = {"slug", "is_system", "is_default", "template_key"}
        if immutable_fields & values.keys():
            _raise_invalid("لا يمكن تغيير معرّف الدور أو خصائص النظام.")
        allowed_fields = {"name", "description", "color", "position", "permissions"}
        if set(values) - allowed_fields:
            _raise_invalid("يتضمن التحديث حقولًا غير معروفة.")
        if expected is not None:
            parsed = parse_datetime(expected) if isinstance(expected, str) else expected
            if isinstance(parsed, datetime) and timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            if not isinstance(parsed, datetime) or parsed != current.updated_at:
                raise Conflict("تغيّر الدور منذ آخر قراءة؛ حدّث الصفحة ثم أعد المحاولة.")

        before = _role_data(current)
        members_to_sync: list[Any] = []
        before_member_permissions: dict[Any, set[str]] = {}
        if "name" in values:
            name = values["name"]
            if not isinstance(name, str) or not name.strip() or len(name.strip()) > 60:
                _raise_invalid("اسم الدور مطلوب وبحد أقصى 60 حرفًا.")
            current.name = name.strip()
        if "description" in values:
            description = values["description"]
            if not isinstance(description, str) or len(description.strip()) > 240:
                _raise_invalid("وصف الدور يتجاوز 240 حرفًا.")
            current.description = description.strip()
        if "color" in values:
            current.color = values["color"]
        if "position" in values:
            current.position = _validate_position(actor, values["position"])
        if "permissions" in values:
            try:
                new_permissions = validate_permission_keys(values["permissions"])
            except (TypeError, ValueError) as exc:
                raise InvalidParameter("قائمة صلاحيات الدور غير صالحة.") from exc
            if current.is_default and any(PERMISSIONS[key].elevated for key in new_permissions):
                _raise_invalid("لا يمكن منح صلاحيات مرتفعة للدور الافتراضي.")
            added = sorted(set(new_permissions) - set(current.permissions))
            if not can_grant(actor, added):
                raise PermissionDenied("لا يمكنك منح صلاحية لا تملكها.")
            old_primary_permissions = expand_permission_keys(current.permissions)
            new_primary_permissions = expand_permission_keys(new_permissions)
            if {"administrator", "studio.access"} & (old_primary_permissions ^ new_primary_permissions):
                if current.is_default:
                    members_to_sync = list(UserModel.objects.select_for_update().order_by("pk"))
                else:
                    member_ids = (
                        RoleAssignment.objects.select_for_update()
                        .filter(role_id=current.pk)
                        .values_list("user_id", flat=True)
                    )
                    members_to_sync = list(
                        UserModel.objects.select_for_update().filter(pk__in=member_ids).order_by("pk")
                    )
                for member in members_to_sync:
                    sync_primary_role(member)
                    before_member_permissions[member.pk] = set(effective_permissions(member))
            current.permissions = new_permissions

        _save_role(current)
        after = _role_data(current)
        added = sorted(set(after["permissions"]) - set(before["permissions"]))
        removed = sorted(set(before["permissions"]) - set(after["permissions"]))
        for member in members_to_sync:
            member.role = Role.STUDENT
            member.is_staff = False
            member.save(update_fields=["role", "is_staff"])
            _clear_permission_cache(member)
            after_roles = list(effective_roles(member))
            _guard_last_administrator(actor, member, before_member_permissions[member.pk], after_roles)
            sync_primary_role(member)
        record_audit(
            AuditAction.ROLE_UPDATED,
            actor=actor,
            target_type="role",
            target_id=current.pk,
            detail={
                "before": {
                    "name": before["name"],
                    "description": before["description"],
                    "color": before["color"],
                    "position": before["position"],
                    "permissionsAdded": [],
                    "permissionsRemoved": removed,
                },
                "after": {
                    "name": after["name"],
                    "description": after["description"],
                    "color": after["color"],
                    "position": after["position"],
                    "permissionsAdded": added,
                    "permissionsRemoved": [],
                },
            },
            request=request,
        )
        return current


def _member_count(role: Any) -> int:
    _AccessRole, RoleAssignment, _AuditEvent, _User = _model_classes()
    return RoleAssignment.objects.filter(role_id=role.pk).count()


def _administrator_user_ids(exclude_user_id: Any = None) -> set[Any]:
    """Find administrators via explicit permissions plus the legacy staff bridge."""
    AccessRole, RoleAssignment, _AuditEvent, UserModel = _model_classes()
    role_ids = [
        role.pk
        for role in AccessRole.objects.only("id", "permissions")
        if isinstance(role.permissions, list) and "administrator" in role.permissions
    ]
    ids = set(RoleAssignment.objects.filter(role_id__in=role_ids).values_list("user_id", flat=True))
    ids.update(UserModel.objects.filter(Q(is_staff=True) | Q(role=Role.ADMIN)).values_list("pk", flat=True))
    if exclude_user_id is not None:
        ids.discard(exclude_user_id)
    return ids


def _guard_last_administrator(actor: Any, target: Any, before: set[str], after_roles: Sequence[Any]) -> None:
    after_keys: set[str] = set()
    for role in after_roles:
        try:
            after_keys.update(expand_permission_keys(role.permissions))
        except ValueError:
            continue
    remains_admin = "administrator" in after_keys
    if "administrator" not in before or remains_admin:
        return
    if getattr(actor, "pk", None) == target.pk:
        raise PermissionDenied("لا يمكنك خفض صلاحية حسابك الإداري.")
    if not _administrator_user_ids(exclude_user_id=target.pk):
        raise PermissionDenied("لا يمكن إزالة آخر مشرف في النظام.")


def _sync_user_roles(actor: Any, target: Any, roles: Sequence[Any], *, request: Any = None) -> Any:
    """Replace explicit roles and recompute legacy fields inside the caller's transaction."""
    _AccessRole, RoleAssignment, _AuditEvent, _User = _model_classes()
    before_permissions = set(effective_permissions(target))
    before_roles = list(effective_roles(target))
    current_assignments = list(RoleAssignment.objects.filter(user_id=target.pk).select_related("role"))
    current_by_id = {assignment.role_id: assignment for assignment in current_assignments}
    desired_by_id = {role.pk: role for role in roles if not role.is_default}
    added_ids = desired_by_id.keys() - current_by_id.keys()
    removed_ids = current_by_id.keys() - desired_by_id.keys()
    added_roles = [desired_by_id[role_id] for role_id in added_ids]
    removed_assignments = [current_by_id[role_id] for role_id in removed_ids]
    changed_roles = [assignment.role for assignment in removed_assignments] + added_roles

    if not has_perm(actor, "users.assign_roles"):
        raise PermissionDenied("لا تملك صلاحية إسناد الأدوار.")
    for changed_role in changed_roles:
        _require_manage(actor, changed_role)
    for added_role in added_roles:
        if not can_grant(actor, _permission_list(added_role)):
            raise PermissionDenied("لا يمكنك إسناد دور يمنح صلاحيات لا تملكها.")

    before_set = set(before_permissions)
    _guard_last_administrator(actor, target, before_set, list(desired_by_id.values()))

    for assignment in removed_assignments:
        assignment.delete()
    actor_for_fk = actor if _is_authenticated(actor) else None
    for added_role in added_roles:
        RoleAssignment.objects.create(user=target, role=added_role, assigned_by=actor_for_fk)

    # Clear the legacy bridge before recomputing so an intentional demotion is
    # not re-promoted by the old `role=admin` / `is_staff=True` values.
    target.role = Role.STUDENT
    target.is_staff = False
    target.save(update_fields=["role", "is_staff"])
    _clear_permission_cache(target)
    sync_primary_role(target)

    after_permissions = set(effective_permissions(target))
    after_roles = list(effective_roles(target))
    before_slugs = sorted(role.slug for role in before_roles)
    after_slugs = sorted(role.slug for role in after_roles)
    detail = {
        "before": {"roles": before_slugs},
        "after": {"roles": after_slugs},
        "permissionsAdded": sorted(after_permissions - before_permissions),
        "permissionsRemoved": sorted(before_permissions - after_permissions),
    }
    if added_roles:
        record_audit(
            AuditAction.ROLE_ASSIGNED,
            actor=actor,
            target_type="user",
            target_id=target.pk,
            detail=detail,
            request=request,
        )
    if removed_assignments:
        record_audit(
            AuditAction.ROLE_REVOKED,
            actor=actor,
            target_type="user",
            target_id=target.pk,
            detail=detail,
            request=request,
        )
    return target


def assign_roles(
    actor: Any,
    user: Any,
    role_ids: Sequence[Any],
    *,
    request: Any = None,
):
    """Replace explicit role assignments; the default role is always implicit."""
    if not isinstance(role_ids, (list, tuple, set, frozenset)):
        _raise_invalid("قائمة الأدوار غير صالحة.")
    requested_ids = list(role_ids)
    if len(requested_ids) != len({str(role_id) for role_id in requested_ids}):
        _raise_invalid("لا يمكن تكرار الدور في القائمة.")

    AccessRole, _RoleAssignment, _AuditEvent, UserModel = _model_classes()
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        try:
            target = UserModel.objects.select_for_update().get(pk=getattr(user, "pk", user))
        except (UserModel.DoesNotExist, ValueError, TypeError) as exc:
            raise NotFound("المستخدم المطلوب غير موجود.") from exc

        if not has_perm(actor, "users.assign_roles"):
            raise PermissionDenied("لا تملك صلاحية إسناد الأدوار.")
        if not requested_ids:
            roles: list[Any] = []
        else:
            try:
                rows = list(AccessRole.objects.filter(pk__in=requested_ids))
            except (ValueError, TypeError, ValidationError) as exc:
                raise InvalidParameter("أحد الأدوار المطلوبة غير موجود.") from exc
            by_id = {str(role.pk): role for role in rows}
            missing = [str(role_id) for role_id in requested_ids if str(role_id) not in by_id]
            if missing:
                raise InvalidParameter("أحد الأدوار المطلوبة غير موجود.")
            roles = [by_id[str(role_id)] for role_id in requested_ids]
        _sync_user_roles(actor, target, roles, request=request)
        return target


def revoke_role(actor: Any, user: Any, role_id: Any, *, request: Any = None):
    """Remove one explicit assignment through the same hierarchy and audit guards."""
    _AccessRole, RoleAssignment, _AuditEvent, UserModel = _model_classes()
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        try:
            target = UserModel.objects.select_for_update().get(pk=getattr(user, "pk", user))
            assignment = RoleAssignment.objects.select_related("role").get(user_id=target.pk, role_id=role_id)
        except (UserModel.DoesNotExist, RoleAssignment.DoesNotExist, ValueError, TypeError, ValidationError) as exc:
            raise NotFound("إسناد الدور المطلوب غير موجود.") from exc
        current_ids = list(
            RoleAssignment.objects.filter(user_id=target.pk)
            .exclude(role_id=assignment.role_id)
            .values_list("role_id", flat=True)
        )
        return assign_roles(actor, target, current_ids, request=request)


def delete_role(
    actor: Any,
    role: Any,
    reassign_to: Any = None,
    *,
    request: Any = None,
):
    """Delete a non-system role, optionally moving its members to another role."""
    _AccessRole, RoleAssignment, _AuditEvent, UserModel = _model_classes()
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        current = _role_by_id(role, lock=True)
        _require_manage(actor, current)
        if current.is_system or current.is_default:
            raise PermissionDenied("لا يمكن حذف أدوار النظام أو الدور الافتراضي.")
        target_role = _role_by_id(reassign_to, lock=True) if reassign_to is not None else None
        if target_role is not None and target_role.pk == current.pk:
            _raise_invalid("يجب اختيار دور بديل مختلف.")
        if target_role is not None:
            _require_manage(actor, target_role)
            if not target_role.is_default and not can_grant(
                actor, set(target_role.permissions) - set(current.permissions)
            ):
                raise PermissionDenied("لا يمكنك منح صلاحيات الدور البديل.")

        assignments = list(RoleAssignment.objects.filter(role_id=current.pk).select_related("user", "role"))
        if assignments and target_role is None:
            member_count = len(assignments)
            raise RoleHasMembers(f"لا يمكن حذف الدور؛ ما زال له {member_count} عضوًا.", count=member_count)

        affected_users: list[Any] = []
        for assignment in assignments:
            target_user = UserModel.objects.select_for_update().get(pk=assignment.user_id)
            before_permissions = set(effective_permissions(target_user))
            before_roles = list(effective_roles(target_user))
            desired_roles = [
                item.role
                for item in RoleAssignment.objects.filter(user_id=target_user.pk).select_related("role")
                if item.role_id != current.pk
            ]
            if target_role is not None and not target_role.is_default:
                desired_roles.append(target_role)
            _guard_last_administrator(actor, target_user, before_permissions, desired_roles)
            existing_target = None
            if target_role is not None and not target_role.is_default:
                existing_target = RoleAssignment.objects.filter(user_id=target_user.pk, role_id=target_role.pk).first()
            if existing_target or (target_role is not None and target_role.is_default):
                assignment.delete()
            else:
                assignment.role = target_role
                assignment.assigned_by = actor if _is_authenticated(actor) else None
                assignment.save(update_fields=["role", "assigned_by"])

            target_user.role = Role.STUDENT
            target_user.is_staff = False
            target_user.save(update_fields=["role", "is_staff"])
            _clear_permission_cache(target_user)
            sync_primary_role(target_user)
            after_permissions = set(effective_permissions(target_user))
            after_roles = list(effective_roles(target_user))
            record_audit(
                AuditAction.ROLE_REVOKED
                if target_role is None or target_role.is_default
                else AuditAction.ROLE_ASSIGNED,
                actor=actor,
                target_type="user",
                target_id=target_user.pk,
                detail={
                    "before": {"roles": sorted(item.slug for item in before_roles)},
                    "after": {"roles": sorted(item.slug for item in after_roles)},
                    "permissionsAdded": sorted(after_permissions - before_permissions),
                    "permissionsRemoved": sorted(before_permissions - after_permissions),
                },
                request=request,
            )
            affected_users.append(target_user.pk)

        before = {
            "role": {
                "slug": current.slug,
                "name": current.name,
                "description": current.description,
                "color": current.color,
                "position": current.position,
                "permissionsRemoved": list(current.permissions),
            },
            "members": len(assignments),
        }
        current.delete()
        record_audit(
            AuditAction.ROLE_DELETED,
            actor=actor,
            target_type="role",
            target_id=current.pk,
            detail={
                "before": before,
                "after": {
                    "reassignTo": target_role.slug if target_role else None,
                    "affectedUsers": len(affected_users),
                },
            },
            request=request,
        )
        return {"deleted": True, "affectedUsers": len(affected_users)}


def reorder_roles(actor: Any, ordered_ids: Sequence[Any], *, request: Any = None) -> list[Any]:
    """Rewrite editable role positions in top-to-bottom order; system roles stay pinned."""
    if not isinstance(ordered_ids, (list, tuple)):
        _raise_invalid("ترتيب الأدوار غير صالح.")
    ids = list(ordered_ids)
    if len(ids) != len({str(role_id) for role_id in ids}):
        _raise_invalid("لا يمكن تكرار الدور في الترتيب.")

    AccessRole, _RoleAssignment, _AuditEvent, _User = _model_classes()
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        all_roles = list(AccessRole.objects.select_for_update().order_by("-position", "name"))
        by_id = {str(role.pk): role for role in all_roles}
        unknown = [str(role_id) for role_id in ids if str(role_id) not in by_id]
        if unknown:
            raise InvalidParameter("أحد الأدوار المطلوبة غير موجود.")
        requested = [by_id[str(role_id)] for role_id in ids]
        movable_requested = [role for role in requested if not role.is_system and not role.is_default]
        unlisted = [
            role
            for role in all_roles
            if not role.is_system and not role.is_default and role.pk not in {r.pk for r in movable_requested}
        ]
        ordered = movable_requested + unlisted
        if len(ordered) > 999:
            _raise_invalid("لا يمكن ترتيب أكثر من 999 دورًا.")

        new_positions = {role.pk: len(ordered) - index for index, role in enumerate(ordered)}
        changed = [role for role in ordered if role.position != new_positions[role.pk]]
        for role in changed:
            _require_manage(actor, role)
            if not _actor_is_administrator(actor) and new_positions[role.pk] >= highest_position(actor):
                raise PermissionDenied("لا يمكنك نقل دور إلى مستوى يساوي دورك أو يتجاوزه.")

        for role in changed:
            old_position = role.position
            role.position = new_positions[role.pk]
            role.save(update_fields=["position", "updated_at"])
            record_audit(
                AuditAction.ROLE_REORDERED,
                actor=actor,
                target_type="role",
                target_id=role.pk,
                detail={"before": {"position": old_position}, "after": {"position": role.position}},
                request=request,
            )
        return list(AccessRole.objects.order_by("is_default", "-position", "name", "pk"))


def sync_primary_role(user: Any):
    """Derive legacy account fields from effective roles and keep profiles additive."""
    if not _is_authenticated(user):
        return user

    _clear_permission_cache(user)
    AccessRole, RoleAssignment, _AuditEvent, _User = _model_classes()
    # New superusers, Firebase instructor hints, and legacy staff-only accounts
    # enter through these old fields before their first explicit assignment.
    legacy_admin = bool(getattr(user, "is_admin", False))
    legacy_instructor = getattr(user, "role", None) == Role.INSTRUCTOR
    roles_before = effective_roles(user)
    explicit_roles = [role for role in roles_before if not role.is_default]

    if legacy_admin and not any("administrator" in (role.permissions or []) for role in explicit_roles):
        admin_role = AccessRole.objects.filter(slug="admin").first()
        if admin_role is None:
            bootstrap_system_roles()
            admin_role = AccessRole.objects.filter(slug="admin").first()
        if admin_role is not None:
            RoleAssignment.objects.get_or_create(user_id=user.pk, role_id=admin_role.pk)
            _clear_permission_cache(user)
    elif legacy_instructor and not explicit_roles:
        # Instructor is a template-materialized ordinary role, not a system row.
        # Do not recreate it if a role manager intentionally removed it.
        instructor_role = AccessRole.objects.filter(slug="instructor").first()
        if instructor_role is not None:
            RoleAssignment.objects.get_or_create(user_id=user.pk, role_id=instructor_role.pk)
            _clear_permission_cache(user)

    permissions = effective_permissions(user)
    is_administrator = "administrator" in permissions
    is_instructor = "studio.access" in permissions
    primary_role = Role.ADMIN if is_administrator else Role.INSTRUCTOR if is_instructor else Role.STUDENT
    changed_fields: list[str] = []
    if user.role != primary_role:
        user.role = primary_role
        changed_fields.append("role")
    if user.is_staff != is_administrator:
        user.is_staff = is_administrator
        changed_fields.append("is_staff")
    if changed_fields:
        user.save(update_fields=changed_fields)
        _clear_permission_cache(user)

    # Lazy import avoids a model/service cycle; ensure_profile is idempotent.
    from features.auth.services import ensure_profile

    ensure_profile(user)
    return user


def _sanitize_role_template_permissions(template: Mapping[str, Any]) -> list[str]:
    try:
        return validate_permission_keys(template["permissions"])
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidParameter("قالب الدور يحتوي على صلاحيات غير صالحة.") from exc


def bootstrap_system_roles(*, apps=None, using: str | None = None) -> dict[str, Any]:
    """Idempotently install locked roles, materialize instructor, and backfill."""
    alias = using or "default"
    AccessRole, RoleAssignment, _AuditEvent, UserModel = _model_classes(apps)
    manager = AccessRole.objects.using(alias)
    result: dict[str, Any] = {}

    with transaction.atomic(using=alias):
        for slug in ("student", "admin"):
            spec = dict(SYSTEM_ROLE_SPECS[slug])
            role, created = manager.get_or_create(slug=slug, defaults=spec)
            if not created:
                changed = {field: value for field, value in spec.items() if getattr(role, field) != value}
                if changed:
                    changed["updated_at"] = timezone.now()
                    manager.filter(pk=role.pk).update(**changed)
                    for field, value in spec.items():
                        setattr(role, field, value)
            result[slug] = role

        template = ROLE_TEMPLATES["instructor"]
        instructor_defaults = {
            "slug": "instructor",
            "name": template["name"],
            "description": template["description"],
            "color": template["color"],
            "position": 100,
            "permissions": _sanitize_role_template_permissions(template),
            "is_system": False,
            "is_default": False,
            "template_key": "instructor",
        }
        instructor, _created = manager.get_or_create(slug="instructor", defaults=instructor_defaults)
        result["instructor"] = instructor

        assignment_manager = RoleAssignment.objects.using(alias)
        admin_ids = (
            UserModel.objects.using(alias).filter(Q(role=Role.ADMIN) | Q(is_staff=True)).values_list("pk", flat=True)
        )
        assignment_manager.bulk_create(
            [RoleAssignment(user_id=user_id, role_id=result["admin"].pk) for user_id in admin_ids.iterator()],
            ignore_conflicts=True,
            batch_size=500,
        )
        instructor_ids = UserModel.objects.using(alias).filter(role=Role.INSTRUCTOR).values_list("pk", flat=True)
        assignment_manager.bulk_create(
            [RoleAssignment(user_id=user_id, role_id=instructor.pk) for user_id in instructor_ids.iterator()],
            ignore_conflicts=True,
            batch_size=500,
        )
    return result


# --- Phase 2 role-manager read and batch services ----------------------------


def _roles_with_member_counts():
    """Annotate every role with the real member count in one database query."""
    AccessRole, _RoleAssignment, _AuditEvent, UserModel = _model_classes()
    all_users = UserModel.objects.order_by().values().annotate(total=Count("pk")).values("total")[:1]
    return AccessRole.objects.annotate(
        member_count=Case(
            When(is_default=True, then=Subquery(all_users, output_field=IntegerField())),
            default=Count("assignments"),
            output_field=IntegerField(),
        )
    )


def list_roles() -> list[Any]:
    """Return roles with computed member counts and the implicit default last."""
    return list(_roles_with_member_counts().order_by("is_default", "-position", "name", "pk"))


def get_role(role_id: Any):
    """Return one role with its member count, or the shared 404 exception."""
    AccessRole, _RoleAssignment, _AuditEvent, _UserModel = _model_classes()
    try:
        return _roles_with_member_counts().get(pk=getattr(role_id, "pk", role_id))
    except (AccessRole.DoesNotExist, ValueError, TypeError, ValidationError) as exc:
        raise NotFound("الدور المطلوب غير موجود.") from exc


def user_role_map(user_ids: Sequence[Any], actor: Any = None) -> dict[Any, list[Any]]:
    """Bulk-load explicit role summaries plus the shared implicit default role."""
    ids = list(dict.fromkeys(user_ids))
    if not ids:
        return {}
    AccessRole, RoleAssignment, _AuditEvent, _UserModel = _model_classes()
    default_role = None
    if _is_authenticated(actor):
        snapshot = actor.__dict__.get(_ACCESS_CACHE_ATTR)
        if snapshot is not None:
            default_role = next((role for role in snapshot[0] if role.is_default), None)
    if default_role is None:
        default_role = AccessRole.objects.filter(is_default=True).first()
    result: dict[Any, list[Any]] = {user_id: [] for user_id in ids}
    assignments = (
        RoleAssignment.objects.filter(user_id__in=ids)
        .select_related("role")
        .order_by("user_id", "-role__position", "role__name", "role__slug")
    )
    for assignment in assignments:
        result.setdefault(assignment.user_id, []).append(assignment.role)
    for user_id in ids:
        if default_role is not None:
            result[user_id].append(default_role)
    return result


def role_members_page(
    role_id: Any,
    *,
    query: str = "",
    page: int = 1,
    page_size: int = 20,
    actor: Any = None,
) -> tuple[int, list[Any], dict[Any, list[Any]]]:
    """Return a stable user page and a constant-query role summary map.

    The implicit student role is membership for every account; ordinary roles
    are scoped through their explicit assignment rows.
    """
    if isinstance(page, bool) or page < 1:
        raise InvalidParameter("رقم الصفحة غير صالح.")
    if isinstance(page_size, bool) or page_size < 1:
        raise InvalidParameter("حجم الصفحة غير صالح.")
    page_size = min(page_size, 100)
    needle = str(query or "").strip()
    if len(needle) > 160:
        raise InvalidParameter("نص البحث طويل جدًا.")

    role = get_role(role_id)
    _AccessRole, _RoleAssignment, _AuditEvent, UserModel = _model_classes()
    queryset = UserModel.objects.all()
    if not role.is_default:
        queryset = queryset.filter(role_assignments__role_id=role.pk)
    if needle:
        queryset = queryset.filter(Q(email__icontains=needle) | Q(full_name__icontains=needle))
    if not role.is_default:
        queryset = queryset.distinct()
    total = queryset.count()
    users = list(queryset.order_by("email", "pk")[(page - 1) * page_size : page * page_size])
    role_map = user_role_map([user.pk for user in users], actor=actor)
    return total, users, role_map


def bulk_add_role_members(
    actor: Any,
    role_id: Any,
    user_ids: Sequence[Any],
    *,
    request: Any = None,
) -> list[dict[str, Any]]:
    """Add a role to many users in one outer transaction with per-ID outcomes."""
    if not isinstance(user_ids, (list, tuple)):
        raise InvalidParameter("قائمة الحسابات غير صالحة.")
    ids = list(user_ids)
    if len(ids) > 100:
        raise InvalidParameter("لا يمكن إسناد الدور لأكثر من 100 حساب في الطلب الواحد.")
    if len(ids) != len({str(user_id) for user_id in ids}):
        raise InvalidParameter("لا يمكن تكرار الحساب في القائمة.")

    _AccessRole, RoleAssignment, _AuditEvent, _UserModel = _model_classes()
    outcomes: list[dict[str, Any]] = []
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        role = _role_by_id(role_id, lock=True)
        if role.is_default:
            raise InvalidParameter("الدور الافتراضي لا يُسند صراحةً؛ كل حساب عضو فيه تلقائيًا.")
        for raw_user_id in ids:
            user_key = str(raw_user_id)
            try:
                existing_ids = list(
                    RoleAssignment.objects.filter(user_id=raw_user_id).values_list("role_id", flat=True)
                )
                desired_ids = existing_ids if role.pk in existing_ids else [*existing_ids, role.pk]
                assign_roles(actor, raw_user_id, desired_ids, request=request)
            except (PermissionDenied, NotFound, InvalidParameter, Conflict) as exc:
                code = getattr(exc, "default_code", None) or getattr(exc, "code", None) or "invalid_parameter"
                outcomes.append({"userId": user_key, "ok": False, "code": str(code)})
            except ValueError, TypeError, ValidationError:
                outcomes.append({"userId": user_key, "ok": False, "code": "invalid_parameter"})
            else:
                outcomes.append({"userId": user_key, "ok": True})
    return outcomes


def bulk_remove_role_members(
    actor: Any,
    role_id: Any,
    user_ids: Sequence[Any],
    *,
    request: Any = None,
) -> list[dict[str, Any]]:
    """Revoke one role from many users in one outer transaction; per-ID outcomes."""
    if not isinstance(user_ids, (list, tuple)):
        raise InvalidParameter("قائمة الحسابات غير صالحة.")
    ids = list(user_ids)
    if len(ids) > 100:
        raise InvalidParameter("لا يمكن إلغاء الإسناد لأكثر من 100 حساب في الطلب الواحد.")
    if len(ids) != len({str(user_id) for user_id in ids}):
        raise InvalidParameter("لا يمكن تكرار الحساب في القائمة.")

    _AccessRole, RoleAssignment, _AuditEvent, _UserModel = _model_classes()
    outcomes: list[dict[str, Any]] = []
    with transaction.atomic():
        _lock_role_mutation_guard(actor)
        role = _role_by_id(role_id, lock=True)
        if role.is_default:
            raise InvalidParameter("الدور الافتراضي لا يُلغى إسنادًا صريحًا.")
        for raw_user_id in ids:
            user_key = str(raw_user_id)
            try:
                existing_ids = list(
                    RoleAssignment.objects.filter(user_id=raw_user_id).values_list("role_id", flat=True)
                )
                if role.pk not in existing_ids:
                    outcomes.append({"userId": user_key, "ok": False, "code": "not_assigned"})
                    continue
                desired_ids = [rid for rid in existing_ids if rid != role.pk]
                assign_roles(actor, raw_user_id, desired_ids, request=request)
            except (PermissionDenied, NotFound, InvalidParameter, Conflict) as exc:
                code = getattr(exc, "default_code", None) or getattr(exc, "code", None) or "invalid_parameter"
                outcomes.append({"userId": user_key, "ok": False, "code": str(code)})
            except ValueError, TypeError, ValidationError:
                outcomes.append({"userId": user_key, "ok": False, "code": "invalid_parameter"})
            else:
                outcomes.append({"userId": user_key, "ok": True})
    return outcomes


def effective_permission_provenance(user: Any) -> list[dict[str, Any]]:
    """Explain every effective permission back to the role that granted it.

    The admin console's 'why can/can't this user do X?' inspector uses this
    output directly. Rules:
    - `administrator` (explicit or via staff fallback) covers every catalog key.
    - A permission granted directly by a role lists that role in `grantedBy`.
    - A permission reached only via implication lists the source key as `via`.
    """
    if not _is_authenticated(user):
        return []
    roles, effective = _access_snapshot(user)
    effective_keys = set(effective)
    has_admin = "administrator" in effective_keys

    direct: dict[str, list[dict[str, Any]]] = {}
    for role in roles:
        role_perms = role.permissions if isinstance(role.permissions, list) else []
        entry = {
            "roleSlug": role.slug,
            "roleName": role.name,
            "isSystem": bool(role.is_system),
            "isDefault": bool(role.is_default),
        }
        for key in role_perms:
            if key in PERMISSIONS:
                direct.setdefault(key, []).append(entry)

    items: list[dict[str, Any]] = []
    for key in PERMISSION_KEYS:
        if key not in effective_keys:
            continue
        spec = PERMISSIONS[key]
        granted_by = list(direct.get(key, []))
        via: list[str] = []
        if not granted_by and not has_admin:
            # Walk parents: find which held key implies this one.
            for parent_key, parent_spec in PERMISSIONS.items():
                if parent_key == key or parent_key not in effective_keys:
                    continue
                if key in parent_spec.implies:
                    via.append(parent_key)
        items.append(
            {
                "key": key,
                "label": spec.label,
                "group": spec.group,
                "elevated": spec.elevated,
                "grantedBy": granted_by,
                "via": via,
                "administrator": has_admin,
            }
        )
    return items


def audit_page(
    *,
    action: str | None = None,
    actor_id: Any = None,
    target_type: str | None = None,
    target_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[int, list[Any]]:
    """Filter and page access audit events with a stable newest-first order."""
    if isinstance(page, bool) or page < 1:
        raise InvalidParameter("رقم الصفحة غير صالح.")
    if isinstance(page_size, bool) or page_size < 1:
        raise InvalidParameter("حجم الصفحة غير صالح.")
    page_size = min(page_size, 100)
    if action and action not in AuditAction.values:
        raise InvalidParameter("إجراء التدقيق غير معروف.")
    if actor_id:
        try:
            actor_id = uuid.UUID(str(actor_id))
        except (TypeError, ValueError) as exc:
            raise InvalidParameter("معرّف المنفّذ غير صالح.") from exc
    if target_type and len(target_type) > 80:
        raise InvalidParameter("نوع الهدف طويل جدًا.")
    if target_id and len(target_id) > 128:
        raise InvalidParameter("معرّف الهدف طويل جدًا.")
    _AccessRole, _RoleAssignment, AuditEvent, _UserModel = _model_classes()
    queryset = AuditEvent.objects.select_related("actor")
    if action:
        queryset = queryset.filter(action=action)
    if actor_id:
        queryset = queryset.filter(actor_id=actor_id)
    if target_type:
        queryset = queryset.filter(target_type=target_type)
    if target_id:
        queryset = queryset.filter(target_id=target_id)
    total = queryset.count()
    rows = list(queryset.order_by("-created_at", "-pk")[(page - 1) * page_size : page * page_size])
    return total, rows
