# Video diagnostics <- admin console views, ingest host setup.
# /admin/video-diagnostics — one staged check per thing that can silently break
# playback: the packaging host, each provider's own environment and deep API
# checks. Every check names WHY it failed and what to do next.
#
# Provider checks live inside providers/<code>.py where they're declared once;
# this module owns only the pipeline group and the runner that aggregates them.
from __future__ import annotations

import urllib.request  # noqa: F401 — deep-run tests patch urlopen through this namespace
from typing import Any

from django.conf import settings
from django.utils import timezone

from features.videohosting import packaging
from features.videohosting.models import VideoSystemConfig
from features.videohosting.providers import SPECS, spec_for
from features.videohosting.providers.base import SEVERITY_ERROR, SEVERITY_OK, SEVERITY_WARN


def _pipeline_group() -> dict[str, Any]:
    """The packaging pipeline: a normal host AND FFmpeg on its PATH.

    With the admin toggle off, packaging is a decision, not a failure — the
    host checks keep their verdicts but drop to warnings, so the group stays
    green while still telling the admin why FFmpeg is out of use.
    """
    vercel = bool(settings.IS_VERCEL)
    ffmpeg_ok = packaging.ffmpeg_available()
    try:
        packaging_off = not VideoSystemConfig.get_instance().use_ffmpeg
    except Exception:
        packaging_off = False
    # Packaging off: whatever blocks FFmpeg cannot block the platform anymore.
    severity = SEVERITY_WARN if packaging_off else SEVERITY_ERROR
    ok_vercel, ok_ffmpeg = (not vercel, ffmpeg_ok)
    return {
        "id": "pipeline",
        "label": "خط التغليف (FFmpeg)",
        "provider": "",
        "ok": (ok_vercel and ok_ffmpeg) or packaging_off,
        "warningCount": 0 if (ok_vercel and ok_ffmpeg) else (2 if packaging_off else 1),
        "checks": [
            {
                "id": "vercel",
                "label": "بيئة الخادم تسمح بتشغيل FFmpeg",
                "ok": ok_vercel,
                "severity": SEVERITY_OK if ok_vercel else severity,
                "detail": "خادم عادي — التغليف مسموح."
                if not vercel
                else "الاستضافة على Vercel (serverless): لا FFmpeg ولا ملفات مؤقتة واسعة.",
                "hint": "",
            },
            {
                "id": "ffmpeg",
                "label": "FFmpeg مثبّت ويغلبّف HLS",
                "ok": ok_ffmpeg,
                "severity": SEVERITY_OK if ok_ffmpeg else severity,
                "detail": "ffmpeg و ffprobe متوفران — سلّم 360p/480p/720p جاهز."
                if ffmpeg_ok
                else "لم يُعثر على ffmpeg/ffprobe على PATH.",
                "hint": "",
            },
            {
                "id": "mode",
                "label": "وضع التغليف مُفعّل من لوحة الإدارة",
                "ok": True,
                "severity": SEVERITY_OK,
                "detail": (
                    "التغليف موقوف — الملفات الجديدة تُشاهد مباشرة دون تغليف HLS."
                    if packaging_off
                    else "التغليف مُفعّل — كل ملف يُغلَّف تلقائيًا حسب قدراته المتاحة."
                ),
                "hint": "",
            },
        ],
    }


def run(deep: bool = False) -> dict[str, Any]:
    """The full staged validation — the admin diagnostics payload.

    Shallow runs stay offline (env + packaging host); `deep` adds live API
    calls per each provider's own deep_hooks, so the admin sees exactly which
    stage breaks and why.
    """
    groups = [_pipeline_group()]
    providers = []
    for spec in SPECS:
        payload = spec.check_group(deep=deep).payload(spec.hints)
        # One group payload serves both lists, so the env checks run once per spec.
        groups.append(payload)
        providers.append(
            {**payload, "code": spec.code, "available": payload["ok"], "reason": "" if payload["ok"] else spec.reason()}
        )
    problems = [
        f"{g['label']} — {item['label']}: {item['detail']}"
        for g in groups
        for item in g["checks"]
        if not item["ok"] and item["severity"] == SEVERITY_ERROR
    ]
    return {
        "checkedAt": timezone.now().isoformat(),
        "deep": deep,
        "okOverall": not problems,
        "summary": {**{p["code"]: p["available"] for p in providers}, "pipeline": groups[0]["ok"]},
        "problems": problems,
        "groups": groups,
        "providers": providers,
    }


# The provider gate's access point: the console resolves upload targets through
# it, and the admin-console tests patch it to fake availability.
def provider_available(code: str, deep: bool = False) -> bool:
    """A provider is selectable when none of its blocking checks fail."""
    spec = spec_for(code)
    if spec is None:
        return False
    return spec.available(deep)


def provider_reason(code: str) -> str:
    """Why a provider is not selectable, or "" when it is."""
    spec = spec_for(code)
    if spec is None:
        return "مزوّد غير معروف."
    return spec.reason()
