"""Pydantic models for request/response bodies."""

from __future__ import annotations

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-]{3,32}$")


class SignupBody(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-32 chars, letters/digits/_/- only.")
        return v


class LoginBody(BaseModel):
    username_or_email: str = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


class PublicUser(BaseModel):
    id: str
    username: str
    email: str
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    user: PublicUser
