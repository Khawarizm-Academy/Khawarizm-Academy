"""Django settings for the Khawarizm Academy backend.

Kept intentionally small: Postgres/SQLite, DRF, CORS, and env-driven secrets.
The frontend is the only client, so there is no template/static setup.
"""

import os
import urllib.parse
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Vercel sets VERCEL=1 and VERCEL_URL=<deployment host> on every deployment.
IS_VERCEL = bool(os.environ.get("VERCEL"))
VERCEL_URL = os.environ.get("VERCEL_URL", "")

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


# Placeholder secrets that must never reach a non-debug run.
_PLACEHOLDER_SECRETS = {"dev-only-insecure-secret-key", "dev-only-change-me", "replace-with-a-real-secret"}

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key")
DEBUG = env_bool("DJANGO_DEBUG", DJANGO_ENV == "development" and not IS_VERCEL)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
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
    # Feature apps — one folder per product feature, mirroring the frontend.
    "features.auth",
    "features.catalog",
    "features.courses",
    "features.scholarships",
    "features.dashboard",
    "features.home",
    "features.events",
    "features.competitions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "config.middleware.ApiOriginRestrictionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
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
# On Vercel with no database, migrate runs at build time and the generated SQLite
# file is bundled into the function (read-only at runtime).
DATABASE_URL = os.environ.get("DATABASE_URL")
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
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "ar"
TIME_ZONE = "Asia/Riyadh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

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
    "EXCEPTION_HANDLER": "features.common.errors.api_exception_handler",
    "UNAUTHENTICATED_USER": None,
}
