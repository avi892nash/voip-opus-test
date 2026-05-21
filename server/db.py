"""SQLite-backed user store.

Single users table, accessed via short-lived connections (the stdlib sqlite3 module
isn't async-safe across coroutines, but each call here opens its own connection so
concurrent requests do not share state). Concurrent writes are serialized at the
SQLite level, which is fine for this scale.
"""

from __future__ import annotations

import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
"""


@dataclass
class UserRow:
    id: str
    username: str
    email: str
    password_hash: str
    created_at: str


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(settings.db_path) or ".", exist_ok=True)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)


def _row_to_user(row: sqlite3.Row) -> UserRow:
    return UserRow(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        password_hash=row["password_hash"],
        created_at=row["created_at"],
    )


def create_user(username: str, email: str, password_hash: str) -> UserRow:
    user = UserRow(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        password_hash=password_hash,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    with _connect() as conn:
        try:
            conn.execute(
                "INSERT INTO users (id, username, email, password_hash, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (user.id, user.username, user.email, user.password_hash, user.created_at),
            )
        except sqlite3.IntegrityError as exc:
            msg = str(exc).lower()
            if "username" in msg:
                raise ValueError("That username is already taken.")
            if "email" in msg:
                raise ValueError("An account with that email already exists.")
            raise ValueError("Could not create account.") from exc
    return user


def get_user_by_id(user_id: str) -> Optional[UserRow]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_user(row) if row else None


def find_user_by_identifier(identifier: str) -> Optional[UserRow]:
    """Look up by username OR email (case-sensitive for username, case-insensitive for email)."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? OR lower(email) = lower(?) LIMIT 1",
            (identifier, identifier),
        ).fetchone()
    return _row_to_user(row) if row else None


def get_users_by_ids(ids: Iterable[str]) -> list[UserRow]:
    ids = list(ids)
    if not ids:
        return []
    placeholders = ",".join("?" for _ in ids)
    with _connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM users WHERE id IN ({placeholders})", ids
        ).fetchall()
    return [_row_to_user(r) for r in rows]
