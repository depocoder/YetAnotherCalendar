"""Auth utilities for tutor authentication."""
from datetime import datetime, timedelta, UTC
import hashlib
import hmac
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from yet_another_calendar.settings import settings

security = HTTPBearer()

CALENDAR_COOKIE = "yac_calendar"
CALENDAR_AUDIENCE = "calendar-cache"


def create_calendar_token(person_id: str) -> str:
    """Proof of a successful Modeus login, limited to reading its calendar cache."""
    key = hmac.digest(settings.tutor_secret_key.encode(), b"calendar-cache", hashlib.sha256)
    return jwt.encode(
        {"sub": person_id, "aud": CALENDAR_AUDIENCE,
         "exp": datetime.now(UTC) + timedelta(seconds=settings.redis_events_time_live)},
        key, algorithm="HS256",
    )


def calendar_person_id(value: str | None) -> str | None:
    if not value:
        return None
    key = hmac.digest(settings.tutor_secret_key.encode(), b"calendar-cache", hashlib.sha256)
    try:
        payload = jwt.decode(
            value, key, algorithms=["HS256"], audience=CALENDAR_AUDIENCE,
            options={"require": ["exp", "sub", "aud"]},
        )
    except jwt.PyJWTError:
        return None
    return payload["sub"] if isinstance(payload["sub"], str) else None


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token() -> str:
    """Create a JWT access token for tutor."""
    expire = datetime.now(UTC) + timedelta(seconds=settings.tutor_jwt_time_live)
    to_encode = {"exp": expire, "sub": "tutor"}
    return jwt.encode(to_encode, settings.tutor_secret_key, algorithm="HS256")


def verify_tutor_token(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]) -> None:
    """Verify tutor JWT token."""
    try:
        payload = jwt.decode(credentials.credentials, settings.tutor_secret_key, algorithms=["HS256"])
        if payload.get("sub") != "tutor":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
