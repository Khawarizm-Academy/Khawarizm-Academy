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
from features.videohosting.providers.google_drive import GOOGLE_DRIVE
from features.videohosting.providers.telegram import TELEGRAM

# Deep (network) checks use a short timeout — a down provider must not hang the admin.
REQUEST_SECONDS = 8
DRIVE_OAUTH_URL = "https://oauth2.googleapis.com/token"
DRIVE_FILE_URL = "https://www.googleapis.com/drive/v3/files/{file_id}"
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
    "auth_mode": "أضف GOOGLE_DRIVE_REFRESH_TOKEN أو GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON — أحدهما يكفي",
    "service_account_json": "محتوى GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON يجب أن يكون JSON صالحًا (أو مشفّرًا base64)",
    "drive_token": "أعد توليد refresh token (وضع OAuth) وتأكد أن CLIENT_ID/SECRET صحيحان",
    "drive_folder": "تأكد أن الحساب المفوَّض يملك صلاحية على المجلد وأن معرّف المجلد صحيح",
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
    """The Google Drive block in the environment — shallow, offline."""
    client_id = (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()
    client_secret = (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip()
    folder = (settings.GOOGLE_DRIVE_ROOT_FOLDER_ID or "").strip()
    refresh_token = (settings.GOOGLE_DRIVE_REFRESH_TOKEN or "").strip()
    service_account = (settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or "").strip()

    auth_ok = bool(refresh_token or service_account)
    service_json_ok = not service_account or _service_account_parses(service_account)
    return [
        check("client_id", "معرّف عميل OAuth (GOOGLE_DRIVE_CLIENT_ID)", bool(client_id),
              "متوفر." if client_id else "غير مضبوط."),
        check("client_secret", "سر العميل (GOOGLE_DRIVE_CLIENT_SECRET)", bool(client_secret),
              "متوفر." if client_secret else "غير مضبوط."),
        check("root_folder", "مجلد الرفع (GOOGLE_DRIVE_ROOT_FOLDER_ID)", bool(folder),
              f"متوفر: {folder}" if folder else "غير مضبوط."),
        check("auth_mode", "وضع المصادقة (refresh token أو حساب خدمة)", auth_ok,
              "refresh token متوفر (OAuth)." if refresh_token
              else ("حساب خدمة متوفر." if service_account else "لا refresh token ولا حساب خدمة.")),
        check("service_account_json", "JSON حساب الخدمة صالح (إن وُجد)", service_json_ok,
              "" if not service_account else ("مُحلَّل بنجاح." if service_json_ok else "ليس JSON صالحًا ولا base64.")),
    ]


def drive_deep_checks() -> list[Check]:
    """Prove the credentials against Google's own API — token, then the folder."""
    if _blocking(drive_env_checks()):
        return []
    refresh_token = (settings.GOOGLE_DRIVE_REFRESH_TOKEN or "").strip()
    if not refresh_token:
        # Service-account flows mint their own JWTs; deep validation needs google-auth later.
        return [check("drive_token", "التحقق العميق من حساب الخدمة", True,
                      "وضع حساب الخدمة — تحقق سطحي فقط (الرفع الفعلي يتحقق عند أول عملية).")]
    token_ok, bearer, token_detail = _drive_token(refresh_token)
    checks = [check("drive_token", "تبادل refresh token مقابل access token", token_ok, token_detail)]
    if token_ok:
        folder_ok, folder_detail = _drive_folder(bearer)
        checks.append(check("drive_folder", "الوصول إلى مجلد الرفع", folder_ok, folder_detail))
    return checks


def drive_group(deep: bool) -> CheckGroup:
    group = CheckGroup(id="google_drive", label="Google Drive", provider="google_drive", checks=drive_env_checks())
    if deep:
        group.checks.extend(drive_deep_checks())
    return group


def _drive_token(refresh_token: str) -> tuple[bool, str, str]:
    """Exchange the refresh token — (ok, bearer token, detail)."""
    body = urllib.parse.urlencode({
        "client_id": (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip(),
        "client_secret": (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip(),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }).encode("utf-8")
    request = urllib.request.Request(  # noqa: S310 — fixed OAuth host, POST to its own API
        DRIVE_OAUTH_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return False, "", f"تعذّر الاتصال: {exc}"
    bearer = payload.get("access_token", "")
    if not bearer:
        return False, "", f"رفض OAuth الطلب: {payload.get('error_description', payload.get('error', 'غير معروف'))}"
    return True, bearer, "حصل على access token بنجاح."


def _drive_folder(bearer: str) -> tuple[bool, str]:
    """Read the upload folder's metadata with the minted token."""
    folder = (settings.GOOGLE_DRIVE_ROOT_FOLDER_ID or "").strip()
    url = DRIVE_FILE_URL.format(file_id=urllib.parse.quote(folder)) + "?fields=name,mimeType"
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {bearer}"})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return False, f"تعذّر الاتصال: {exc}"
    name = payload.get("name", "")
    return True, f"المجلد «{name}» متاح." if name else "استجابة سليمة بدون اسم."


def _service_account_parses(raw: str) -> bool:
    """The service-account env value is raw JSON or base64 — both are accepted."""
    candidate = raw.strip()
    if not candidate.startswith("{"):
        import base64

        try:
            candidate = base64.b64decode(candidate).decode("utf-8")
        except Exception:
            return False
    try:
        parsed = json.loads(candidate)
    except ValueError:
        return False
    return isinstance(parsed, dict)


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
