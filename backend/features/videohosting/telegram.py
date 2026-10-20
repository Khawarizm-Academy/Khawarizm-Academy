# Telegram Client Layer <- Streaming Views & Ingest Command
# Wraps Pyrogram so a Telegram channel acts as unlimited video storage: upload
# (>2GB auto-split), 1 MiB chunk streaming, and Bot API file-path resolution.
# Serving paths never import Pyrogram — they refresh file paths over plain HTTPS.
import asyncio
import os
import time
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Union

from django.conf import settings

# Pyrogram is imported lazily: the serving stack (serverless) must stay
# importable without it, and its sync wrapper needs a running event loop.

# messages.getMessages accepts up to 100 ids per RPC; batching keeps scans cheap.
GET_MESSAGES_BATCH_SIZE = 100
# Streaming chunk size — matches Pyrogram's internal 1 MiB chunks so offsets line up.
CHUNK_SIZE = 1024 * 1024
# Bot uploads are capped at ~2GB; files above this are split before upload.
SPLIT_THRESHOLD_BYTES = 1950 * 1024 * 1024
# Errors that mean "connection blip, safe to reconnect and retry".
RETRYABLE_ERRORS = (OSError, TimeoutError)


class TelegramMediaService:
    """Persistent Pyrogram client bound to one event loop (ingest + relay paths)."""

    def __init__(self) -> None:
        self.channel_id: Union[int, str] = self._parse_channel_id(settings.TELEGRAM_CHANNEL_ID)
        self.session_name = "khawarizm_videohosting_session"
        self.client = None
        self._is_started = False
        # Pyrogram's start() is not idempotent; concurrent requests would double-init.
        self._start_lock = asyncio.Lock()

    @staticmethod
    def _parse_channel_id(raw: str) -> Union[int, str]:
        """Accepts '@handle' or a raw integer id, failing loudly when unset."""
        raw = (raw or "").strip()
        if not raw:
            raise ValueError("TELEGRAM_CHANNEL_ID is not configured")
        try:
            return int(raw)
        except ValueError:
            return raw

    async def start(self) -> None:
        """Start the client; on any failure drop it so the next call re-auths fresh."""
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
        """Discard a half-dead client and its session file — never reused."""
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
        """Stop the client but keep the session — a blip does not need re-auth."""
        try:
            if self._is_started and self.client is not None:
                await self.client.stop()
        except Exception:
            pass
        self._is_started = False
        self.client = None

    async def stop(self) -> None:
        await self._drop_client()

    async def _with_retry(self, func, *args, **kwargs):
        """Run one RPC, reconnecting on transient connection errors."""
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

    # ----------------------------------------------------------------- upload

    async def upload_file(self, file_path: str, caption: str = "") -> Dict[str, Any]:
        """Upload one file (>2GB auto-split into parts) and return catalog rows."""
        size = os.path.getsize(file_path)
        if size > SPLIT_THRESHOLD_BYTES:
            return await self._upload_split(file_path, caption)
        result = await self._with_retry(self._upload_single, file_path, caption)
        return {"is_split": False, "parts": [result]}

    async def _upload_single(self, file_path: str, caption: str = "") -> Dict[str, Any]:
        sent = await self.client.send_document(
            chat_id=self.channel_id,
            document=file_path,
            caption=caption,
            file_name=os.path.basename(file_path),
            # .mp4 would otherwise be sent as video media with no .document.
            force_document=True,
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

    async def _upload_split(self, file_path: str, caption: str) -> Dict[str, Any]:
        """Split above the bot upload cap, upload part by part, clean up temp parts."""
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
                result = await self._upload_single(part, caption=f"{caption} (Part {idx}/{len(part_paths)})")
                parts.append(result)
            return {"is_split": True, "parts": parts}
        finally:
            for part in part_paths:
                if os.path.exists(part):
                    os.remove(part)
            if os.path.exists(split_dir):
                os.rmdir(split_dir)

    # --------------------------------------------------------------- download

    async def get_file_stream(
        self, message_id: int, offset_bytes: int = 0, limit_bytes: int = 0
    ) -> AsyncGenerator[bytes, None]:
        """Yield file bytes from an arbitrary offset — the relay-mode backstop."""
        await self.start()
        msg = await self.client.get_messages(chat_id=self.channel_id, message_ids=message_id)
        if not msg or getattr(msg, "empty", False):
            raise ValueError(f"Message {message_id} not found in the storage channel")
        sent = 0
        async for chunk in self.client.stream_media(msg, offset=offset_bytes // CHUNK_SIZE):
            # stream_media yields full chunks from the offset chunk; trim the head
            # of the first chunk when the request started mid-chunk.
            if offset_bytes % CHUNK_SIZE and sent == 0:
                chunk = chunk[offset_bytes % CHUNK_SIZE:]
            if limit_bytes:
                remaining = limit_bytes - sent
                if len(chunk) >= remaining:
                    yield chunk[:remaining]
                    return
            sent += len(chunk)
            yield chunk

    async def get_file_meta(self, message_id: int) -> Dict[str, Any]:
        """Exact metadata for one stored message (used by re-packaging)."""
        msg = await self._with_retry(
            self.client.get_messages, chat_id=self.channel_id, message_ids=message_id
        )
        if not msg or getattr(msg, "empty", False):
            raise ValueError(f"Message {message_id} not found in the storage channel")
        doc = msg.document
        return {
            "message_id": msg.id,
            "file_id": doc.file_id,
            "file_name": doc.file_name,
            "size_bytes": doc.file_size,
            "mime_type": doc.mime_type,
        }


def resolve_file_path_http(file_id: str) -> str:
    """Refresh a Bot API file path over plain HTTPS — no Pyrogram, serverless-safe.

    Telegram expires stored file paths; the serving layer calls this (one cheap
    GET) only when a cached path goes stale, then persists the new one.
    """
    import json
    import urllib.request

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_STREAM_TOKEN or settings.TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}"
    with urllib.request.urlopen(url, timeout=10) as response:  # noqa: S310 — fixed Telegram API host
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("ok"):
        raise ValueError(f"Telegram getFile failed: {payload.get('description')}")
    return payload["result"]["file_path"]


def telegram_file_url(file_path: str) -> str:
    """The direct CDN URL a viewer's browser is redirected to (stream bot token).

    Only ever built with TELEGRAM_STREAM_TOKEN — a throwaway, read-only bot whose
    sole power is membership in the storage channel, so a leaked URL exposes
    ciphertext segments only (never keys, never the ingest bot).
    """
    token = settings.TELEGRAM_STREAM_TOKEN or settings.TELEGRAM_BOT_TOKEN
    return f"https://api.telegram.org/file/bot{token}/{file_path}"
