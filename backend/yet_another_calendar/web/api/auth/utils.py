"""Auth utilities for tutor authentication."""
from datetime import datetime, timedelta, UTC
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from yet_another_calendar.settings import settings

security = HTTPBearer()


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
