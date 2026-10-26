# Video diagnostics <- admin console views, ingest host setup
# /admin/video-diagnostics — one staged check per thing that can silently break
# playback: the packaging host, each provider's environment, and (on deep runs)
# the live credentials against each provider's own API. Every check names WHY
# it failed and what to do next, so an admin never sees a bare "not working".
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings
from django.utils import timezone

from features.videohosting import packaging
from features.videohosting.oauthdrive import connected as drive_connected
from features.videohosting.oauthdrive import access_token as drive_access_token
from features.videohosting.providers.google_drive import GOOGLE_DRIVE
from features.videohosting.providers.google_drive import upload_probe as drive_upload_probe
from features.videohosting.providers.telegram import TELEGRAM

# Deep (network) checks use a short timeout — a down provider must not hang the admin.
REQUEST_SECONDS = 8
TELEGRAM_API_URL = "https://api.telegram.org"

SEVERITY_OK = "info"      # the check passed
SEVERITY_WARN = "warn"    # degraded but not blocking (e.g. no stream bot)
SEVERITY_ERROR = "error"  # blocking — this provider or the pipeline cannot serve


# Per-check hints — Arabic, actionable, one per failing check id.
HINTS: dict[str, str] = {
    "vercel": "التغليف يعمل على جهاز به FFmpeg فقط — شغّل ingest_video من المحلي أو من خادم عمل",
    "ffmpeg": "ثبّت FFmpeg (مثل: sudo apt install ffmpeg) أو استخدم --package never لرفع المصدر فقط",
    "api_id": "أضف TELEGRAM_API_ID من my.telegram.org → API development tools",
    "api_hash": "أضف TELEGRAM_API_HASH من my.telegram.org",
    "bot_token": "أنشئ روبوتًا عبر BotFather وأضف TELEGRAM_BOT_TOKEN",
    "stream_token": "أنشئ روبوت قراءة ثانويًا عبر BotFather وأضفه في TELEGRAM_STREAM_TOKEN",
    "channel_id": "أضف معرّف قناة التخزين (‎@مقبض أو رقم) في TELEGRAM_CHANNEL_ID",
    "channel_format": "معرّف القناة يجب أن يكون ‎@مقبض أو رقمًا صحيحًا",
    "bot_api": "تأكد أن TELEGRAM_BOT_TOKEN لروبوت حقيقي يصل إلى api.telegram.org",
    "chat_access": "أضف الروبوت مشرفًا في قناة التخزين ثم أعد التحقق",
    "client_id": "أضف GOOGLE_DRIVE_CLIENT_ID من Google Cloud Console → Credentials",
    "client_secret": "أضف GOOGLE_DRIVE_CLIENT_SECRET لنفس عميل OAuth",
    "root_folder": "أضف GOOGLE_DRIVE_ROOT_FOLDER_ID (من رابط المجلد في Drive) للمجلد الذي ستُرفع إليه الفيديوهات",
    "redirect_uri": "أضف GOOGLE_DRIVE_OAUTH_REDIRECT_URI (مثال: http://localhost:8000/api/admin/video-drive/oauth/callback) وسجّله على عميل OAuth",
    "oauth_grant": "المسؤول يفتح «تخويل حساب Google» من لوحة الإدارة لربط الحساب صاحب مجلد الرفع",
    "drive_token": "تخويل Google منسوخ أو منتهي — المسؤول يفتح «تخويل حساب Google» من لوحة الإدارة من جديد",
    "drive_probe": "تعذّر الكتابة الفعلية إلى المجلد — راجع صلاحيات الحساب المُخوَّل على المجلد",
}


@dataclass
class Check:
    """One named validation with the reason and the fix when it fails."""

    id: str
    label: str
    ok: bool
    detail: str
    # Only failing checks carry severity; "warn" never fails the overall verdict.
    severity: str = SEVERITY_ERROR

    def payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "ok": self.ok,
            "severity": SEVERITY_OK if self.ok else self.severity,
            "detail": self.detail,
            "hint": "" if self.ok else HINTS.get(self.id, ""),
        }


@dataclass
class CheckGroup:
    """A provider or the packaging pipeline, with its staged checks."""

    id: str
    label: str
    provider: str  # "" for the pipeline group
    checks: list[Check] = field(default_factory=list)

    def payload(self) -> dict[str, Any]:
        blocking = [c for c in self.checks if not c.ok and c.severity == SEVERITY_ERROR]
        warnings = [c for c in self.checks if not c.ok and c.severity == SEVERITY_WARN]
        return {
            "id": self.id,
            "label": self.label,
            "provider": self.provider,
            "ok": not blocking,
            "warningCount": len(warnings),
            "checks": [c.payload() for c in self.checks],
        }


def check(cid: str, label: str, ok: bool, detail: str, severity: str = SEVERITY_ERROR) -> Check:
    """Build one Check — a passing check is always info-severity."""
    return Check(id=cid, label=label, ok=ok, detail=detail, severity=severity)


def _blocking(group: list[Check]) -> list[Check]:
    """The failing checks that make their group unavailable."""
    return [c for c in group if not c.ok and c.severity == SEVERITY_ERROR]


def _first_reason(group: list[Check]) -> str:
    """The first blocking check as one Arabic sentence for the select tooltip."""
    blocking = _blocking(group)
    if not blocking:
        return ""
    first = blocking[0]
    return f"{first.label}: {first.detail}"


# ---------------------------------------------------------------- the pipeline


def pipeline_group() -> CheckGroup:
    """Where packaging runs: a normal host AND FFmpeg on its PATH."""
    vercel = bool(settings.IS_VERCEL)
    ffmpeg_ok = packaging.ffmpeg_available()
    checks = [
        check("vercel", "بيئة الخادم تسمح بتشغيل FFmpeg", not vercel,
              "خادم عادي — التغليف مسموح." if not vercel
              else "الاستضافة على Vercel (serverless): لا FFmpeg ولا ملفات مؤقتة واسعة."),
        check("ffmpeg", "FFmpeg مثبّت ويغلبّف HLS", ffmpeg_ok,
              "ffmpeg و ffprobe متوفران — سلّم 360p/480p/720p جاهز." if ffmpeg_ok
              else "لم يُعثر على ffmpeg/ffprobe على PATH."),
    ]
    return CheckGroup(id="pipeline", label="خط التغليف (FFmpeg)", provider="", checks=checks)


# -------------------------------------------------------------------- telegram


def telegram_env_checks() -> list[Check]:
    """The Telegram block in the environment — shallow, offline."""
    api_id = (settings.TELEGRAM_API_ID or "").strip()
    api_hash = (settings.TELEGRAM_API_HASH or "").strip()
    bot_token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    stream_token = (settings.TELEGRAM_STREAM_TOKEN or "").strip()
    channel = (settings.TELEGRAM_CHANNEL_ID or "").strip()

    channel_ok = bool(channel) and (channel.startswith("@") or channel.lstrip("-").isdigit())
    return [
        check("api_id", "معرّف Telegram API (TELEGRAM_API_ID)", api_id.isdigit(),
              "متوفر." if api_id.isdigit() else "غير مضبوط أو ليس رقمًا."),
        check("api_hash", "مفتاح Telegram API (TELEGRAM_API_HASH)", bool(api_hash),
              "متوفر." if api_hash else "غير مضبوط."),
        check("bot_token", "روبوت الرفع (TELEGRAM_BOT_TOKEN)", bool(bot_token),
              "متوفر." if bot_token else "غير مضبوط."),
        check("stream_token", "روبوت التوجيه للعرض (TELEGRAM_STREAM_TOKEN)", bool(stream_token),
              "متوفر — روابط المقاطع تُبنى به (قراءة فقط)." if stream_token
              else "غير مضبوط — روابط التوجيه ستستخدم روبوت الرفع الأقوى صلاحية.",
              severity=SEVERITY_WARN),
        check("channel_id", "قناة التخزين (TELEGRAM_CHANNEL_ID)", channel_ok,
              f"مضبوط: {channel}" if channel_ok else "غير مضبوط."),
        check("channel_format", "صيغة معرّف القناة صحيحة", channel_ok,
              "‎@مقبض." if channel_ok and channel.startswith("@") else ("رقم." if channel_ok else "غير قابلة للتحليل: مطلوب ‎@مقبض أو رقم.")),
    ]


def telegram_deep_checks() -> list[Check]:
    """Prove the bot credentials against the Bot API (only when env is in place)."""
    if _blocking(telegram_env_checks()):
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


def telegram_group(deep: bool) -> CheckGroup:
    group = CheckGroup(id="telegram", label="تليجرام", provider="telegram", checks=telegram_env_checks())
    if deep:
        group.checks.extend(telegram_deep_checks())
    return group


def _bot_api_call(token: str, method: str, params: dict[str, str] | None = None) -> tuple[bool, str]:
    """One Bot API method call — (ok, human detail in Arabic) either way."""
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"{TELEGRAM_API_URL}/bot{token}/{method}{query}"
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed Telegram host
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return False, f"تعذّر الاتصال: {exc}"
    if not payload.get("ok"):
        return False, f"رفض Telegram الطلب: {payload.get('description', 'غير معروف')}"
    result = payload.get("result", {})
    name = result.get("title") or result.get("first_name") or result.get("username") or ""
    return True, f"استجابة سليمة{f' — {name}' if name else ''}."


# --------------------------------------------------------------- google drive


def drive_env_checks() -> list[Check]:
    """The Google Drive block in the environment + the persisted grant — offline."""
    client_id = (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()
    client_secret = (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip()
    folder = (settings.GOOGLE_DRIVE_ROOT_FOLDER_ID or "").strip()
    callback = (settings.GOOGLE_DRIVE_OAUTH_REDIRECT_URI or "").strip()
    grant = drive_connected()
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


def drive_deep_checks() -> list[Check]:
    """Prove the grant against Google's own API — a live mint, then a real write.

    `drive.file` cannot read arbitrary folder metadata, so a folder GET is
    dropped: the 1-byte write probe IS the folder verdict.
    """
    if _blocking(drive_env_checks()):
        return []
    token_ok, bearer, detail = drive_access_token()
    checks = [check("drive_token", "المصادقة مقابل Google (التوكيل المخزَّن)", token_ok, detail)]
    if token_ok:
        probe_ok, probe_detail = drive_upload_probe()
        checks.append(check("drive_probe", "تجربة كتابة فعلية (1 بايت)", probe_ok, probe_detail))
    return checks


def drive_group(deep: bool) -> CheckGroup:
    group = CheckGroup(id="google_drive", label="Google Drive", provider="google_drive", checks=drive_env_checks())
    if deep:
        group.checks.extend(drive_deep_checks())
    return group


# --------------------------------------------------------------- provider gates


def provider_group_for(code: str, deep: bool) -> CheckGroup:
    """The diagnostics group for one provider code (record lookup)."""
    if code == "google_drive":
        return drive_group(deep)
    if code == "telegram":
        return telegram_group(deep)
    raise ValueError(f"Unknown video provider code: {code}")


def provider_available(code: str, deep: bool = False) -> bool:
    """A provider is selectable when none of its blocking checks fail."""
    return not _blocking(provider_group_for(code, deep).checks)


def provider_reason(code: str) -> str:
    """Why a provider is not selectable, or "" when it is."""
    if code == "google_drive":
        return _first_reason(drive_env_checks())
    if code == "telegram":
        return _first_reason(telegram_env_checks())
    return "مزوّد غير معروف."


# ------------------------------------------------------------------ front door


def run(deep: bool = False) -> dict[str, Any]:
    """The full staged validation — the admin diagnostics payload.

    Shallow runs stay offline (env + packaging host); `deep` adds the live
    Bot API / Google API calls so an admin sees exactly which stage breaks.
    """
    groups = [pipeline_group(), telegram_group(deep), drive_group(deep)]
    providers = []
    for spec in (GOOGLE_DRIVE, TELEGRAM):
        available = provider_available(spec.code, deep)
        providers.append({
            **provider_group_for(spec.code, deep).payload(),
            "code": spec.code,
            "available": available,
            "reason": "" if available else provider_reason(spec.code),
        })
    payloads = [g.payload() for g in groups]
    problems = [
        f"{payload['label']} — {item['label']}: {item['detail']}"
        for payload in payloads
        for item in payload["checks"]
        if not item["ok"] and item["severity"] == SEVERITY_ERROR
    ]
    return {
        "checkedAt": timezone.now().isoformat(),
        "deep": deep,
        "okOverall": not problems,
        "summary": {
            "pipeline": payloads[0]["ok"],
            "telegram": provider_available("telegram"),
            "google_drive": provider_available("google_drive"),
        },
        "problems": problems,
        "groups": payloads,
        "providers": providers,
    }
