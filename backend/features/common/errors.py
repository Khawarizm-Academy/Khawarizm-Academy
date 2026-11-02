"""The one error envelope, and the exceptions that render through it.

Every handled error body is `{"detail", "code", "fields"?}`: `detail` is the
Arabic line the SPA shows, `code` is the machine key it reacts to (the
auth-flow codes `login_locked`/`session_invalid`/`expired` keep their
existing keys — additive only), and `fields` appears only when validation
names specific inputs. DRF's own default details come translated through the
`ar` locale, so no English leaks through.
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from features.common.messages import (
    ASSET_IN_USE,
    NO_VIDEO,
    NOT_ENTITLED,
    OFFSET_MISMATCH,
    PROVIDER_REQUIRES_PACKAGING,
    RAW_BUSY,
    UPLOAD_SESSION_EXPIRED,
)


class InvalidParameter(exceptions.APIException):
    """A malformed parameter or payload; the 400 every feature routes through."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_parameter"
    default_detail = "معامل غير صالح."


class NotFound(exceptions.APIException):
    """No such row; call sites pass the entity-specific Arabic line."""

    status_code = status.HTTP_404_NOT_FOUND
    default_code = "not_found"
    default_detail = _("Not found.")  # DRF's ar locale translates the bare raise


class Conflict(exceptions.APIException):
    """A state clash the caller must resolve (e.g. an upload already running)."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"
    default_detail = "الطلب يتعارض مع الحالة الحالية."


class ProviderRequiresPackaging(InvalidParameter):
    default_code = "provider_requires_packaging"
    default_detail = PROVIDER_REQUIRES_PACKAGING


class NoVideo(Conflict):
    default_code = "no_video"
    default_detail = NO_VIDEO


class UploadOffsetMismatch(Conflict):
    default_code = "offset_mismatch"
    default_detail = OFFSET_MISMATCH

    def __init__(self, offset: int):
        self.fields = {"offset": offset}
        super().__init__(OFFSET_MISMATCH)


class UploadSessionExpired(Conflict):
    default_code = "upload_session_expired"
    default_detail = UPLOAD_SESSION_EXPIRED


class AssetInUse(Conflict):
    default_code = "asset_in_use"
    default_detail = ASSET_IN_USE

    def __init__(self, lessons):
        self.fields = {"lessons": lessons}
        super().__init__(ASSET_IN_USE)


class RawBusy(exceptions.APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_code = "raw_busy"
    default_detail = RAW_BUSY


class RangeNotSatisfiable(exceptions.APIException):
    status_code = status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE
    default_code = "range_not_satisfiable"
    default_detail = "نطاق الفيديو المطلوب غير صالح."


class PayloadTooLarge(exceptions.APIException):
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    default_code = "payload_too_large"
    default_detail = "الملف أكبر من الحد المسموح."


class UpstreamUnavailable(exceptions.APIException):
    """A provider call failed on our side of the wire."""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_code = "upstream_unavailable"
    default_detail = "تعذّر الوصول إلى الخدمة الخارجية."


def error_payload(detail: str, code: str) -> dict[str, str]:
    """The envelope for hand-built error bodies (ones needing custom headers)."""
    return {"detail": detail, "code": code}


# Statuses DRF can produce where the exception carries no specific code.
_STATUS_CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_406_NOT_ACCEPTABLE: "not_acceptable",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "unsupported_media_type",
    status.HTTP_429_TOO_MANY_REQUESTS: "throttled",
}


def _parts(exc: Exception) -> tuple[Any, str | None, dict | None]:
    """(detail, code, fields) for the envelope — `fields` only for input validation."""
    if hasattr(exc, "issues"):
        return (
            getattr(exc, "detail", str(exc)),
            getattr(exc, "default_code", "not_publishable"),
            {"issues": exc.issues},
        )
    if hasattr(exc, "fields"):
        detail = getattr(exc, "detail", None)
        code = getattr(exc, "code", None) or getattr(detail, "code", None) or getattr(exc, "default_code", None)
        return detail, code, exc.fields
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail
        fields = detail if isinstance(detail, dict) else {"non_field_errors": detail}
        first = next(
            (item for value in fields.values() for item in (value if isinstance(value, list) else [value])),
            None,
        )
        return (first if first is not None else str(exc.default_detail), "validation_error", fields)
    detail = getattr(exc, "detail", None)
    # Legacy dict-detail exceptions flatten into the envelope instead of nesting.
    if isinstance(detail, dict) and "detail" in detail:
        return (detail["detail"], detail.get("code"), None)
    # DRF attaches the machine code to the ErrorDetail, not to the exception;
    # SessionAuthError also sets it as an attribute with the real reason.
    code = getattr(exc, "code", None) or getattr(detail, "code", None) or getattr(exc, "default_code", None)
    return (detail, code, None)


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Render every handled error as the one envelope."""
    # DRF rebinds these internally, but on its own local reference — translate
    # again here so the envelope parts come from an APIException too.
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    response = exception_handler(exc, context)
    if response is None:
        return None
    detail, code, fields = _parts(exc)
    payload: dict[str, Any] = {
        "detail": detail,
        "code": code or _STATUS_CODES.get(response.status_code, "error"),
    }
    if fields is not None:
        payload["fields"] = fields
    response.data = payload
    return response


class PermissionDenied(exceptions.APIException):
    """A forbidden action rendered with the existing permission_denied code."""

    status_code = status.HTTP_403_FORBIDDEN
    default_code = "permission_denied"
    default_detail = "ليس لديك الصلاحية المطلوبة."


class NotEntitled(PermissionDenied):
    default_code = "not_entitled"
    default_detail = NOT_ENTITLED


class RoleHasMembers(Conflict):
    """A role with members needs an explicit replacement before deletion."""

    default_code = "role_has_members"
    default_detail = "لا يمكن حذف دور ما زال له أعضاء قبل إعادة إسنادهم."

    def __init__(self, detail=None, *, count: int | None = None):
        self.count = count
        super().__init__(detail)


class RoleMissing(InvalidParameter):
    """A legacy account-role request points to a role removed by an administrator."""

    default_code = "role_missing"
    default_detail = "الدور المطلوب غير موجود."


class HasEnrollments(Conflict):
    default_code = "has_enrollments"
    default_detail = "لا يمكن حذف دورة لها تسجيلات؛ أرشفها بدلاً من ذلك."


class NotPublishable(InvalidParameter):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "not_publishable"

    def __init__(self, issues):
        self.issues = issues
        super().__init__("الدورة غير جاهزة للنشر.")
