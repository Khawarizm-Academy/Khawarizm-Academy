"""Admin console services: account lifecycle and the managed-content editor.

The views resolve the caller and serialize; the rules — email uniqueness,
role⇄staff sync, self-protection guards, and the per-kind value coercion —
live here. Guards raise `InvalidParameter`, which the shared handler renders
as the same 400 `{"detail": …}` envelope the views returned before.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from features.adminconsole.serializers import CONTENT_TYPES, USER_FIELDS
from features.auth import services as auth_services
from features.auth.models import User
from features.common.choices import Role
from features.common.errors import InvalidParameter, RoleMissing
from features.competitions.models import Competition
from features.courses.models import Course
from features.events.models import EventItem
from features.scholarships.models import Scholarship

# The content types the console manages, and where their headline counts come from.
CONTENT_COUNTS = {"courses": Course, "scholarships": Scholarship, "events": EventItem, "competitions": Competition}


# --- Account lifecycle -------------------------------------------------------


def _assign_legacy_role(user: User, role: str, acting_user: User) -> User:
    """Translate the still-supported student/instructor/admin API to role IDs."""
    if role not in Role.values:
        raise InvalidParameter("دور غير صالح.")
    if role == Role.STUDENT:
        role_ids = []  # the student role is implicit and never stored as an assignment
    else:
        from features.access.models import AccessRole
        from features.access.services import assign_roles

        access_role = AccessRole.objects.filter(slug=role).first()
        if access_role is None:
            raise RoleMissing("الدور المطلوب غير موجود في مدير الأدوار.")
        role_ids = [access_role.pk]
        return assign_roles(acting_user, user, role_ids)

    from features.access.services import assign_roles

    return assign_roles(acting_user, user, role_ids)


@transaction.atomic
def create_user_account(data: dict[str, Any], acting_user: User | None = None) -> User:
    """Create an account from the console's user form (email is the identity)."""
    values = values_for({"fields": USER_FIELDS}, data, create=True)
    email = str(values.get("email", "")).strip().lower()
    if not email:
        raise InvalidParameter("البريد الإلكتروني مطلوب.")
    if User.objects.filter(email=email).exists():
        raise InvalidParameter("البريد الإلكتروني مستخدم بالفعل.")
    requested_role = values.pop("role", Role.STUDENT)
    if requested_role not in Role.values:
        raise InvalidParameter("دور غير صالح.")
    if requested_role == Role.INSTRUCTOR:
        from features.access.models import AccessRole

        if not AccessRole.objects.filter(slug="instructor").exists():
            raise RoleMissing("دور المدرّب غير موجود في مدير الأدوار.")
    password = data.get("password") or None
    user = User.objects.create_user(
        email=email,
        password=password,
        role=Role.STUDENT,
        **{k: v for k, v in values.items() if k != "email"},
    )
    from features.access.services import sync_primary_role

    sync_primary_role(user)
    if requested_role != Role.STUDENT:
        return _assign_legacy_role(user, requested_role, acting_user)
    return user


@transaction.atomic
def update_user_account(user: User, data: dict[str, Any], acting_user: User) -> User:
    """Apply the console's account edits, keeping Django staff rights in sync."""
    values = values_for({"fields": USER_FIELDS}, data, create=False)
    # Email is immutable: console edits can never change the account's identity.
    values.pop("email", None)
    if "role" in values and is_self(acting_user, user) and values["role"] != Role.ADMIN:
        raise InvalidParameter("لا يمكنك خفض دورك الخاص.")
    requested_role = values.pop("role", None)
    if requested_role is not None and requested_role not in Role.values:
        raise InvalidParameter("دور غير صالح.")
    if requested_role is not None:
        user = _assign_legacy_role(user, requested_role, acting_user)
    else:
        user = User.objects.select_for_update().get(pk=user.pk)
    for attr, value in values.items():
        setattr(user, attr, value)
    try:
        user.save()
    except IntegrityError as exc:
        raise InvalidParameter("تعذّر حفظ التعديلات: قيمة مكرّرة.") from exc
    if requested_role is None:
        auth_services.ensure_profile(user)
    return user


def delete_user_account(user: User, acting_user: User) -> None:
    """Remove one account; nobody deletes their own."""
    if is_self(acting_user, user):
        raise InvalidParameter("لا يمكنك حذف حسابك الخاص.")
    user.delete()


def set_role(user: User, role: str, acting_user: User) -> User:
    """Promote or demote; Django staff rights follow the role, but not on yourself."""
    if is_self(acting_user, user):
        raise InvalidParameter("لا يمكنك تغيير دورك الخاص.")
    if role not in Role.values:
        raise InvalidParameter("دور غير صالح.")
    return _assign_legacy_role(user, role, acting_user)


def is_self(acting_user: User, user: User) -> bool:
    """Same account? (PKs are UUIDs; compare their string forms like the API does.)"""
    return str(acting_user.id) == str(user.id)


# --- Content editor ----------------------------------------------------------


def require_content_type(type_key: str) -> dict:
    """Resolve a managed content type or 404 with the standard envelope."""
    spec = CONTENT_TYPES.get(type_key)
    if spec is None:
        raise InvalidParameter(f"نوع محتوى غير معروف: {type_key}")
    return spec


def _json_coerce(value: Any) -> Any:
    """JSON columns take an object as-is or parse a JSON string."""
    return value if not isinstance(value, str) else json.loads(value)


def _user_ref_coerce(value: Any) -> User:
    """Resolve an async user-search selection to a real foreign-key object."""
    UserModel = get_user_model()
    try:
        return UserModel.objects.get(pk=value)
    except (UserModel.DoesNotExist, ValueError, TypeError, ValidationError) as exc:
        raise ValueError("invalid user reference") from exc


# One coercer per field kind — the dispatch table replaces the old if-chain.
_COERCERS: dict[str, Callable[[Any], Any]] = {
    "number": int,
    "decimal": float,
    "bool": lambda value: value in (True, "true", "1", 1),
    "json": _json_coerce,
    "user_ref": _user_ref_coerce,
}

# Kinds whose empty submission clears the column (a numeric one keeps its value).
CLEARABLE_KINDS = frozenset({"text", "textarea", "url", "select"})


def coerce(field: dict, value: Any) -> Any:
    """Turn a submitted JSON value into the Python type the column expects."""
    return _COERCERS.get(field["kind"], str)(value)


def values_for(spec: dict, data: dict[str, Any], create: bool) -> dict[str, Any]:
    """Validate and coerce the submitted fields into model kwargs."""
    values: dict[str, Any] = {}
    errors: list[str] = []
    for field in spec["fields"]:
        if field["name"] not in data:
            if create and field.get("required"):
                errors.append(f"الحقل «{field['label']}» مطلوب.")
            continue
        value = data[field["name"]]
        if value is None or value == "":
            # Clearing a text column is fine; a numeric one keeps its value.
            if create and field.get("required"):
                errors.append(f"الحقل «{field['label']}» مطلوب.")
            elif not create and field["kind"] == "user_ref":
                values[field["attr"]] = None
            elif not create and field["kind"] in CLEARABLE_KINDS:
                values[field["attr"]] = ""
            continue
        try:
            values[field["attr"]] = coerce(field, value)
        except TypeError, ValueError:
            errors.append(f"قيمة غير صالحة في «{field['label']}».")
    if errors:
        raise InvalidParameter(" ".join(errors))
    return values


def create_content_row(spec: dict, data: dict[str, Any]) -> Any:
    """One new content row from validated values; duplicates are 400s."""
    _reject_unknown_content_fields(spec, data)
    values = values_for(spec, data, create=True)
    try:
        return spec["model"].objects.create(**values)
    except (IntegrityError, ValueError) as exc:
        raise InvalidParameter("تعذّر الإنشاء: بيانات غير صالحة أو مكرّرة.") from exc


def save_content_row(spec: dict, row: Any, data: dict[str, Any]) -> Any:
    """Patch one content row from validated values; duplicates are 400s."""
    _reject_unknown_content_fields(spec, data)
    values = values_for(spec, data, create=False)
    for attr, value in values.items():
        setattr(row, attr, value)
    try:
        row.save()
    except (IntegrityError, ValueError) as exc:
        raise InvalidParameter("تعذّر الحفظ: بيانات غير صالحة أو مكرّرة.") from exc
    return row


def _reject_unknown_content_fields(spec: dict, data: dict[str, Any]) -> None:
    allowed = {field["name"] for field in spec["fields"]}
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")
