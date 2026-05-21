"""POST /api/auth/signup, /login + GET /api/auth/me."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..db import UserRow, create_user, find_user_by_identifier
from ..models import AuthResponse, LoginBody, PublicUser, SignupBody


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _public(user: UserRow) -> PublicUser:
    return PublicUser(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupBody) -> AuthResponse:
    try:
        user = create_user(body.username, str(body.email), hash_password(body.password))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return AuthResponse(access_token=create_access_token(user.id), user=_public(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginBody) -> AuthResponse:
    user = find_user_by_identifier(body.username_or_email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong username/email or password.",
        )
    return AuthResponse(access_token=create_access_token(user.id), user=_public(user))


@router.get("/me", response_model=PublicUser)
def me(user: Annotated[UserRow, Depends(get_current_user)]) -> PublicUser:
    return _public(user)
