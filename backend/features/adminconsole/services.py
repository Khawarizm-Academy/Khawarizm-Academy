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

from django.db import IntegrityError

from features.adminconsole.serializers import CONTENT_TYPES, USER_FIELDS
from features.auth import services as auth_services
from features.auth.models import User
from features.common.choices import Role
from features.common.errors import InvalidParameter
from features.competitions.models import Competition
from features.courses.models import Course
from features.events.models import EventItem
from features.scholarships.models import Scholarship

# The content types the console manages, and where their headline counts come from.
CONTENT_COUNTS = {"courses": Course, "scholarships": Scholarship, "events": EventItem, "competitions": Competition}


# --- Account lifecycle -------------------------------------------------------


def create_user_account(data: dict[str, Any]) -> User:
    """Create an account from the console's user form (email is the identity)."""
    values = values_for({"fields": USER_FIELDS}, data, create=True)
    email = str(values.get("email", "")).strip().lower()
    if not email:
        raise InvalidParameter("البريد الإلكتروني مطلوب.")
    if User.objects.filter(email=email).exists():
        raise InvalidParameter("البريد الإلكتروني مستخدم بالفعل.")
    password = data.get("password") or None
    user = User.objects.create_user(email=email, password=password, **{k: v for k, v in values.items() if k != "email"})
    user.is_staff = user.role == Role.ADMIN
    user.save(update_fields=["is_staff"])
    auth_services.ensure_profile(user)
    return user


def update_user_account(user: User, data: dict[str, Any], acting_user: User) -> User:
    """Apply the console's account edits, keeping Django staff rights in sync."""
    values = values_for({"fields": USER_FIELDS}, data, create=False)
    # Email is immutable: console edits can never change the account's identity.
    values.pop("email", None)
    if "role" in values and is_self(acting_user, user) and values["role"] != Role.ADMIN:
        raise InvalidParameter("لا يمكنك خفض دورك الخاص.")
    for attr, value in values.items():
        setattr(user, attr, value)
    if "role" in values:
        user.is_staff = values["role"] == Role.ADMIN
    try:
        user.save()
    except IntegrityError as exc:
        raise InvalidParameter("تعذّر حفظ التعديلات: قيمة مكرّرة.") from exc
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
    user.role = role
    user.is_staff = role == Role.ADMIN
    user.save(update_fields=["role", "is_staff"])
    auth_services.ensure_profile(user)
    return user


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


# One coercer per field kind — the dispatch table replaces the old if-chain.
_COERCERS: dict[str, Callable[[Any], Any]] = {
    "number": int,
    "decimal": float,
    "bool": lambda value: value in (True, "true", "1", 1),
    "json": _json_coerce,
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
            # Clearing a text column is fine; a numeric one keeps its current value.
            if create and field.get("required"):
                errors.append(f"الحقل «{field['label']}» مطلوب.")
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
    values = values_for(spec, data, create=True)
    try:
        return spec["model"].objects.create(**values)
    except (IntegrityError, ValueError) as exc:
        raise InvalidParameter("تعذّر الإنشاء: بيانات غير صالحة أو مكرّرة.") from exc


def save_content_row(spec: dict, row: Any, data: dict[str, Any]) -> Any:
    """Patch one content row from validated values; duplicates are 400s."""
    values = values_for(spec, data, create=False)
    for attr, value in values.items():
        setattr(row, attr, value)
    try:
        row.save()
    except (IntegrityError, ValueError) as exc:
        raise InvalidParameter("تعذّر الحفظ: بيانات غير صالحة أو مكرّرة.") from exc
    return row
