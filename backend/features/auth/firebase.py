"""Verifies Firebase ID tokens and maps them onto our `User` table.

Real verification uses the Firebase Admin SDK: the project id names the project
whose public keys signed the token, and no service account is required — the SDK
only needs Google's public certs. A service account (when configured) unlocks the
privileged calls, like revocation checks. In development, when no project is
configured, a `dev:<email>[:role]` token is accepted so the SPA runs locally
without a Firebase project.
"""

from __future__ import annotations

import json

from django.conf import settings

from features.common.choices import AuthProvider, Role

# Firebase `sign_in_provider` -> our provider enum.
_PROVIDER_MAP = {
    "password": AuthProvider.PASSWORD,
    "google.com": AuthProvider.GOOGLE,
    "facebook.com": AuthProvider.FACEBOOK,
}


class FirebaseError(Exception):
    """Raised when an ID token cannot be trusted."""


def _credential():
    """The credential the Admin SDK is initialized with.

    A service account is only needed for *privileged* calls (revocation checks,
    custom claims). Verifying an ID token just needs the project id plus Google's
    public certs, so when no service account is configured we hand the SDK a
    credential that carries no secret. The alternative — letting it fall back to
    Application Default Credentials — makes every sign-in fail on a machine that
    has none, after a slow probe of the GCE metadata endpoint.
    """
    from firebase_admin import credentials
    from google.auth.credentials import AnonymousCredentials

    if settings.FIREBASE_CREDENTIALS_PATH:
        return credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    if settings.FIREBASE_CREDENTIALS:
        return credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS))
    return AnonymousCredentials()


def _admin_auth():
    import firebase_admin
    from firebase_admin import auth as fb_auth

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credential=_credential(),
            options={"projectId": settings.FIREBASE_PROJECT_ID},
        )
    return fb_auth


def verify_id_token(id_token: str) -> dict:
    """Return `{uid, email, name, picture, provider}` or raise `FirebaseError`."""
    if settings.FIREBASE_PROJECT_ID:
        return _verify_with_firebase(id_token)
    if settings.FIREBASE_ALLOW_DEV_TOKENS and id_token.startswith("dev:"):
        return _verify_dev(id_token)
    raise FirebaseError("Firebase is not configured on this server.")


def _verify_with_firebase(id_token: str) -> dict:
    try:
        decoded = _admin_auth().verify_id_token(
            id_token,
            check_revoked=False,
            clock_skew_seconds=settings.FIREBASE_CLOCK_SKEW_SECONDS,
        )
    except Exception as exc:  # firebase_admin raises several subclasses
        raise FirebaseError(str(exc)) from exc
    provider_name = decoded.get("firebase", {}).get("sign_in_provider", "password")
    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", ""),
        "name": decoded.get("name", ""),
        "picture": decoded.get("picture", ""),
        "provider": _PROVIDER_MAP.get(provider_name, AuthProvider.PASSWORD),
    }


def _verify_dev(id_token: str) -> dict:
    """A dev token looks like `dev:user@x.com` or `dev:user@x.com:instructor`."""
    parts = id_token.split(":")
    email = parts[1] if len(parts) > 1 else ""
    if not email:
        raise FirebaseError("Dev token is missing an email.")
    role = parts[2] if len(parts) > 2 and parts[2] in Role.values else Role.STUDENT
    return {"uid": f"dev-{email}", "email": email, "name": email.split("@")[0], "picture": "", "provider": AuthProvider.DEV, "role": role}
