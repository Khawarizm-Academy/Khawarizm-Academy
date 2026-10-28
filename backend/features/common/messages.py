"""Every user-facing API string, defined once.

Feature modules import from here instead of inlining Arabic — these strings
are part of the API contract (the SPA renders `detail` verbatim and keys its
error states off `code`). DRF's own defaults come translated through the
`ar` locale, so only strings we hand-roll live here. Feature-owned
business-rule messages stay in each feature's `services.py`.
"""

from __future__ import annotations

# --- Not found ----------------------------------------------------------------
COURSE_NOT_FOUND = "الدورة غير موجودة"
SCHOLARSHIP_NOT_FOUND = "المنحة غير موجودة"
CATALOG_ITEM_NOT_FOUND = "العنصر غير موجود"
VIDEO_NOT_FOUND = "الفيديو غير موجود"
RENDITION_NOT_FOUND = "النسخة المطلوبة غير موجودة"
SEGMENT_NOT_FOUND = "المقطع غير موجود"
SESSION_NOT_FOUND = "الجلسة غير موجودة."
ADMIN_USER_NOT_FOUND = "المستخدم غير موجود."
ADMIN_CONTENT_NOT_FOUND = "العنصر غير موجود."
ADMIN_VIDEO_NOT_FOUND = "غير موجود."

# --- Video playback -------------------------------------------------------------
PLAYBACK_TOKEN_INVALID = "انتهت صلاحية رابط المشاهدة"
RENDITION_NOT_DIRECT = "هذه النسخة غير متاحة للعرض المباشر."
NOT_READY_STAGED = "الفيديو مرفوع بانتظار التغليف — شغّل ingest_video بـ --package force من جهاز به FFmpeg"
NOT_READY_PROCESSING = "الفيديو قيد المعالجة"
NOT_READY_ERROR = "فشلت معالجة الفيديو — راجع لوحة الإدارة"
NOT_READY = "الفيديو غير جاهز للعرض"


def provider_no_direct(provider_code: str) -> str:
    return f"المزود {provider_code} لا يدعم العرض المباشر."


def upstream_fetch_failed(provider_code: str, exc: Exception) -> str:
    return f"تعذّر جلب الفيديو من {provider_code}: {exc}"


# --- Auth -----------------------------------------------------------------------
MISSING_ID_TOKEN = "idToken مطلوب."
MISSING_REFRESH_TOKEN = "refreshToken مطلوب."
LOGIN_FAILED = "تعذر التحقق من الهوية."
# A lagging wall clock reads as a mystery rejection — the message names the fix.
LOGIN_FAILED_CLOCK = (
    "تعذر التحقق من الهوية — ساعة النظام متأخرة عن الساعة الحقيقية. "
    "شغّل `manage.py clock_drift` للتأكد، "
    "وزامِن الساعة بـ `sudo backend/scripts/sync_clock_from_http.sh` ثم أعد المحاولة."
)
SESSION_INVALID = "الجلسة غير صالحة."


def login_locked(wait: int) -> str:
    return f"محاولات دخول كثيرة — أعد المحاولة بعد {wait} ثانية."


# Session-revocation reason -> the line the SPA shows for a dead session.
REASON_MESSAGES = {
    "token_expired": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول من جديد.",
    "token_invalid": "رمز الدخول غير صالح.",
    "signed_in_elsewhere": "تم تسجيل الدخول من جهاز آخر، فتم إنهاء هذه الجلسة.",
    "logout": "تم تسجيل الخروج من هذه الجلسة.",
    "expired": "انتهت صلاحية الجلسة.",
    "revoked_by_admin": "تم إنهاء الجلسة بواسطة الإدارة.",
    "session_missing": "هذه الجلسة لم تعد موجودة.",
}

# --- Video console ----------------------------------------------------------------
MISSING_SLUG = "slug مطلوب."
CREATE_FAILED = "تعذّر الإنشاء."
MISSING_FILE_AND_SLUG = "الملف و معرّف الفيديو مطلوبان."
FILE_TOO_LARGE = "الملف أكبر من 2GB — قسّمه أو استخدم ingest_video من الخادم."
UPLOAD_IN_PROGRESS = "هذا المعرّف في منتصف رفع آخر — انتظر انتهاء المعالجة."
MISSING_USE_FFMPEG = "useFfmpeg مطلوب و يجب أن يكون true أو false."


def unknown_provider(provider_code: str) -> str:
    return f"مزود غير معروف: {provider_code}."


def provider_upload_unready(provider_name: str, reason: str) -> str:
    return f"الرفع عبر {provider_name} غير جاهز — {reason}"
