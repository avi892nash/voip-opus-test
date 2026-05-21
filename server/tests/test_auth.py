"""Signup → login → /me round-trip + common error paths."""

from __future__ import annotations


def test_signup_then_login_then_me(client):  # type: ignore[no-untyped-def]
    r = client.post(
        "/api/auth/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "hunter2hunter"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    token = body["access_token"]
    assert body["user"]["username"] == "alice"
    assert body["user"]["email"] == "alice@example.com"

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "alice"

    # Login by username
    r = client.post(
        "/api/auth/login",
        json={"username_or_email": "alice", "password": "hunter2hunter"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["username"] == "alice"

    # Login by email (case-insensitive)
    r = client.post(
        "/api/auth/login",
        json={"username_or_email": "ALICE@example.COM", "password": "hunter2hunter"},
    )
    assert r.status_code == 200


def test_duplicate_username_rejected(client):  # type: ignore[no-untyped-def]
    payload = {"username": "bob", "email": "bob@example.com", "password": "abcdefgh1"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201

    payload2 = {"username": "bob", "email": "bob2@example.com", "password": "abcdefgh1"}
    r = client.post("/api/auth/signup", json=payload2)
    assert r.status_code == 409
    assert "username" in r.json()["detail"].lower()


def test_duplicate_email_rejected(client):  # type: ignore[no-untyped-def]
    client.post(
        "/api/auth/signup",
        json={"username": "carol", "email": "shared@example.com", "password": "abcdefgh1"},
    )
    r = client.post(
        "/api/auth/signup",
        json={"username": "carol2", "email": "shared@example.com", "password": "abcdefgh1"},
    )
    assert r.status_code == 409


def test_wrong_password_rejected(client):  # type: ignore[no-untyped-def]
    client.post(
        "/api/auth/signup",
        json={"username": "dave", "email": "dave@example.com", "password": "abcdefgh1"},
    )
    r = client.post(
        "/api/auth/login",
        json={"username_or_email": "dave", "password": "wrongpass1"},
    )
    assert r.status_code == 401


def test_me_requires_token(client):  # type: ignore[no-untyped-def]
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_rejects_garbage_token(client):  # type: ignore[no-untyped-def]
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_username_validation(client):  # type: ignore[no-untyped-def]
    r = client.post(
        "/api/auth/signup",
        json={"username": "ab", "email": "a@b.com", "password": "abcdefgh1"},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/auth/signup",
        json={"username": "bad space", "email": "a@b.com", "password": "abcdefgh1"},
    )
    assert r.status_code == 422


def test_password_min_length(client):  # type: ignore[no-untyped-def]
    r = client.post(
        "/api/auth/signup",
        json={"username": "ed", "email": "ed@example.com", "password": "short"},
    )
    assert r.status_code == 422
