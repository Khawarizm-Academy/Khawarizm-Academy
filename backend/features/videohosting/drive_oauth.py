# Google OAuth 2.0 (authorization-code + offline access) — the backend-only grant
# The Django process owns every Google credential: it builds the consent URL,
# validates the redirect's CSRF state, exchanges the code, and stores the
# refresh token in `DriveGrant`. React never sees a token — not even in error
# payloads; the frontend learns the account email and the status alone.
#
# Scope: `drive.file` is the least privilege that fits — the app creates files
# in the pre-existing folder (parents at creation time) and later serves the
# files it created. It cannot read arbitrary folder metadata, so diagnostics
# prove the folder with a 1-byte write probe instead of a GET.
from __future__ import annotations

import base64
import hashlib
import json
import urllib.parse
import urllib.request
import uuid
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from features.videohosting.models import DriveAuthState, DriveGrant

GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke"

UPLOAD_SCOPE = "https://www.googleapis.com/auth/drive.file"
# openid + email ride along only to identify the granting account for the admin.
AUTH_SCOPES = f"{UPLOAD_SCOPE} openid email"
REQUEST_SECONDS = 30

# A state link is single-use and short-lived; Google's redirect is the only consumer.
STATE_TTL = timedelta(minutes=10)
# Failure-refresh margin: reuse a cached access token only comfortably ahead of expiry.
PENDING_EXPIRY_MARGIN = timedelta(seconds=60)


def consent_url() -> str:
    """Step 1 — build the consent URL and bank a single-use CSRF state.

    Returns the URL for the admin to open; the raw state rides in it, only its
    SHA-256 is stored, and the row dies after one validation or its 10-minute TTL.
    """
    if not configured():
        raise ValueError(
            "Google Drive غير ماركية — set GOOGLE_DRIVE_CLIENT_ID, "
            "GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_OAUTH_REDIRECT_URI و GOOGLE_DRIVE_ROOT_FOLDER_ID"
        )
    raw = uuid.uuid4().hex
    DriveAuthState.objects.create(state_hash=_hash(raw), expires_at=timezone.now() + STATE_TTL)
    return f"{GOOGLE_OAUTH_AUTH_URL}?" + urllib.parse.urlencode({
        "client_id": (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip(),
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": AUTH_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": raw,
    })


def complete(raw_state: str, code: str) -> tuple[bool, str, str]:
    """Step 2 — validate the state, trade the code, persist the grant.

    Returns (ok, account_email_or_"", detail). The refresh token is written to
    `DriveGrant` and never echoed back — not in this tuple, not anywhere else.
    """
    if not _consume_state(raw_state):
        return False, "", "state غير صالح أو منتهي — ابدأ تخويلًا جديدًا من لوحة الإدارة."
    payload = _exchange_code(code)
    if payload.get("error"):
        # Google refused the exchange (a spent code, a redirect mismatch, …) —
        # its own description is the actionable message; nothing persists.
        detail = payload.get("error_description") or payload["error"]
        return False, "", f"رفض Google التبادل: {str(detail)[:200]}"
    refresh_token = payload.get("refresh_token", "")
    email = _id_token_email(payload.get("id_token", ""))
    if not refresh_token:
        # Re-grants on an already-authorized app omit the token — that is the
        # documented shape, and an existing grant keeps its stored one.
        previous = _current_row()
        if previous is None:
            return False, email, "Google لم يعد refresh token — اتبع consent المطلوب (prompt=consent) وأعد المحاولة."
        payload["refresh_token"] = previous.refresh_token
        refresh_token = previous.refresh_token  # keep the stored credential alive
        email = email or previous.account_email
    DriveGrant.objects.all().delete()  # one live grant — the new consent supersedes
    grant = DriveGrant.objects.create(
        account_email=email or "(غير معروف)",
        refresh_token=refresh_token,
        scope=payload.get("scope", ""),
        access_token=payload.get("access_token", ""),
        access_token_expires_at=timezone.now() + _expiry(payload),
    )
    return True, grant.account_email, f"تم التخويل بحساب {grant.account_email} بنجاح."


def access_token() -> tuple[bool, str, str]:
    """A bearer for Drive calls — cached access token, else a grant refresh."""
    grant = _current_row()
    if grant is None:
        return False, "", "لم يتم تخويل Google بعد — افتح «تخويل حساب Google» من لوحة الإدارة."
    if grant.status == DriveGrant.Status.REVOKED:
        return False, "", grant.error_message or "تخويل Google منسوح — أعد التخويل من لوحة الإدارة."
    if grant.access_token and grant.access_token_expires_at and timezone.now() < grant.access_token_expires_at - PENDING_EXPIRY_MARGIN:
        return True, grant.access_token, "استخدم access token المخزَّن."
    payload = _post_token({
        "client_id": (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip(),
        "client_secret": (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip(),
        "refresh_token": grant.refresh_token,
        "grant_type": "refresh_token",
    })
    if payload is None:
        mark_revoked(grant, "تعذّر الاتصال مع Google — أعد المحاولة.")
        return False, "", "تعذّر الاتصال مع Google."
    bearer = payload.get("access_token", "")
    if not bearer:
        detail = payload.get("error_description") or payload.get("error") or "مجهول"
        # Google sends error=invalid_grant with a description that may not
        # contain it — judge the pair; re-authorization is the only fix.
        if "invalid_grant" in f"{payload.get('error', '')} {detail}":
            mark_revoked(grant, "refresh token منسوح أو منتهي — أعد التخويل من لوحة الإدارة.")
            return False, "", "تخويل Google منسوح أو منتهي — أعد التخويل من لوحة الإدارة."
        return False, "", f"رفض Google مطلب التجديد: {detail[:200]}"
    grant.access_token = bearer
    grant.access_token_expires_at = timezone.now() + _expiry(payload)
    grant.error_message = ""
    grant.save(update_fields=["access_token", "access_token_expires_at", "error_message", "updated_at"])
    return True, bearer, "حصل على access token بنجاح."


def connected() -> dict:
    """The admin-safe status — email and state only, never a token."""
    grant = _current_row()
    if grant is None:
        return {"connected": False, "account_email": "", "status": "", "error_message": ""}
    return {
        "connected": grant.status == DriveGrant.Status.ACTIVE,
        "account_email": grant.account_email,
        "status": grant.status,
        "error_message": grant.error_message,
    }


def revoke() -> None:
    """Best-effort Google-side revocation; the DB grant row is dropped either way."""
    grant = _current_row()
    if grant is not None:
        request = urllib.request.Request(  # noqa: S310 — fixed Google host, revoking our grant
            GOOGLE_OAUTH_REVOKE_URL, data=urllib.parse.urlencode({"token": grant.refresh_token}).encode("utf-8")
        )
        try:
            urllib.request.urlopen(request, timeout=REQUEST_SECONDS)  # noqa: S310 — fixed Google host
        except Exception:
            pass  # an already-dead token revoking again still leaves the DB clean
    DriveGrant.objects.all().delete()


def mark_revoked(grant: DriveGrant, message: str) -> None:
    """A dead refresh token cannot heal — stamp the row so the admin sees it."""
    grant.status = DriveGrant.Status.REVOKED
    grant.error_message = message
    grant.save(update_fields=["status", "error_message", "updated_at"])


def configured() -> bool:
    return redirect_uri() and bool((settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()) and \
        bool((settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip())


def redirect_uri() -> str:
    return (settings.GOOGLE_DRIVE_OAUTH_REDIRECT_URI or "").strip()


def _consume_state(raw: str) -> bool:
    try:
        row = DriveAuthState.objects.get(state_hash=_hash(raw))
    except DriveAuthState.DoesNotExist:
        return False
    row.delete()  # single use, even if it is expired
    return timezone.now() <= row.expires_at


def _current_row() -> DriveGrant | None:
    return DriveGrant.objects.order_by("-created_at")[:1].first()


def _exchange_code(code: str) -> dict:
    client_id = (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()
    request = urllib.request.Request(  # noqa: S310 — fixed Google host, backend-only secret
        GOOGLE_OAUTH_TOKEN_URL,
        data=urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip(),
            "code": code.strip(),
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
        }).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed Google host
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # Google's refusal IS the payload (invalid_grant and friends live here) —
        # surfacing it lets the caller give the actionable message.
        try:
            return json.loads(error.read().decode("utf-8"))
        except Exception:
            return {"error": f"رفض Google الطلب: {error}"}
    except Exception as exc:
        return {"error": f"تعذّر الاتصال مع Google: {exc}"}


def _post_token(body: dict) -> dict | None:
    request = urllib.request.Request(  # noqa: S310 — fixed Google host, backend-only secret
        GOOGLE_OAUTH_TOKEN_URL, data=urllib.parse.urlencode(body).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed Google host
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # A 400 invalid_grant is Google's answer, not a network outage — read it.
        try:
            return json.loads(error.read().decode("utf-8"))
        except Exception:
            return None
    except Exception:
        return None


def _id_token_email(id_token: str) -> str:
    """The granting account's email, straight from the minted id_token's claims."""
    try:
        payload = json.loads(base64.urlsafe_b64decode(id_token.split(".")[1] + "===").decode("utf-8"))
        return str(payload.get("email") or "")
    except Exception:
        return ""


def _expiry(payload: dict) -> timedelta:
    try:
        return timedelta(seconds=int(payload.get("expires_in", 3600)))
    except (TypeError, ValueError):
        return timedelta(hours=1)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
