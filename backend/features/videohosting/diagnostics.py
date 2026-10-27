# Video diagnostics <- admin console views, ingest host setup.
# /admin/video-diagnostics — one staged check per thing that can silently break
# playback: the packaging host, each provider's own environment and deep API
# checks. Every check names WHY it failed and what to do next.
#
# Provider checks live inside providers/<code>.py where they're declared once;
# this module owns only the pipeline group and the runner that aggregates them.
from __future__ import annotations

import urllib.request  # tests patch urlopen through this namespace for deep runs
from typing import Any

from django.conf import settings
from django.utils import timezone

from features.videohosting import packaging
from features.videohosting.providers import SPECS, spec_for
from features.videohosting.providers.base import SEVERITY_ERROR, SEVERITY_OK


def _pipeline_group() -> dict[str, Any]:
    """The packaging pipeline: a normal host AND FFmpeg on its PATH."""
    vercel = bool(settings.IS_VERCEL)
    ffmpeg_ok = packaging.ffmpeg_available()
    return {
        "id": "pipeline",
        "label": "خط التغليف (FFmpeg)",
        "provider": "",
        "ok": not vercel and ffmpeg_ok,
        "warningCount": 0,
        "checks": [
            {"id": "vercel", "label": "بيئة الخادم تسمح بتشغيل FFmpeg", "ok": not vercel,
             "severity": SEVERITY_OK if not vercel else SEVERITY_ERROR,
             "detail": "خادم عادي — التغليف مسموح." if not vercel
                       else "الاستضافة على Vercel (serverless): لا FFmpeg ولا ملفات مؤقتة واسعة.",
             "hint": ""},
            {"id": "ffmpeg", "label": "FFmpeg مثبّت ويغلبّف HLS", "ok": ffmpeg_ok,
             "severity": SEVERITY_OK if ffmpeg_ok else SEVERITY_ERROR,
             "detail": "ffmpeg و ffprobe متوفران — سلّم 360p/480p/720p جاهز." if ffmpeg_ok
                       else "لم يُعثر على ffmpeg/ffprobe على PATH.",
             "hint": ""},
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
        providers.append({**payload, "code": spec.code, "available": payload["ok"],
                          "reason": "" if payload["ok"] else spec.reason()})
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
