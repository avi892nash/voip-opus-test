"""Environment-based configuration for the VoIP+Opus backend.

All settings have local-friendly defaults so `uvicorn server.main:app` works out of
the box. In production, set JWT_SECRET to something strong and CORS_ORIGINS to your
real frontend origin.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if not raw:
        return default
    return [p.strip() for p in raw.split(",") if p.strip()]


@dataclass(frozen=True)
class Settings:
    port: int
    jwt_secret: str
    jwt_algorithm: str
    jwt_expires_days: int
    db_path: str
    cors_origins: list[str]


def load_settings() -> Settings:
    return Settings(
        port=int(_env("PORT", "8000")),
        jwt_secret=_env("JWT_SECRET", "dev-insecure-change-me"),
        jwt_algorithm=_env("JWT_ALGORITHM", "HS256"),
        jwt_expires_days=int(_env("JWT_EXPIRES_DAYS", "7")),
        db_path=_env("DB_PATH", "./data/voip.db"),
        cors_origins=_env_list(
            "CORS_ORIGINS",
            [
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:4173",  # vite preview
            ],
        ),
    )


settings = load_settings()
