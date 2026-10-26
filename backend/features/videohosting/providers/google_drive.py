# Google Drive provider <- the providers registry, resumable upload helpers
# Drive stores the video files: the backend resumable-uploads into a Drive
# folder with the human OAuth grant persisted in DriveGrant (the service
# account carried no storage quota — it was retired). The bearer mints in
# features/videohosting/oauthdrive.py; this module never sees the token.
import json
import os
import time
import urllib.error
import urllib.request

from django.conf import settings

from features.videohosting.oauthdrive import access_token as oauth_access_token
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

# Every env key the Drive integration needs; the bucket comes from the
# persisted OAuth grant, so a half-configured environment raises naming the
# exact keys to set instead of failing inside a random HTTP call.
REQUIRED_SETTINGS = (
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
)

DRIVE_UPLOAD_SESSION_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id"

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
    """Google's error JSON in one line, or the bare HTTP wording."""
    try:
        payload = json.loads(_error_body(error))
        return payload.get("error", {}).get("message") or str(error)
    except Exception:
        return str(error)


def _403_hint(message: str) -> str:
    """One Arabic fix per known Drive 403 — a read-only share."""
    if "permissions" in message.lower():
        return message + " — وشارك مجلد الرفع مع الحساب المُخوَّل كـ Editor."
    return message


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
                if error.code == 403:
                    message = _403_hint(message)
                raise RuntimeError(f"فشل رفع مقطع إلى Drive: {message}") from error
            except Exception as error:
                last_error = error
                time.sleep(1)
        raise RuntimeError(f"تعذّر رفع مقطع إلى Drive: {last_error}")


def upload_probe() -> tuple[bool, str]:
    """One real 1-byte write into the folder, deleted after — (ok, detail).

    The token and folder walks can both pass while every upload still fails
    (a service account owns no storage quota), so the deep check proves the
    folder actually accepts bytes before calling Drive ready.
    """
    okay, bearer, detail = access_token()
    if not okay:
        return False, detail
    try:
        folder_id = (credentials()["GOOGLE_DRIVE_ROOT_FOLDER_ID"] or "").strip()
    except ValueError as exc:
        return False, str(exc)
    metadata = {"name": ".ingest-probe", "description": "videohosting deep-check probe", "parents": [folder_id]}
    open_request = urllib.request.Request(  # noqa: S310 — fixed Drive host
        DRIVE_UPLOAD_SESSION_URL,
        data=json.dumps(metadata).encode("utf-8"),
        method="POST",
        headers={"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(open_request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
            session_url = response.headers.get("Location", "")
        put_request = urllib.request.Request(  # noqa: S310 — fixed Drive host
            session_url, data=b"0", method="PUT",
            headers={"Authorization": f"Bearer {bearer}", "Content-Length": "1", "Content-Range": "bytes 0-0/1"},
        )
        with urllib.request.urlopen(put_request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed host
            file_id = str(json.loads(response.read().decode("utf-8")).get("id", ""))
    except urllib.error.HTTPError as error:
        return False, _drive_error_message(error) if error.code != 403 else _403_hint(_drive_error_message(error))
    except Exception as exc:
        return False, f"تعذّر الاتصال بـ Drive: {exc}"
    if not session_url or not file_id:
        return False, "لم يكتمل probe الرفع — راجع عناوين ردّ Google."
    delete_request = urllib.request.Request(  # noqa: S310 — fixed Drive host
        f"https://www.googleapis.com/drive/v3/files/{file_id}", method="DELETE",
        headers={"Authorization": f"Bearer {bearer}"},
    )
    cleaned = "وتم حذفه."
    try:
        urllib.request.urlopen(delete_request, timeout=REQUEST_SECONDS)  # noqa: S310 — fixed host
    except Exception:
        cleaned = "(تعذّر حذفه تلقائيًّا — احذفه يدويًّا.)"
    return True, f"كتب 1 بايت في المجلد {cleaned}"
