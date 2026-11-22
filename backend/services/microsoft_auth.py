"""Sign-in with a university Microsoft account (simulated for now).

AUTH_MODE=password   -> the original email + password forms (default, nothing changes)
AUTH_MODE=microsoft  -> one "Continue with Microsoft" button; only ALLOWED_EMAIL_DOMAIN emails get in

While MS_MOCK is true, a local mock page plays the role of Microsoft: it issues a signed token with the
same shape as a real Microsoft ID token (email, name, tenant id). The backend verifies that token and the
email domain exactly as it would for a real one, so only verify_id_token() changes when the real
Microsoft app registration exists.
"""
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt

AUTH_MODE = os.getenv("AUTH_MODE", "password").strip().lower()
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "sharjah.ac.ae").strip().lower().lstrip("@")
# Keeps the original email/password login available next to Microsoft (for the demo students and testing).
AUTH_DEV_LOGIN = os.getenv("AUTH_DEV_LOGIN", "true").strip().lower() == "true"
MS_MOCK = os.getenv("MS_MOCK", "true").strip().lower() == "true"

MS_TENANT_ID = os.getenv("MS_TENANT_ID", "").strip()
MS_CLIENT_ID = os.getenv("MS_CLIENT_ID", "").strip()

_MOCK_SECRET = os.getenv("JWT_SECRET_KEY", "change-me-in-production") + "::mock-microsoft"
_MOCK_ISSUER = "mock-microsoft"
_MOCK_TENANT = "mock-uos-tenant"


def microsoft_enabled() -> bool:
    return AUTH_MODE == "microsoft"


def mock_enabled() -> bool:
    return microsoft_enabled() and MS_MOCK


def domain_allowed(email: str) -> bool:
    return email.strip().lower().endswith("@" + ALLOWED_EMAIL_DOMAIN)


# Student email format: U + 7 digits, e.g. U1234567@sharjah.ac.ae
STUDENT_EMAIL_RE = re.compile(r"^u\d{7}@" + re.escape(ALLOWED_EMAIL_DOMAIN) + r"$")


def is_student_email(email: str) -> bool:
    return bool(STUDENT_EMAIL_RE.match(email.strip().lower()))


STUDENT_EMAIL_MESSAGE = f"Use your student email: StudentID@{ALLOWED_EMAIL_DOMAIN} (U followed by 7 digits)."


def issue_mock_id_token(name: str, email: str) -> str:
    """What the fake Microsoft page hands back after the user 'signs in'."""
    now = datetime.now(timezone.utc)
    claims = {
        "iss": _MOCK_ISSUER,
        "tid": _MOCK_TENANT,
        "name": name.strip(),
        "preferred_username": email.strip().lower(),
        "email": email.strip().lower(),
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    return jwt.encode(claims, _MOCK_SECRET, algorithm="HS256")


def verify_id_token(id_token: str) -> dict:
    """Return {'name', 'email'} from a verified token, or raise HTTPException."""
    if MS_MOCK:
        try:
            claims = jwt.decode(id_token, _MOCK_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired Microsoft sign-in.")
        if claims.get("iss") != _MOCK_ISSUER:
            raise HTTPException(status_code=401, detail="Invalid Microsoft sign-in.")
    else:
        # Real Microsoft: needs the app registration (MS_TENANT_ID / MS_CLIENT_ID) and a check of the token
        # signature against Microsoft's published keys. Not wired up yet.
        raise HTTPException(status_code=501, detail="Real Microsoft sign-in is not configured yet.")

    email = (claims.get("email") or claims.get("preferred_username") or "").strip().lower()
    if not email or not is_student_email(email):
        raise HTTPException(status_code=403, detail=STUDENT_EMAIL_MESSAGE)
    name = (claims.get("name") or email.split("@")[0]).strip()
    return {"name": name, "email": email}
