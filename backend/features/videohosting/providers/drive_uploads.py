"""Low-level, server-side Google Drive resumable-upload protocol helpers.

The caller owns OAuth token acquisition and persistence.  This module only
accepts an already cached bearer and never logs or returns it.  A Drive
resumable-session URI is deliberately kept as an in-process/server-side value;
callers must not put it in a browser response or serialize it to an untrusted
client.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

DRIVE_UPLOAD_SESSION_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id"
GOOGLE_UPLOAD_HOSTS = frozenset({"www.googleapis.com", "upload.googleapis.com", "content.googleapis.com"})
CHUNK_BYTES = 4 * 1024 * 1024
REQUEST_SECONDS = 30
MAX_ATTEMPTS = 3


class DriveUploadError(RuntimeError):
    """A bounded, non-sensitive Drive upload protocol failure."""

    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class DriveUploadExpired(DriveUploadError):
    """The resumable session no longer exists (Drive returned HTTP 404)."""


class InvalidDriveSessionURI(DriveUploadError, ValueError):
    """A session URI is not an HTTPS URI on an approved Google upload host."""


class MalformedDriveRange(DriveUploadError):
    """Drive returned a malformed committed-byte Range header."""


@dataclass(frozen=True, slots=True)
class UploadResult:
    """Authoritative upload state returned by Drive.

    ``next_offset`` is the next byte that the caller may submit.  It is based
    only on Drive's response (or the known total for a successful final
    response), never on the number of bytes the caller attempted to send.
    """

    next_offset: int
    file_id: str | None = None
    complete: bool = False

    @property
    def offset(self) -> int:
        """Compatibility spelling for API callers that call this ``offset``."""
        return self.next_offset

    @property
    def committed_offset(self) -> int:
        return self.next_offset

    def as_dict(self) -> dict[str, Any]:
        """Return only safe protocol state for a caller's own response shaping."""
        return {
            "offset": self.next_offset,
            "complete": self.complete,
            **({"file_id": self.file_id} if self.file_id else {}),
        }


def start_session(
    file_name: str,
    mime_type: str,
    size: int,
    root_folder_id: str,
    bearer: str,
    *,
    max_attempts: int = MAX_ATTEMPTS,
) -> str:
    """Start a Drive resumable upload and return its validated URI.

    The URI is useful only to trusted server code.  It is returned here so a
    server-side integration can store/use it, but this helper never serializes
    it or places it in an exception message.
    """
    if not isinstance(file_name, str) or not file_name:
        raise ValueError("file_name is required")
    if not isinstance(mime_type, str) or not mime_type:
        raise ValueError("mime_type is required")
    if not isinstance(root_folder_id, str) or not root_folder_id.strip():
        raise ValueError("root_folder_id is required")
    _validate_size(size)
    _validate_bearer(bearer)

    metadata = {
        "name": file_name,
        "mimeType": mime_type,
        "parents": [root_folder_id.strip()],
    }
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mime_type,
        "X-Upload-Content-Length": str(size),
    }
    request = urllib.request.Request(
        DRIVE_UPLOAD_SESSION_URL,
        data=json.dumps(metadata, separators=(",", ":")).encode("utf-8"),
        method="POST",
        headers=headers,
    )

    response = _open_with_retries(request, max_attempts=max_attempts)
    status = _response_status(response)
    if status < 200 or status >= 300:
        raise DriveUploadError("Drive did not open an upload session", status=status)
    session_uri = _header(response.headers, "Location")
    if not session_uri:
        raise DriveUploadError("Drive did not return an upload session URI", status=status)
    return validate_session_uri(session_uri)


def send_chunk(
    session_uri: str,
    bearer: str,
    chunk: bytes,
    start: int,
    total: int,
    *,
    max_attempts: int = MAX_ATTEMPTS,
) -> UploadResult:
    """Send one raw binary chunk and parse Drive's authoritative response."""
    session_uri = validate_session_uri(session_uri)
    _validate_bearer(bearer)
    if not isinstance(chunk, bytes):
        raise TypeError("chunk must be bytes")
    _validate_size(total)
    if not isinstance(start, int) or start < 0 or start > total:
        raise ValueError("start must be within the upload total")
    if not chunk or start + len(chunk) > total:
        raise ValueError("chunk must be non-empty and fit within the upload total")

    end = start + len(chunk) - 1
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Length": str(len(chunk)),
        "Content-Range": f"bytes {start}-{end}/{total}",
    }
    request = urllib.request.Request(session_uri, data=chunk, method="PUT", headers=headers)
    response_or_error = _open_with_retries(request, max_attempts=max_attempts, allow_resume_incomplete=True)
    status, headers, body = _response_parts(response_or_error)
    return parse_upload_response(status, headers, body, total=total)


def probe_offset(
    session_uri: str,
    bearer: str,
    total: int,
    *,
    max_attempts: int = MAX_ATTEMPTS,
) -> UploadResult:
    """Observe the committed offset with Drive's empty PUT status query.

    This request is intentionally repeatable observation, not a claim that
    Google guarantees idempotency for arbitrary upload submissions.
    """
    session_uri = validate_session_uri(session_uri)
    _validate_bearer(bearer)
    _validate_size(total)
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Length": "0",
        "Content-Range": f"bytes */{total}",
    }
    request = urllib.request.Request(session_uri, data=b"", method="PUT", headers=headers)
    response_or_error = _open_with_retries(request, max_attempts=max_attempts, allow_resume_incomplete=True)
    status, response_headers, body = _response_parts(response_or_error)
    return parse_upload_response(status, response_headers, body, total=total)


def parse_upload_response(
    status: int,
    headers: Mapping[str, str] | Any,
    body: bytes | str = b"",
    *,
    total: int | None = None,
) -> UploadResult:
    """Parse an upload response into only committed next-offset state.

    Drive's incomplete response is 308 and its ``Range`` may be either
    ``bytes=0-N`` or ``bytes 0-N``.  Missing ``Range`` means zero committed
    bytes.  HTTP 200/201 are completion; 404 is an expired session.
    """
    if status == 404:
        raise DriveUploadExpired("Drive upload session expired", status=404)
    if status == 308:
        return UploadResult(next_offset=_next_offset_from_range(_header(headers, "Range")), complete=False)
    if status in (200, 201):
        if total is None:
            raise ValueError("total is required when parsing a completed upload")
        _validate_size(total)
        return UploadResult(next_offset=total, file_id=_file_id_from_body(body), complete=True)
    raise DriveUploadError("Drive upload returned an unexpected status", status=status)


def cancel_session(
    session_uri: str,
    bearer: str,
    *,
    max_attempts: int = MAX_ATTEMPTS,
) -> bool:
    """Best-effort cancellation; never leaks a session URI or bearer.

    A 404 counts as already gone.  Any other remote/network failure is
    swallowed and reported as ``False`` so cancellation cannot mask the
    caller's primary failure or cancellation path.
    """
    try:
        session_uri = validate_session_uri(session_uri)
        _validate_bearer(bearer)
        request = urllib.request.Request(
            session_uri,
            data=b"",
            method="DELETE",
            headers={"Authorization": f"Bearer {bearer}", "Content-Length": "0"},
        )
        response = _open_with_retries(request, max_attempts=max_attempts)
        return 200 <= _response_status(response) < 300
    except DriveUploadExpired:
        return True
    except Exception:
        return False


def validate_session_uri(session_uri: str) -> str:
    """Validate a returned URI before any bearer-authenticated request."""
    if not isinstance(session_uri, str):
        raise InvalidDriveSessionURI("Drive returned an invalid upload session URI")
    try:
        parsed = urllib.parse.urlsplit(session_uri)
        port = parsed.port
    except ValueError:
        raise InvalidDriveSessionURI("Drive returned an invalid upload session URI") from None
    if (
        parsed.scheme.lower() != "https"
        or port not in (None, 443)
        or parsed.username
        or parsed.password
        or parsed.hostname not in GOOGLE_UPLOAD_HOSTS
        or not parsed.path.startswith("/upload/")
        or parsed.fragment
    ):
        raise InvalidDriveSessionURI("Drive returned an untrusted upload session URI")
    return session_uri


# Explicit aliases make the protocol vocabulary easy to use from the parent
# integration without introducing another abstraction layer.
start_resumable_session = start_session
send_raw_chunk = send_chunk
probe_committed_offset = probe_offset
finalize_result = parse_upload_response
cancel_upload = cancel_session


def _open_with_retries(
    request: urllib.request.Request,
    *,
    max_attempts: int,
    allow_resume_incomplete: bool = False,
) -> Any:
    attempts = _bounded_attempts(max_attempts)
    for attempt in range(attempts):
        try:
            return urllib.request.urlopen(request, timeout=REQUEST_SECONDS)
        except urllib.error.HTTPError as error:
            if allow_resume_incomplete and error.code == 308:
                return error
            if error.code == 404:
                raise DriveUploadExpired("Drive upload session expired", status=404) from None
            if error.code not in (408, 429) and not 500 <= error.code <= 599:
                raise DriveUploadError("Drive upload request was rejected", status=error.code) from None
        except urllib.error.URLError, TimeoutError, OSError:
            pass
        if attempt + 1 < attempts:
            time.sleep(min(0.25, 0.05 * (2**attempt)))
    raise DriveUploadError("Drive upload request failed after bounded retries") from None


def _response_parts(response_or_error: Any) -> tuple[int, Mapping[str, str], bytes]:
    if isinstance(response_or_error, urllib.error.HTTPError):
        return response_or_error.code, response_or_error.headers or {}, b""
    return (
        _response_status(response_or_error),
        response_or_error.headers or {},
        _read_body(response_or_error),
    )


def _response_status(response: Any) -> int:
    status = getattr(response, "status", None)
    if status is None:
        status = response.getcode()
    return int(status)


def _read_body(response: Any) -> bytes:
    payload = response.read()
    if isinstance(payload, bytes):
        return payload
    if isinstance(payload, str):
        return payload.encode("utf-8")
    return bytes(payload or b"")


def _file_id_from_body(body: bytes | str) -> str | None:
    if not body:
        return None
    try:
        payload = json.loads(body.decode("utf-8") if isinstance(body, bytes) else body)
    except TypeError, ValueError, UnicodeDecodeError:
        raise DriveUploadError("Drive returned an invalid completion payload") from None
    if not isinstance(payload, dict):
        raise DriveUploadError("Drive returned an invalid completion payload")
    value = payload.get("id")
    return str(value) if value else None


def _next_offset_from_range(value: str | None) -> int:
    if not value:
        return 0
    text = str(value).strip()
    if text.lower().startswith("bytes=") or text.lower().startswith("bytes "):
        text = text[6:].strip()
    else:
        raise MalformedDriveRange("Drive returned a malformed upload Range")
    if "-" not in text:
        raise MalformedDriveRange("Drive returned a malformed upload Range")
    first, last = (part.strip() for part in text.split("-", 1))
    if not first.isdigit() or not last.isdigit():
        raise MalformedDriveRange("Drive returned a malformed upload Range")
    start, end = int(first), int(last)
    if end < start:
        raise MalformedDriveRange("Drive returned a malformed upload Range")
    return end + 1


def _header(headers: Mapping[str, str] | Any, name: str) -> str:
    value = headers.get(name, "") if headers is not None else ""
    if not value and headers is not None:
        value = headers.get(name.lower(), "")
    return str(value).strip() if value else ""


def _validate_bearer(bearer: str) -> None:
    if not isinstance(bearer, str) or not bearer.strip():
        raise ValueError("bearer is required")


def _validate_size(size: int) -> None:
    if not isinstance(size, int) or isinstance(size, bool) or size < 0:
        raise ValueError("size must be a non-negative integer")


def _bounded_attempts(max_attempts: int) -> int:
    if not isinstance(max_attempts, int) or isinstance(max_attempts, bool):
        raise ValueError("max_attempts must be an integer")
    return max(1, min(max_attempts, MAX_ATTEMPTS))
