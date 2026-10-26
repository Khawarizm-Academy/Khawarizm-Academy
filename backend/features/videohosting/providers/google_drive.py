# Google Drive provider <- identity + ingest hooks + diagnostic checks.
# Drive stores the video files: resumable-uploads into a Drive folder using
# the human OAuth grant persisted in DriveGrant (the service account carried
# no storage quota — it was retired). This module owns the upload service,
# the 1-byte write probe for deep checks, and every hint that explains why
# configuration may fail.
import json
import os
import time
import urllib.error
import urllib.request

from django.conf import settings

from features.videohosting.oauthdrive import access_token as oauth_access_token
from features.videohosting.providers.base import (
    ProviderSpec,
    Check,
    check,
    _identity,
    blocking_checks,
)


# ── constants ──────────────────────────────────────────────────────────
REQUIRED_SETTINGS = (
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
)
DRIVE_UPLOAD_SESSION_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id"
CHUNK_BYTES = 256 * 1024            # Drive's resumable protocol requires multiples of this
RETRIES_PER_CHUNK = 3
REQUEST_SECONDS = 30


# ── credentials & token (public utilities) ─────────────────────────────
def credentials() -> dict[str, str]:
    """The configured Drive credentials, failing loudly and naming each missing key."""
    values = {key: getattr(settings, key) or "" for key in REQUIRED_SETTINGS}
    missing = [key for key in REQUIRED_SETTINGS if not values[key]]
    if missing:
        raise ValueError(f"Google Drive is not configured — set {', '.join(missing)} in the environment")
    return values


def access_token() -> tuple[bool, str, str]:
    """The bearer for every Drive call — minted by the persisted OAuth grant."""
    return oauth_access_token()


def _error_body(error: urllib.error.HTTPError) -> str:
    try:
        return error.read().decode("utf-8")
    except Exception:
        return ""


def _drive_error_message(error: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(_error_body(error))
        return payload.get("error", {}).get("message") or str(error)
    except Exception:
        return str(error)


def _403_hint(message: str) -> str:
    if "permissions" in message.lower():
        return message + " — وشارك مجلد الرفع مع الحساب المُخوَّل كـ Editor."
    return message


# ── upload service ─────────────────────────────────────────────────────
class GoogleDriveService:
    """Stores one file in the configured Drive folder via a resumable session.

    Plain HTTPS — no heavyweight SDK. Streams in 256 KiB chunks under
    Drive's resumable protocol, so `on_bytes(sent, total)` ticks progress.
    """

    def __init__(self) -> None:
        self.folder_id = (credentials()["GOOGLE_DRIVE_ROOT_FOLDER_ID"] or "").strip()
        self._bearer = ""

    def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict[str, object]:
        """One resumable upload; returns the parts the ingest stores."""
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
        metadata = {"name": os.path.basename(file_path), "description": caption, "parents": [self.folder_id]}
        request = urllib.request.Request(  # noqa: S310 — fixed host
            DRIVE_UPLOAD_SESSION_URL, data=json.dumps(metadata).encode("utf-8"), method="POST",
            headers={"Authorization": f"Bearer {self._bearer}", "Content-Type": "application/json",
                     "X-Upload-Content-Type": "application/octet-stream"},
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310
                session_url = response.headers.get("Location", "")
        except urllib.error.HTTPError as error:
            message = _drive_error_message(error)
            if error.code == 403:
                message = _403_hint(message)
            if error.code == 404:
                message += " — وشارك مجلد الرفع مع بريد حساب الخدمة إن كنت تستخدمه."
            raise RuntimeError(f"فشل فتح جلسة الرفع على Drive: {message}") from error
        except Exception as exc:
            raise RuntimeError(f"تعذّر الاتصال بـ Drive: {exc}") from exc
        if not session_url:
            raise RuntimeError("Google Drive لم يعيد رابط الرفع التدفّقي.")
        return session_url

    def _stream_chunks(self, file_path: str, session_url: str, on_bytes) -> str:
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
        headers = {
            "Authorization": f"Bearer {self._bearer}",
            "Content-Length": str(len(chunk)),
            "Content-Range": f"bytes {start}-{end - 1}/{size if is_final else '*'}",
        }
        last_error: Exception | None = None
        for attempt in range(RETRIES_PER_CHUNK):
            try:
                request = urllib.request.Request(session_url, data=chunk, method="PUT", headers=headers)  # type: ignore[arg-type]
                with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310
                    if is_final:
                        payload = json.loads(response.read().decode("utf-8"))
                        file_id = str(payload.get("id", ""))
                        if not file_id:
                            raise RuntimeError("Google Drive لم يعيد معرّف الملف بعد آخر مقطع.")
                        return file_id
                    return ""
            except urllib.error.HTTPError as error:
                if error.code == 308 and not is_final:
                    return ""
                message = _drive_error_message(error)
                if error.code >= 500:
                    last_error = error
                    time.sleep(1)
                    continue
                if error.code == 308:
                    raise RuntimeError("Google Drive لم يقبل آخر مقطع — الجلسة لم تكتمل.") from error
                if error.code == 403:
                    message = _403_hint(message)
                raise RuntimeError(f"فشل رفع مقطع إلى Drive: {message}") from error
            except Exception as error:
                last_error = error
                time.sleep(1)
        raise RuntimeError(f"تعذّر رفع مقطع إلى Drive: {last_error}")


# ── diagnostics hooks ────────────────────────────────────────────────
def _drive_env_checks() -> list[Check]:
    client_id = (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()
    client_secret = (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip()
    folder = (settings.GOOGLE_DRIVE_ROOT_FOLDER_ID or "").strip()
    callback = (settings.GOOGLE_DRIVE_OAUTH_REDIRECT_URI or "").strip()
    grant = oauth_connected()
    return [
        check("client_id", "معرّف عميل OAuth (GOOGLE_DRIVE_CLIENT_ID)", bool(client_id),
              "متوفر." if client_id else "غير مضبوط."),
        check("client_secret", "سر العميل (GOOGLE_DRIVE_CLIENT_SECRET)", bool(client_secret),
              "متوفر." if client_secret else "غير مضبوط."),
        check("root_folder", "مجلد الرفع (GOOGLE_DRIVE_ROOT_FOLDER_ID)", bool(folder),
              f"متوفر: {folder}" if folder else "غير مضبوط."),
        check("redirect_uri", "رابط إعادة التخويل (GOOGLE_DRIVE_OAUTH_REDIRECT_URI)", bool(callback),
              f"متوفر: {callback}" if callback else "غير مضبوط."),
        check("oauth_grant", "تخويل حساب Google مُخزَّن (DriveGrant)",
              bool(grant["connected"]),
              f"مرتبط بـ {grant['account_email']}." if grant["connected"]
              else (grant["error_message"] if grant["error_message"] else "لم يُؤدَّ تخويل حساب Google بعد.")),
    ]


def _drive_deep_checks() -> list[Check]:
    if blocking_checks(_drive_env_checks()):
        return []
    token_ok, bearer, detail = access_token()
    checks = [check("drive_token", "المصادقة مقابل Google (التوكيل المخزَّن)", token_ok, detail)]
    if token_ok:
        probe_ok, probe_detail = upload_probe()
        checks.append(check("drive_probe", "تجربة كتابة فعلية (1 بايت)", probe_ok, probe_detail))
    return checks


def oauth_connected() -> dict:
    """The auth-bound connection state — called by diagnostics only."""
    from features.videohosting.oauthdrive import connected as _conn
    return _conn()


def upload_probe() -> tuple[bool, str]:
    """One real 1-byte write into the folder, deleted after — (ok, detail)."""
    okay, bearer, detail = access_token()
    if not okay:
        return False, detail
    try:
        folder_id = (credentials()["GOOGLE_DRIVE_ROOT_FOLDER_ID"] or "").strip()
    except ValueError as exc:
        return False, str(exc)
    metadata = {"name": ".ingest-probe", "description": "videohosting deep-check probe", "parents": [folder_id]}
    open_req = urllib.request.Request(  # noqa: S310
        DRIVE_UPLOAD_SESSION_URL, data=json.dumps(metadata).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(open_req, timeout=REQUEST_SECONDS) as response:  # noqa: S310
            session_url = response.headers.get("Location", "")
        put_req = urllib.request.Request(  # noqa: S310
            session_url, data=b"0", method="PUT",
            headers={"Authorization": f"Bearer {bearer}", "Content-Length": "1", "Content-Range": "bytes 0-0/1"},
        )
        with urllib.request.urlopen(put_req, timeout=REQUEST_SECONDS) as response:  # noqa: S310
            file_id = str(json.loads(response.read().decode("utf-8")).get("id", ""))
    except urllib.error.HTTPError as error:
        return False, _drive_error_message(error) if error.code != 403 else _403_hint(_drive_error_message(error))
    except Exception as exc:
        return False, f"تعذّر الاتصال بـ Drive: {exc}"
    if not session_url or not file_id:
        return False, "لم يكتمل probe الرفع — راجع عناوين ردّ Google."
    delete_req = urllib.request.Request(  # noqa: S310
        f"https://www.googleapis.com/drive/v3/files/{file_id}", method="DELETE",
        headers={"Authorization": f"Bearer {bearer}"},
    )
    cleaned = "وتم حذفه."
    try:
        urllib.request.urlopen(delete_req, timeout=REQUEST_SECONDS)  # noqa: S310
    except Exception:
        cleaned = "(تعذّر حذفه تلقائيًّا — احذفه يدويًّا.)"
    return True, f"كتب 1 بايت في المجلد {cleaned}"


# ── ingest hook ───────────────────────────────────────────────────────
class _DrProviderIngest:
    """Google Drive store-source leg — staged only, no HLS packaging."""

    @staticmethod
    def store_source(service: "GoogleDriveService", asset, source, upload_args: dict | None) -> dict:
        """Publish the source and return row fields to write back."""
        uploaded = service.upload_file(str(source), caption=f"source · {asset.slug}", **(upload_args or {}))
        part = uploaded["parts"][0]
        return {
            "source_file_id": str(part["file_id"]),
            "source_size_bytes": part["size_bytes"],
            "source_file_name": (getattr(asset, "source_file_name", "") or str(source.name)),
        }


# ── THE spec (last — all symbols above are now available) ─────────────
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
    segment_redirect=_identity,     # Drive does not use CDN redirects like Telegram
    ingest=_DrProviderIngest(),     # store_source only; no HLS packaging
    env_checks=_drive_env_checks,
    deep_checks=_drive_deep_checks,
    hints={
        "client_id": "أضف GOOGLE_DRIVE_CLIENT_ID من Google Cloud Console → Credentials",
        "client_secret": "أضف GOOGLE_DRIVE_CLIENT_SECRET لنفس عميل OAuth",
        "root_folder": "أضف GOOGLE_DRIVE_ROOT_FOLDER_ID (من رابط المجلد في Drive) للمجلد الذي ستُرفع إليه الفيديوهات",
        "redirect_uri": "أضف GOOGLE_DRIVE_OAUTH_REDIRECT_URI (مثال: http://localhost:8000/api/admin/video-drive/oauth/callback) وسجّله على عميل OAuth",
        "oauth_grant": "المسؤول يفتح «تخويل حساب Google» من لوحة الإدارة لربط الحساب صاحب مجلد الرفع",
        "drive_token": "تخويل Google منسوخ أو منتهي — المسؤول يفتح «تخويل حساب Google» من لوحة الإدارة من جديد",
        "drive_probe": "تعذّر الكتابة الفعلية إلى المجلد — راجع صلاحيات الحساب المُخوَّل على المجلد",
    },
)
