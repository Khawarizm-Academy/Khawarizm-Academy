# Google Drive provider <- the providers registry, resumable upload helpers
# Drive stores the video files: the backend resumable-uploads into a Drive
# folder with the OAuth credentials and serves playback through short-lived
# grants, never a raw, shareable file URL.
#
# Auth is dual-mode: the refresh token mints short-lived Access Tokens (OAuth),
# or the service-account JSON signs its own RS256 JWT — whichever works first.
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from django.conf import settings

from features.videohosting.providers.base import ProviderSpec

GOOGLE_DRIVE = ProviderSpec(
    code="google_drive",
    name="Google Drive",
    is_enabled=True,
    is_default=True,
    capabilities={
        "resumableUpload": True,
        "privateAccess": True,
        "requiresAuth": True,
        "playback": "provider_managed_or_limited",
    },
)

# Every env key the OAuth path needs; SERVICE_ACCOUNT_JSON is the headless
# alternative to REFRESH_TOKEN, and one of the two must be present.
REQUIRED_SETTINGS = (
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
)

DRIVE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_UPLOAD_SESSION_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id"
DRIVE_SCOPE = "https://www.googleapis.com/auth/drive"

# Drive's resumable protocol rejects chunks that are not multiples of this.
CHUNK_BYTES = 256 * 1024
RETRIES_PER_CHUNK = 3
REQUEST_SECONDS = 30


def credentials() -> dict[str, str]:
    """The configured Drive credentials, failing loudly and naming each missing key.

    config/settings.py is the only place env values are read; provider code
    accesses them here, so a half-configured environment raises with the exact
    keys to set instead of failing later inside a random HTTP call.
    """
    values = {key: getattr(settings, key) or "" for key in REQUIRED_SETTINGS}
    missing = [key for key in REQUIRED_SETTINGS if not values[key]]
    honoring_auth = bool(
        (settings.GOOGLE_DRIVE_REFRESH_TOKEN or "").strip()
        or (settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or "").strip()
    )
    if not honoring_auth:
        raise ValueError(
            "Google Drive is not configured — set GOOGLE_DRIVE_REFRESH_TOKEN (OAuth) "
            "or GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (headless) in the environment"
        )
    if missing:
        raise ValueError(f"Google Drive is not configured — set {', '.join(missing)} in the environment")
    return values


def parse_service_account(raw: str) -> dict | None:
    """The service-account env value is raw JSON or base64 — dict or None."""
    candidate = raw.strip()
    if not candidate:
        return None
    if not candidate.startswith("{"):
        try:
            candidate = base64.b64decode(candidate).decode("utf-8")
        except Exception:
            return None
    try:
        parsed = json.loads(candidate)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) and parsed.get("client_email") and parsed.get("private_key") else None


def exchange_refresh_token(refresh_token: str) -> tuple[bool, str, str]:
    """Exchange the refresh token — (ok, bearer token, detail).

    The uploader reaches this through `access_token()`, so there is exactly
    one OAuth exchange in the codebase.
    """
    body = urllib.parse.urlencode({
        "client_id": (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip(),
        "client_secret": (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip(),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }).encode("utf-8")
    request = urllib.request.Request(  # noqa: S310 — fixed OAuth host, POST to its own API
        DRIVE_TOKEN_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        text = _error_body(error)
        if "invalid_grant" in text:
            return False, "", (
                "refresh token منتهي أو منسحب — أعد توليده (OAuth) وضع GOOGLE_DRIVE_REFRESH_TOKEN جديدًا."
            )
        return False, "", f"رفض OAuth الطلب: {text[:200] or error}"
    except Exception as exc:
        return False, "", f"تعذّر الاتصال: {exc}"
    bearer = payload.get("access_token", "")
    if not bearer:
        return False, "", f"رفض OAuth الطلب: {payload.get('error_description', payload.get('error', 'غير معروف'))}"
    return True, bearer, "حصل على access token بنجاح."


def service_account_token(service_account: dict) -> tuple[bool, str, str]:
    """Sign one RS256 JWT for the service account and mint a bearer token.

    Google's machine protocol: base64url(header).base64url(claims) signed
    with the account's private key, posted as a jwt-bearer grant.
    """
    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": service_account["client_email"],
        "scope": DRIVE_SCOPE,
        "aud": DRIVE_TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = f"{_b64url(header)}.{_b64url(claims)}"
    try:
        key = load_pem_private_key(service_account["private_key"].encode("utf-8"), password=None)
        signature = key.sign(signing_input.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256())
    except Exception as exc:
        return False, "", f"مفتاح حساب الخدمة غير صالح: {exc}"
    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": f"{signing_input}.{_b64url(signature)}",
    }).encode("utf-8")
    request = urllib.request.Request(  # noqa: S310 — fixed OAuth host, POST to its own API
        DRIVE_TOKEN_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return False, "", f"تعذّر اتصال حساب الخدمة: {exc}"
    bearer = payload.get("access_token", "")
    if not bearer:
        return False, "", f"رفض Google مصادقة حساب الخدمة: {payload.get('error_description', 'غير معروف')}"
    return True, bearer, "حصل على access token عبر حساب الخدمة بنجاح."


def access_token() -> tuple[bool, str, str]:
    """Mint a bearer with the first auth mode that works; both details on failure.

    The refresh token goes first (it is a human's grant); the service account
    is the automatic fallback when that token was revoked or expired.
    """
    failures: list[str] = []
    refresh = (settings.GOOGLE_DRIVE_REFRESH_TOKEN or "").strip()
    if refresh:
        ok, bearer, detail = exchange_refresh_token(refresh)
        if ok:
            return True, bearer, detail
        failures.append(f"refresh token: {detail}")
    service_account = parse_service_account(settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or "")
    if service_account is not None:
        ok, bearer, detail = service_account_token(service_account)
        if ok:
            return True, bearer, detail
        failures.append(f"حساب الخدمة: {detail}")
    if not failures:
        return False, "", "لا refresh token ولا حساب خدمة صالح — راجع «فحص المنظومة»."
    return False, "", " — ".join(failures)


def _b64url(payload: dict | bytes) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8") if isinstance(payload, dict) else payload
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _error_body(error: urllib.error.HTTPError) -> str:
    try:
        return error.read().decode("utf-8")
    except Exception:
        return ""


def _drive_error_message(error: urllib.error.HTTPError) -> str:
    """Google's error JSON in one line, or the bare HTTP wording."""
    try:
        payload = json.loads(_error_body(error))
        return payload.get("error", {}).get("message") or str(error)
    except Exception:
        return str(error)


class GoogleDriveService:
    """Stores one file in the configured Drive folder via a resumable session.

    Plain HTTPS — no heavyweight SDK. The upload streams in 256 KiB chunks
    under Drive's resumable protocol, so `on_bytes(sent, total)` receives a
    real byte tick per chunk for the ingest's progress tracker.
    """

    def __init__(self) -> None:
        self.folder_id = (credentials()["GOOGLE_DRIVE_ROOT_FOLDER_ID"] or "").strip()
        self._bearer = ""

    def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict[str, object]:
        """One resumable upload; returns the parts the ingest stores.

        The shape mirrors TelegramMediaService.upload_file so the ingest can
        treat both providers with the same vocabulary.
        """
        self._token()
        session_url = self._start_session(file_path, caption)
        file_id = self._stream_chunks(file_path, session_url, on_bytes)
        return {"is_split": False, "parts": [{"file_id": file_id, "size_bytes": os.path.getsize(file_path)}]}

    def _token(self) -> None:
        ok, bearer, detail = access_token()
        if not ok:
            raise RuntimeError(f"تعذّر مصادقة Google Drive: {detail}")
        self._bearer = bearer

    def _start_session(self, file_path: str, caption: str) -> str:
        """POST the file's metadata and take back the resumable upload URL."""
        metadata = {
            "name": os.path.basename(file_path),
            "description": caption,
            "parents": [self.folder_id],
        }
        request = urllib.request.Request(  # noqa: S310 — fixed Drive host
            DRIVE_UPLOAD_SESSION_URL,
            data=json.dumps(metadata).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self._bearer}",
                "Content-Type": "application/json",
                "X-Upload-Content-Type": "application/octet-stream",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
                session_url = response.headers.get("Location", "")
        except urllib.error.HTTPError as error:
            message = _drive_error_message(error)
            if error.code == 404:
                message += " — وشارك مجلد الرفع مع بريد حساب الخدمة إن كنت تستخدمه."
            raise RuntimeError(f"فشل فتح جلسة الرفع على Drive: {message}") from error
        except Exception as exc:
            raise RuntimeError(f"تعذّر الاتصال بـ Drive: {exc}") from exc
        if not session_url:
            raise RuntimeError("Google Drive لم يعيد رابط الرفع التدفّقي.")
        return session_url

    def _stream_chunks(self, file_path: str, session_url: str, on_bytes) -> str:
        """PUT chunk after chunk, ticking progress; the final PUT returns the id."""
        size = os.path.getsize(file_path)
        uploaded = 0
        file_id = ""
        with open(file_path, "rb") as source:
            while uploaded < size:
                chunk = source.read(CHUNK_BYTES)
                end = uploaded + len(chunk)
                is_final = end == size
                landed = self._put_chunk(session_url, chunk, uploaded, end, size, is_final)
                if landed:
                    file_id = landed
                uploaded = end
                if on_bytes is not None:
                    on_bytes(uploaded, size)
        return file_id

    def _put_chunk(self, session_url: str, chunk: bytes, start: int, end: int, size: int, is_final: bool) -> str:
        """One resumable PUT — "" for intermediate chunks, the id for the last.

        A failed intermediate chunk is re-PUT within the same session (that is
        exactly what the protocol's resume support is for).
        """
        headers = {
            "Authorization": f"Bearer {self._bearer}",
            "Content-Length": str(len(chunk)),
            "Content-Range": f"bytes {start}-{end - 1}/{size if is_final else '*'}",
        }
        last_error: Exception | None = None
        for attempt in range(RETRIES_PER_CHUNK):
            try:
                request = urllib.request.Request(session_url, data=chunk, method="PUT", headers=headers)  # type: ignore[arg-type]
                with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
                    if is_final:
                        payload = json.loads(response.read().decode("utf-8"))
                        file_id = str(payload.get("id", ""))
                        if not file_id:
                            raise RuntimeError("Google Drive لم يعيد معرّف الملف بعد آخر مقطع.")
                        return file_id
                    return ""
            except urllib.error.HTTPError as error:
                if error.code == 308 and not is_final:
                    # The protocol's normal "accepted, keep going" answer —
                    # urllib paints it as an error because its default opener
                    # has no 308 handler.
                    return ""
                message = _drive_error_message(error)
                if error.code >= 500:
                    last_error = error
                    time.sleep(1)
                    continue
                if error.code == 308:
                    raise RuntimeError("Google Drive لم يقبل آخر مقطع — الجلسة لم تكتمل.") from error
                if error.code == 403 and "permissions" in message.lower():
                    message += " — وشارك مجلد الرفع مع بريد حساب الخدمة كـ Editor."
                raise RuntimeError(f"فشل رفع مقطع إلى Drive: {message}") from error
            except Exception as error:
                last_error = error
                time.sleep(1)
        raise RuntimeError(f"تعذّر رفع مقطع إلى Drive: {last_error}")
