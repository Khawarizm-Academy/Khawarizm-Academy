# Telegram provider <- identity + ingest hooks + diagnostic checks.
# Wraps Pyrogram so a Telegram channel acts as unlimited video storage: upload
# (>2GB auto-split), 1 MiB chunk streaming, and Bot API file-path resolution.
# Serving paths never import Pyrogram — they refresh file paths over plain HTTPS.
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
import urllib.parse
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from django.conf import settings

from features.videohosting.providers.base import (
    SEVERITY_WARN,
    Check,
    ProviderSpec,
    ProviderUpload,
    ProviderUploadCompletion,
    ProviderUploadError,
    ProviderUploadStart,
    ProviderUploadState,
    blocking_checks,
    check,
)

# Ingest-side progress reporting: the provider layer only calls the tracker's
# duck-typed publish hooks — no runtime import (ingest imports providers).
if TYPE_CHECKING:
    from features.videohosting.ingest import ProgressTracker

# The storage thresholds and retryable conditions in one record.
CHUNK_SIZE = 1024 * 1024  # streaming chunk size — matches Pyrogram 1 MiB
SPLIT_THRESHOLD_BYTES = 1950 * 1024 * 1024  # bot upload cap; larger files split first
RETRYABLE_ERRORS = (OSError, TimeoutError)  # connection blips — safe to reconnect
REMOTE_DELETE_SECONDS = 10


# The Pyrogram-backed media service: persistent client, event-loop safe.
class TelegramMediaService:
    """Persistent Pyrogram client bound to one event loop (ingest + relay paths)."""

    def __init__(self) -> None:
        self.channel_id: int | str = self._parse_channel_id(settings.TELEGRAM_CHANNEL_ID)
        self.session_name = "khawarizm_videohosting_session"
        self.client = None
        self._is_started = False
        self._start_lock = asyncio.Lock()  # concurrent requests double-init prevention

    @staticmethod
    def _parse_channel_id(raw: str) -> int | str:
        raw = (raw or "").strip()
        if not raw:
            raise ValueError("TELEGRAM_CHANNEL_ID is not configured")
        try:
            return int(raw)
        except ValueError:
            return raw

    async def start(self) -> None:
        self._create_client()
        async with self._start_lock:
            if self._is_started or getattr(self.client, "is_initialized", False):
                self._is_started = True
                return
            try:
                await self.client.start()
                self._is_started = True
            except Exception:
                await self._drop_client()
                raise

    def _create_client(self) -> None:
        if self.client is not None:
            return
        from pyrogram import Client

        self.client = Client(
            self.session_name,
            api_id=int(settings.TELEGRAM_API_ID),
            api_hash=settings.TELEGRAM_API_HASH,
            bot_token=settings.TELEGRAM_BOT_TOKEN,
        )

    async def _drop_client(self) -> None:
        self._is_started = False
        try:
            if self.client is not None and getattr(self.client, "is_initialized", False):
                await self.client.stop()
        except Exception:
            pass
        self.client = None
        session_file = Path.cwd() / f"{self.session_name}.session"
        try:
            if session_file.exists():
                session_file.unlink()
        except OSError:
            pass

    async def reconnect(self) -> None:
        try:
            if self._is_started and self.client is not None:
                await self.client.stop()
        except Exception:
            pass
        self._is_started = False
        self.client = None

    async def _with_retry(self, func, *args, **kwargs):
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                await self.start()
                return await func(*args, **kwargs)
            except RETRYABLE_ERRORS as exc:
                last_error = exc
                await self.reconnect()
                await asyncio.sleep(1 + attempt)
        raise last_error  # type: ignore[misc]

    async def upload_file(
        self, file_path: str, caption: str = "", on_bytes: Callable[[int, int], None] | None = None
    ) -> dict[str, object]:
        """Upload one file (>2GB auto-split) and return catalog rows."""
        size = os.path.getsize(file_path)
        if size > SPLIT_THRESHOLD_BYTES:
            return await self._upload_split(file_path, caption, on_bytes)
        result = await self._with_retry(self._upload_single, file_path, caption, on_bytes)
        return {"is_split": False, "parts": [result]}

    async def delete_messages(self, message_ids: tuple[int, ...]) -> None:
        """Delete captured messages from the configured storage channel."""
        if not message_ids:
            return
        await self._with_retry(self.client.delete_messages, self.channel_id, list(message_ids))

    async def download_source(self, message_id: int, destination_path: str) -> None:
        """Download one retained source message into a local recovery path."""
        result = await self._with_retry(
            self.client.download_media,
            (self.channel_id, message_id),
            file_name=destination_path,
        )
        if not result or not Path(destination_path).is_file():
            raise ProviderUploadError("Telegram source download did not produce a file")

    @staticmethod
    def _pyrogram_progress(on_bytes: Callable[[int, int], None] | None):
        if on_bytes is None:
            return None
        return lambda current, total, *_: on_bytes(int(current), int(total))

    async def _upload_single(
        self, file_path: str, caption: str = "", on_bytes: Callable[[int, int], None] | None = None
    ) -> dict[str, object]:
        sent = await self.client.send_document(
            chat_id=self.channel_id,
            document=file_path,
            caption=caption,
            file_name=os.path.basename(file_path),
            force_document=True,
            progress=self._pyrogram_progress(on_bytes),
        )
        doc = sent.document
        return {
            "message_id": sent.id,
            "file_id": doc.file_id,
            "file_unique_id": doc.file_unique_id,
            "file_name": doc.file_name,
            "size_bytes": doc.file_size,
            "mime_type": doc.mime_type,
        }

    async def _upload_split(
        self, file_path: str, caption: str, on_bytes: Callable[[int, int], None] | None = None
    ) -> dict[str, object]:
        """Split above the bot upload cap, upload part by part, clean temp parts."""
        base_dir, file_name = os.path.split(file_path)
        split_dir = os.path.join(base_dir, f"split_{int(time.time())}")
        os.makedirs(split_dir, exist_ok=True)
        part_paths: list[str] = []
        try:
            part_num = 1
            with open(file_path, "rb") as src:
                while True:
                    part_path = os.path.join(split_dir, f"{file_name}.part{part_num:03d}")
                    written = 0
                    with open(part_path, "wb") as dst:
                        while written < SPLIT_THRESHOLD_BYTES:
                            chunk = src.read(min(CHUNK_SIZE, SPLIT_THRESHOLD_BYTES - written))
                            if not chunk:
                                break
                            dst.write(chunk)
                            written += len(chunk)
                    if written == 0:
                        os.remove(part_path)
                        break
                    part_paths.append(part_path)
                    part_num += 1
            parts = []
            for idx, part in enumerate(part_paths, start=1):

                def part_bytes(sent: int, total: int, part_index: int = idx) -> None:
                    if on_bytes is None:
                        return
                    all_parts_bytes = len(part_paths) * SPLIT_THRESHOLD_BYTES
                    on_bytes(((part_index - 1) * SPLIT_THRESHOLD_BYTES + sent), all_parts_bytes)

                result = await self._upload_single(
                    part, caption=f"{caption} (Part {idx}/{len(part_paths)})", on_bytes=part_bytes
                )
                parts.append(result)
            return {"is_split": True, "parts": parts}
        finally:
            for part in part_paths:
                if os.path.exists(part):
                    os.remove(part)
            if os.path.exists(split_dir):
                os.rmdir(split_dir)


# Bot API path helpers — the control plane's serving-side access to Telegram.
def resolve_file_path_http(file_id: str) -> str:
    """Refresh a Bot API file path over plain HTTPS — no Pyrogram, serverless-safe."""
    token = settings.TELEGRAM_STREAM_TOKEN or settings.TELEGRAM_BOT_TOKEN
    url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
    with urllib.request.urlopen(url, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("ok"):
        raise ValueError(f"Telegram getFile failed: {payload.get('description')}")
    return payload["result"]["file_path"]


def telegram_file_url(file_path: str) -> str:
    """The direct CDN URL a viewer's browser is redirected to (stream bot token)."""
    token = settings.TELEGRAM_STREAM_TOKEN or settings.TELEGRAM_BOT_TOKEN
    return f"https://api.telegram.org/file/bot{token}/{file_path}"


# Diagnostics hooks — env gating offline, live Bot API probes on deep runs.
def _telegram_env_checks() -> list[Check]:
    api_id = (settings.TELEGRAM_API_ID or "").strip()
    api_hash = (settings.TELEGRAM_API_HASH or "").strip()
    bot_token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    stream_token = (settings.TELEGRAM_STREAM_TOKEN or "").strip()
    channel = (settings.TELEGRAM_CHANNEL_ID or "").strip()
    channel_ok = bool(channel) and (channel.startswith("@") or channel.lstrip("-").isdigit())
    return [
        check(
            "api_id",
            "معرّف Telegram API (TELEGRAM_API_ID)",
            api_id.isdigit(),
            "متوفر." if api_id.isdigit() else "غير مضبوط أو ليس رقمًا.",
        ),
        check(
            "api_hash", "مفتاح Telegram API (TELEGRAM_API_HASH)", bool(api_hash), "متوفر." if api_hash else "غير مضبوط."
        ),
        check(
            "bot_token", "روبوت الرفع (TELEGRAM_BOT_TOKEN)", bool(bot_token), "متوفر." if bot_token else "غير مضبوط."
        ),
        check(
            "stream_token",
            "روبوت التوجيه للعرض (TELEGRAM_STREAM_TOKEN)",
            bool(stream_token),
            "متوفر — روابط المقاطع تُبنى به (قراءة فقط)."
            if stream_token
            else "غير مضبوط — روابط التوجيه ستستخدم روبوت الرفع الأقوى صلاحية.",
            severity=SEVERITY_WARN,
        ),
        check(
            "channel_id",
            "قناة التخزين (TELEGRAM_CHANNEL_ID)",
            channel_ok,
            f"مضبوط: {channel}" if channel_ok else "غير مضبوط.",
        ),
        check(
            "channel_format",
            "صيغة معرّف القناة صحيحة",
            channel_ok,
            "‎@مقبض."
            if channel_ok and channel.startswith("@")
            else ("رقم." if channel_ok else "غير قابلة للتحليل: مطلوب ‎@مقبض أو رقم."),
        ),
    ]


def _telegram_deep_checks() -> list[Check]:
    if blocking_checks(_telegram_env_checks()):
        return []
    ingest_bot = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    stream_bot = (settings.TELEGRAM_STREAM_TOKEN or "").strip() or ingest_bot
    channel = (settings.TELEGRAM_CHANNEL_ID or "").strip()
    bot_ok, bot_detail = _bot_api_call(ingest_bot, "getMe")
    checks = [check("bot_api", "الروبوت متصل بـ Bot API", bot_ok, bot_detail)]
    if bot_ok:
        chat_ok, chat_detail = _bot_api_call(stream_bot, "getChat", {"chat_id": channel})
        checks.append(check("chat_access", "الروبوت يصل إلى قناة التخزين", chat_ok, chat_detail))
    return checks


def _bot_api_call(token: str, method: str, params: dict[str, str] | None = None) -> tuple[bool, str]:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"https://api.telegram.org/bot{token}/{method}{query}"
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return False, f"تعذّر الاتصال: {exc}"
    if not payload.get("ok"):
        return False, f"رفض Telegram الطلب: {payload.get('description', 'غير معروف')}"
    result = payload.get("result", {})
    name = result.get("title") or result.get("first_name") or result.get("username") or ""
    return True, f"استجابة سليمة{f' — {name}' if name else ''}."


# The spec's ingest legs: the source publish and the packaged-segment publish.
class _TelegramIngest:
    """The Telegram-specific legs of an ingest."""

    @staticmethod
    async def store_source(service: TelegramMediaService, asset, source: Path, upload_args: dict | None) -> dict:
        """Publish the original file and return row fields to write back."""
        uploaded = await service.upload_file(str(source), caption=f"source · {asset.slug}", **(upload_args or {}))
        parts = uploaded["parts"]
        return {
            "source_message_id": parts[0]["message_id"],
            "source_size_bytes": sum(p["size_bytes"] for p in parts),
            "source_file_name": (getattr(asset, "source_file_name", "") or str(source.name)),
        }

    @staticmethod
    async def store_package(
        service: TelegramMediaService,
        slug: str,
        result,
        tracker: ProgressTracker | None = None,
    ) -> list[dict]:
        """Upload every renditions' segments and return payloads for the ORM."""
        total_segments = sum(len(p.segments) for p in result.renditions)
        published = 0
        renditions = []
        for packaged in result.renditions:
            segments = []
            for index, segment_path in enumerate(packaged.segments):
                uploaded = await service.upload_file(
                    str(segment_path), caption=f"{slug} · {packaged.quality} · {index}"
                )
                part = uploaded["parts"][0]
                segments.append((index, part))
                published += 1
                if tracker is not None:
                    tracker.publish_segment(published, total_segments)
            renditions.append(
                {
                    "quality": packaged.quality,
                    "width": packaged.width,
                    "height": packaged.height,
                    "bandwidth_bps": packaged.bandwidth_bps,
                    "playlist": packaged.playlist_text,
                    "aes_key_hex": packaged.aes_key_hex,
                    "segment_count": len(packaged.segments),
                    "segments": segments,
                }
            )
        return renditions


def delete_remote(snapshot) -> None:
    """Delete the captured source and segment messages through Pyrogram."""
    message_ids = tuple(getattr(snapshot, "telegram_message_ids", ()) or ())
    if not message_ids:
        return

    async def delete() -> None:
        service = TelegramMediaService()
        try:
            await asyncio.wait_for(service.delete_messages(message_ids), timeout=REMOTE_DELETE_SECONDS)
        finally:
            await asyncio.wait_for(service._drop_client(), timeout=REMOTE_DELETE_SECONDS)

    asyncio.run(delete())


def download_source(asset, destination_path: str) -> None:
    """Recover a Telegram source through the provider's MTProto client."""
    raw_message_id = getattr(asset, "source_message_id", None)
    if not raw_message_id:
        raise ProviderUploadError("Telegram source is unavailable")

    async def download() -> None:
        service = TelegramMediaService()
        try:
            await service.download_source(int(raw_message_id), destination_path)
        except ProviderUploadError:
            raise
        except Exception as error:
            raise ProviderUploadError("Telegram source download failed") from error
        finally:
            await asyncio.wait_for(service._drop_client(), timeout=REMOTE_DELETE_SECONDS)

    asyncio.run(download())


def _studio_spool_path(session_key: str) -> Path:
    configured = str(getattr(settings, "VIDEO_SPOOL_DIR", "") or "")
    return Path(configured) / f"{session_key}.part"


def _studio_spool_ready() -> bool:
    from features.videohosting.services import spool_directory_ready

    return spool_directory_ready()


def _studio_start(_file_name: str, _mime_type: str, _total: int, session_key: str) -> ProviderUploadStart:
    if not _studio_spool_ready():
        raise ProviderUploadError("Telegram upload spool is not ready")
    spool = Path(str(getattr(settings, "VIDEO_SPOOL_DIR", "")))
    spool.mkdir(parents=True, exist_ok=True)
    _studio_spool_path(session_key).touch()
    return ProviderUploadStart()


def _studio_probe(session) -> ProviderUploadState:
    path = _studio_spool_path(session.session_key)
    try:
        offset = path.stat().st_size
    except OSError as exc:
        raise ProviderUploadError("Telegram upload spool is unavailable") from exc
    return ProviderUploadState(next_offset=offset, complete=offset == session.total_bytes)


def _studio_write(session, chunk: bytes, start: int) -> ProviderUploadState:
    path = _studio_spool_path(session.session_key)
    try:
        with path.open("r+b" if path.exists() else "wb") as output:
            output.seek(start)
            output.write(chunk)
    except OSError as exc:
        raise ProviderUploadError("Telegram upload spool is unavailable") from exc
    return ProviderUploadState(next_offset=start + len(chunk), complete=start + len(chunk) == session.total_bytes)


def _studio_complete(session, asset, plan) -> ProviderUploadCompletion:
    path = _studio_spool_path(session.session_key)
    if not path.is_file():
        raise ProviderUploadError("Telegram upload source is unavailable")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)

    def background() -> None:
        from features.videohosting import ingest

        try:
            ingest.ingest_file(
                path,
                asset.slug,
                title=asset.title,
                created_by=asset.created_by,
                remove_source=True,
                package="auto" if plan.package else "never",
                track_progress=True,
            )
            from features.videohosting.models import UploadSession

            UploadSession.objects.filter(pk=session.pk).update(status="complete", progress=100)
        except Exception as exc:
            from features.videohosting.models import UploadSession

            UploadSession.objects.filter(pk=session.pk).update(status="error", error_message=str(exc)[:2000])

    return ProviderUploadCompletion(
        asset_updates={
            "source_size_bytes": session.total_bytes,
            "source_file_name": session.file_name,
            "mime_type": session.mime_type,
            "source_sha256": digest.hexdigest(),
            "status": "processing",
            "progress": 0,
            "stage": "uploading",
        },
        session_status="processing",
        session_progress=100,
        background=background,
    )


def _studio_cancel(session) -> None:
    _studio_spool_path(session.session_key).unlink(missing_ok=True)


TELEGRAM_UPLOAD = ProviderUpload(
    start_session=_studio_start,
    probe_offset=_studio_probe,
    write_chunk=_studio_write,
    complete=_studio_complete,
    cancel=_studio_cancel,
    spool_ready=_studio_spool_ready,
    download_source=download_source,
)


# The spec — declared last so every symbol above is already defined.
TELEGRAM = ProviderSpec(
    code="telegram",
    name="Telegram",
    is_enabled=False,
    is_default=False,
    capabilities={
        "resumableUpload": False,
        "privateAccess": True,
        "requiresAuth": False,
        "playback": "hls_token",
    },
    segment_redirect=telegram_file_url,
    file_path_refresher=resolve_file_path_http,
    delete_remote=delete_remote,
    upload=TELEGRAM_UPLOAD,
    ingest=_TelegramIngest(),
    env_checks=_telegram_env_checks,
    deep_checks=_telegram_deep_checks,
    hints={
        "api_id": "أضف TELEGRAM_API_ID من my.telegram.org → API development tools",
        "api_hash": "أضف TELEGRAM_API_HASH من my.telegram.org",
        "bot_token": "أنشئ روبوتًا عبر BotFather وأضف TELEGRAM_BOT_TOKEN",
        "stream_token": "أنشئ روبوت قراءة ثانويًا عبر BotFather وأضفه في TELEGRAM_STREAM_TOKEN",
        "channel_id": "أضف معرّف قناة التخزين (‎@مقبض أو رقم) في TELEGRAM_CHANNEL_ID",
        "channel_format": "معرّف القناة يجب أن يكون ‎@مقبض أو رقمًا صحيحًا",
        "persistent_spool": "اضبط VIDEO_SPOOL_DIR على مجلد دائم موجود وقابل للكتابة خارج المسارات المؤقتة.",
        "bot_api": "تأكد أن TELEGRAM_BOT_TOKEN لروبوت حقيقي يصل إلى api.telegram.org",
        "chat_access": "أضف الروبوت مشرفًا في قناة التخزين ثم أعد التحقق",
    },
)
