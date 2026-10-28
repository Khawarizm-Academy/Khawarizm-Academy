"""Django settings for the Khawarizm Academy backend.

Kept intentionally small: Postgres/SQLite, DRF, CORS, and env-driven secrets.
The frontend is the only client, so there is no template/static setup.
"""

import logging
import os
import shutil
import tempfile
import urllib.parse
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

from config.logging import build_logging_config
from features.common.throttling import SCOPED_RATES

BASE_DIR = Path(__file__).resolve().parent.parent
LOGGER = logging.getLogger(__name__)

# Vercel sets VERCEL=1 and VERCEL_URL=<deployment host> on every deployment.
IS_VERCEL = bool(os.environ.get("VERCEL"))
VERCEL_URL = os.environ.get("VERCEL_URL", "")

# Vercel runs the app as an AWS Lambda: the project is unpacked under /var/task,
# which is packaged read-only, and /tmp is the only writable path. Builds run in
# a normal container instead, so this stays False while `migrate` populates the
# bundle.
IS_SERVERLESS_RUNTIME = IS_VERCEL and (
    bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME")) or str(BASE_DIR).startswith("/var/task")
)

# Profile selector — export DJANGO_ENV in the host environment to pick a profile.
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development")

# On Vercel, config comes from Project Environment Variables; elsewhere load the file.
if not IS_VERCEL:
    load_dotenv(BASE_DIR / f".env.{DJANGO_ENV}")


# Reads an env var with a type-appropriate default, so local dev needs no .env file.
def env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        return int(raw.strip())
    except ValueError:
        return default


# Placeholder secrets that must never reach a non-debug run.
_PLACEHOLDER_SECRETS = {"dev-only-insecure-secret-key", "dev-only-change-me", "replace-with-a-real-secret"}

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key")
DEBUG = env_bool("DJANGO_DEBUG", DJANGO_ENV == "development" and not IS_VERCEL)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1", "khawarizm-academy.firebaseapp.com"])
if IS_VERCEL:
    # Accept the project domain, this deployment, and every preview URL.
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, ".vercel.app"]
    if VERCEL_URL:
        ALLOWED_HOSTS.append(VERCEL_URL)

# Fail loudly instead of shipping a placeholder secret to production.
if not DEBUG and SECRET_KEY in _PLACEHOLDER_SECRETS:
    raise ImproperlyConfigured("Set a real DJANGO_SECRET_KEY for non-debug environments.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    # Shared, non-feature code (abstract models + management commands).
    "features.common",
    # Feature apps — one folder per product feature, mirroring the frontend.
    "features.auth",
    "features.catalog",
    "features.courses",
    "features.scholarships",
    "features.dashboard",
    "features.home",
    "features.events",
    "features.competitions",
    "features.profile",
    "features.adminconsole",
    "features.videohosting",
]

# Every account (student / instructor / admin) lives in the auth feature app.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "config.middleware.RequestIDMiddleware",
    "config.middleware.RequestMetricsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "config.middleware.ApiOriginRestrictionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.HardeningHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Postgres when DATABASE_URL is provided (Vercel Postgres/Neon); SQLite otherwise.
DATABASE_URL = os.environ.get("DATABASE_URL")
# A host with a mounted volume can pin the SQLite file to it (e.g. /data/db.sqlite3),
# which keeps one durable file instead of a per-instance /tmp copy.
SQLITE_PATH = os.environ.get("SQLITE_PATH", "")


def resolve_sqlite_path(
    base_dir: Path,
    serverless: bool,
    runtime_dir: Path | None = None,
    override: str | None = None,
) -> Path:
    """Pick a writable SQLite file for the current environment.

    A serverless bundle is read-only, so writing the bundled file fails with
    "attempt to write a readonly database" (a 500 on every sign-up or edit).
    Copy the build-time database into the one writable directory (/tmp) once
    per instance and write there. Writes are per-instance and reset on cold
    starts, so set DATABASE_URL for durable storage.

    `override` (the SQLITE_PATH env var) wins everywhere: point it at a mounted
    volume to keep a single durable file without a database server.
    """
    if override:
        return Path(override)
    if not serverless:
        return base_dir / "db.sqlite3"
    bundled = base_dir / "db.sqlite3"
    runtime = (runtime_dir or Path(tempfile.gettempdir())) / "db.sqlite3"
    if not runtime.exists() and bundled.exists():
        shutil.copy2(bundled, runtime)
    return runtime


if DATABASE_URL:
    db = urllib.parse.urlparse(DATABASE_URL)
    options = {}
    sslmode = urllib.parse.parse_qs(db.query).get("sslmode", [None])[0]
    if sslmode:
        options["sslmode"] = sslmode
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db.path.lstrip("/"),
            "USER": db.username,
            "PASSWORD": db.password,
            "HOST": db.hostname,
            "PORT": db.port,
            "OPTIONS": options,
            "CONN_MAX_AGE": 0,
            "DISABLE_SERVER_SIDE_CURSORS": True,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": resolve_sqlite_path(BASE_DIR, IS_SERVERLESS_RUNTIME, override=SQLITE_PATH),
            # The upload worker and its tracker flusher run on their own
            # connections; Django's default shared-cache in-memory test DB
            # fails those writes instantly with "database table is locked"
            # (SQLITE_LOCKED ignores the busy timeout). A file-backed test DB
            # lets contention resolve through the normal busy timeout instead.
            "TEST": {"NAME": str(Path(tempfile.gettempdir()) / "khawarizm-test-db.sqlite3")},
        }
    }

# Sessions and every other row live in the database. An ephemeral SQLite copy
# cannot keep them, so users are randomly logged out with 401 "session_missing".
# Shout about it: this misconfiguration is invisible otherwise.
if IS_SERVERLESS_RUNTIME and not DATABASE_URL and not SQLITE_PATH:
    LOGGER.warning(
        "Serverless runtime without DATABASE_URL: using an ephemeral SQLite copy in /tmp. "
        "Accounts, sessions, and every other write are lost on cold starts and invisible "
        "across instances, so sign-ins fail with 401. Attach Postgres (Vercel Postgres / "
        "Neon / Supabase) and set DATABASE_URL."
    )

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "ar"
TIME_ZONE = "Asia/Riyadh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# One JSON log line per request (config.logging builds the dict): request id,
# user id, path, status, duration, query count. DEBUG level in dev, INFO prod;
# the formatter whitelists fields so no secrets or request bodies can leak.
LOGGING = build_logging_config(DEBUG)

# The SPA calls this API from a different origin.
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    ["http://localhost:5173", "http://127.0.0.1:5173"],
)
# Vercel serves the SPA from its own domain and from per-deploy preview URLs.
if IS_VERCEL:
    CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://[a-z0-9.-]+\.vercel\.app$"]

# Vercel terminates TLS and forwards the original scheme to the app.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Transport & browser hardening. The gate is `not DEBUG`: a dev run over plain
# HTTP keeps redirects off and cookies settable, while any prod-shaped run
# (DEBUG=false) locks down unless the env says otherwise. The Phase-1
# `check --deploy` warnings (W004/W008/W012/W016) are these four settings.
SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = env_int("DJANGO_HSTS_SECONDS", 0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", not DEBUG)
# Protocol-agnostic: no downside over plain HTTP either.
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CONTENT_TYPE_NOSNIFF = True

# Trust the same origins for CSRF (Django admin) over HTTPS.
CSRF_TRUSTED_ORIGINS = [*CORS_ALLOWED_ORIGINS]
if IS_VERCEL and VERCEL_URL:
    CSRF_TRUSTED_ORIGINS.append(f"https://{VERCEL_URL}")

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["features.auth.authentication.AccessTokenAuthentication"],
    # Scoped throttling (features.common.throttling owns the rates): every view
    # passes through ScopedRateThrottle, which throttles only views tagged
    # with a throttle_scope and lets the rest through untouched.
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": SCOPED_RATES,
    "EXCEPTION_HANDLER": "features.common.errors.api_exception_handler",
}

# Firebase. Two halves that must agree:
#   • the WEB app config (public — it ships inside the browser bundle) is served
#     to the SPA by `/api/auth/config`, which initializes `firebase/app`;
#   • the ADMIN SDK (private) verifies the ID tokens the SPA sends back.
# Only Auth is used, so these three values are the whole web config: copy them
# from Firebase console → Project settings → Your apps → SDK setup and
# configuration. (Storage, Messaging, and Analytics keys are not needed and are
# deliberately not read.)
FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")
FIREBASE_AUTH_DOMAIN = os.environ.get("FIREBASE_AUTH_DOMAIN", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")

# The Admin SDK service account, only needed for privileged calls (custom
# claims, user management, revocation checks). Never commit it: pass a path or
# the raw JSON through the host environment.
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS", "")
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")

# A project id is the switch: once it is set the API stops accepting `dev:` tokens.
# Dev fallback: accept `dev:<email>[:<role>]` tokens while no Firebase project is set.
FIREBASE_ALLOW_DEV_TOKENS = env_bool("FIREBASE_ALLOW_DEV_TOKENS", DEBUG)
# How far the verifier lets the machine clock drift from Google's. ID tokens are
# stamped with the issuer's time, so a box whose clock lags rejects every sign-in
# with "Token used too early" — WSL drifts like this after a suspend. The SDK
# caps this at 60; clamping keeps a typo from breaking every login.
FIREBASE_CLOCK_SKEW_SECONDS = max(0, min(60, env_int("FIREBASE_CLOCK_SKEW_SECONDS", 60)))

# Half a config is worse than none — it boots, then every sign-in fails in the
# browser. Catch it here, where the message can say what to paste.
if FIREBASE_PROJECT_ID and not (FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN):
    raise ImproperlyConfigured(
        "FIREBASE_PROJECT_ID is set but FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN are not. "
        "Copy the entire web config block from Firebase console → Project settings → "
        "Your apps, or clear FIREBASE_PROJECT_ID to keep using dev:<email> tokens."
    )

# Telegram is the video CDN (unlimited, free) and the control plane stays tiny.
# Ingest needs the API credentials; serving only needs the tokens, so a
# serverless deploy can run with just TELEGRAM_STREAM_TOKEN.
TELEGRAM_API_ID = os.environ.get("TELEGRAM_API_ID", "")
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "")
# Bot used for ingest/upload (a member of the storage channel).
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
# Throwaway, read-only bot whose token appears in redirect URLs; it can only
# read ciphertext segments, never the AES keys, so a leak is bounded.
TELEGRAM_STREAM_TOKEN = os.environ.get("TELEGRAM_STREAM_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID", "")

# How long a minted playback grant lives before the viewer must re-mint.
STREAM_TOKEN_TTL_HOURS = env_int("STREAM_TOKEN_TTL_HOURS", 6)

# Google Drive is the managed playback host (features/videohosting/providers/google_drive.py).
# Auth is OAuth 2.0 (authorization-code, offline access): the backend stores the
# human refresh token in DriveGrant after the consent callback — env files carry
# the OAuth CLIENT keys and the folder id, never a Google credential. Every key
# is a SECRET — never commit a real value; set them in the host environment.
GOOGLE_DRIVE_CLIENT_ID = os.environ.get("GOOGLE_DRIVE_CLIENT_ID", "")
GOOGLE_DRIVE_CLIENT_SECRET = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "")
GOOGLE_DRIVE_ROOT_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")
GOOGLE_DRIVE_OAUTH_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "")
# The provider assets default to when none is named explicitly.
VIDEO_HOSTING_DEFAULT_PROVIDER = os.environ.get("VIDEO_HOSTING_DEFAULT_PROVIDER", "google_drive")

# Whether HLS packaging via FFmpeg runs automatically after upload.
# When False the platform accepts raw uploads and serves them directly
# (Google Drive works out-of-the-box; Telegram needs FFmpeg for HLS).
VIDEO_HOSTING_USE_FFMPEG = env_bool("VIDEO_HOSTING_USE_FFMPEG", default=True)
