"""Pytest fixtures — gives each test a fresh in-memory DB and TestClient."""

from __future__ import annotations

import os
import tempfile

import pytest


@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):  # type: ignore[no-untyped-def]
    """Point every test at its own temp SQLite file."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    monkeypatch.setenv("DB_PATH", tmp.name)
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    # Reload settings + modules that captured them at import time.
    import importlib

    from server import config

    importlib.reload(config)

    from server import db as db_module

    importlib.reload(db_module)
    db_module.init_db()

    from server import auth as auth_module

    importlib.reload(auth_module)

    from server.routes import auth_routes, users_routes

    importlib.reload(auth_routes)
    importlib.reload(users_routes)

    from server.ws import signaling

    importlib.reload(signaling)

    from server import main as main_module

    importlib.reload(main_module)

    yield main_module.app

    try:
        os.unlink(tmp.name)
    except OSError:
        pass


@pytest.fixture()
def client(fresh_db):  # type: ignore[no-untyped-def]
    from fastapi.testclient import TestClient

    with TestClient(fresh_db) as c:
        yield c
