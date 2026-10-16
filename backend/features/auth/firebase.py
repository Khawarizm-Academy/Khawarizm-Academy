"""Verifies Firebase ID tokens and maps them onto our `User` table.

Real verification uses the Firebase Admin SDK: the project id names the project
whose public keys signed the token, and a service account (when one is
configured) unlocks the privileged calls. In development, when no project is
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


def _service_account():
    """The configured service account, or None to use the ambient default."""
    from firebase_admin import credentials

    if settings.FIREBASE_CREDENTIALS_PATH:
        return credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    if settings.FIREBASE_CREDENTIALS:
        return credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS))
    return None


def _admin_auth():
    import firebase_admin
    from firebase_admin import auth as fb_auth

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credential=_service_account(),
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
        decoded = _admin_auth().verify_id_token(id_token, check_revoked=False)
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
