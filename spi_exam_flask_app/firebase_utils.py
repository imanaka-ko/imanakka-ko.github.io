"""
Helper functions for interacting with Firebase Authentication via the
Identity Toolkit REST API and Firebase Admin SDK.

These functions wrap the REST endpoints needed to sign up users,
sign users in with email and password, send verification emails,
update a user's email, update a user's password and verify ID
tokens.  They rely on the Firebase API key for REST calls and a
service account JSON for server‑side token verification and session
management.

Before using these functions, set the following environment
variables:

* `FIREBASE_API_KEY` – your web API key from the Firebase project settings.
* `GOOGLE_APPLICATION_CREDENTIALS` – path to the service account JSON
  file.  The Firebase Admin SDK uses this to initialize.

See the official Firebase documentation for details on these endpoints.
`accounts:signUp`, `accounts:signInWithPassword`,
`accounts:sendOobCode` and `accounts:update` are documented in the
Firebase Identity Toolkit API reference.  Sensitive operations like
changing email or password require the user to have recently signed
in【872928145847261†L1549-L1567】【872928145847261†L1609-L1627】.
"""

from __future__ import annotations

import os
import datetime
import requests
from typing import Any, Dict

import firebase_admin
from firebase_admin import credentials, auth


# -----------------------------------------------------------------------------
# Initialization

API_KEY = os.getenv("FIREBASE_API_KEY")
if not API_KEY:
    raise EnvironmentError(
        "FIREBASE_API_KEY environment variable must be set with your project's Web API key"
    )

# Initialize the Firebase Admin SDK only once
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise EnvironmentError(
            "GOOGLE_APPLICATION_CREDENTIALS must point to your service account JSON file"
        )
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


def _post(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Internal helper to POST to the Identity Toolkit API."""
    url = f"https://identitytoolkit.googleapis.com/v1/{endpoint}?key={API_KEY}"
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


# -----------------------------------------------------------------------------
# Public API

def sign_up(email: str, password: str) -> Dict[str, Any]:
    """Create a new user account with email and password.

    Returns a dictionary containing `idToken`, `refreshToken`, `localId`, etc.
    See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signUp
    """
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True,
    }
    return _post("accounts:signUp", payload)


def sign_in(email: str, password: str) -> Dict[str, Any]:
    """Sign in a user with email and password.

    Returns a dictionary containing `idToken`, `refreshToken`, `localId`, etc.
    See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithPassword
    """
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True,
    }
    return _post("accounts:signInWithPassword", payload)


def send_verification_email(id_token: str) -> Dict[str, Any]:
    """Send a verification email to the user represented by the given ID token.

    In Firebase, you cannot send an email without a user ID token.  The
    Identity Toolkit `accounts:sendOobCode` endpoint requires an `idToken`
    and a `requestType` of `VERIFY_EMAIL`.
    See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode
    """
    payload = {
        "requestType": "VERIFY_EMAIL",
        "idToken": id_token,
    }
    return _post("accounts:sendOobCode", payload)


def update_email(id_token: str, new_email: str) -> Dict[str, Any]:
    """Update the user's email address.

    The user must have recently signed in for this operation to succeed【872928145847261†L1549-L1567】.
    See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update
    """
    payload = {
        "idToken": id_token,
        "email": new_email,
        "returnSecureToken": True,
    }
    return _post("accounts:update", payload)


def update_password(id_token: str, new_password: str) -> Dict[str, Any]:
    """Update the user's password.

    The user must have recently signed in for this operation to succeed【872928145847261†L1609-L1627】.
    See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update
    """
    payload = {
        "idToken": id_token,
        "password": new_password,
        "returnSecureToken": True,
    }
    return _post("accounts:update", payload)


def verify_id_token(id_token: str, check_revoked: bool = False) -> Dict[str, Any]:
    """Verify the signature and claims of an ID token using the Firebase Admin SDK.

    Returns the decoded token dictionary.  Raises ValueError on failure.
    """
    return auth.verify_id_token(id_token, check_revoked=check_revoked)


def create_session_cookie(id_token: str, expires_in: int = 60 * 60 * 24) -> str:
    """Generate a session cookie from an ID token.

    Session cookies allow persistent authentication in web contexts.  The
    expiration must be between 5 minutes and 14 days.  The default here is
    24 hours.
    See https://firebase.google.com/docs/auth/admin/manage-cookies
    """
    return auth.create_session_cookie(id_token, expires_in=datetime.timedelta(seconds=expires_in))  # type: ignore[arg-type]


def verify_session_cookie(session_cookie: str, check_revoked: bool = False) -> Dict[str, Any]:
    """Verify a session cookie and return the decoded claims.

    Raises `auth.InvalidSessionCookieError` if the cookie is invalid.
    See https://firebase.google.com/docs/auth/admin/manage-cookies#verify_session_cookies
    """
    return auth.verify_session_cookie(session_cookie, check_revoked=check_revoked)
