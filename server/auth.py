"""Password hashing + JWT helpers + FastAPI auth dependency."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .config import settings
from .db import UserRow, get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.jwt_expires_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[str]:
    """Return the user id from a valid token, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


_unauth = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(token: Annotated[Optional[str], Depends(oauth2_scheme)]) -> UserRow:
    if not token:
        raise _unauth
    user_id = decode_token(token)
    if not user_id:
        raise _unauth
    user = get_user_by_id(user_id)
    if not user:
        raise _unauth
    return user
