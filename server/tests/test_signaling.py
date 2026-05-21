"""WebSocket signaling — auth gating and message forwarding."""

from __future__ import annotations

import json


def _signup(client, username, password="abcdefgh1"):  # type: ignore[no-untyped-def]
    r = client.post(
        "/api/auth/signup",
        json={"username": username, "email": f"{username}@x.com", "password": password},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_ws_rejects_missing_token(client):  # type: ignore[no-untyped-def]
    with client.websocket_connect("/ws") as ws:  # type: ignore[arg-type]
        # Server closes with 1008 immediately. TestClient raises on receive.
        import pytest
        from starlette.websockets import WebSocketDisconnect

        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()


def test_ws_rejects_bad_token(client):  # type: ignore[no-untyped-def]
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws?token=not-a-real-token") as ws:
        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()


def test_ws_connect_sends_hello_and_roster(client):  # type: ignore[no-untyped-def]
    alice = _signup(client, "alice")
    with client.websocket_connect(f"/ws?token={alice['access_token']}") as ws:
        hello = json.loads(ws.receive_text())
        assert hello["type"] == "websocket-connected"
        assert hello["data"]["user"]["username"] == "alice"
        roster = json.loads(ws.receive_text())
        assert roster["type"] == "contacts-update"
        assert any(u["username"] == "alice" for u in roster["data"])


def test_call_request_forwarded(client):  # type: ignore[no-untyped-def]
    alice = _signup(client, "alice")
    bob = _signup(client, "bob")

    with client.websocket_connect(f"/ws?token={alice['access_token']}") as a:
        # Drain alice's hello + initial roster.
        a.receive_text()
        a.receive_text()
        with client.websocket_connect(f"/ws?token={bob['access_token']}") as b:
            b.receive_text()
            b.receive_text()
            # Alice gets a roster update when Bob joins.
            a_roster = json.loads(a.receive_text())
            assert a_roster["type"] == "contacts-update"
            assert {u["username"] for u in a_roster["data"]} == {"alice", "bob"}

            # Alice calls Bob.
            a.send_text(
                json.dumps({"type": "call-request", "to": bob["user"]["id"]})
            )
            incoming = json.loads(b.receive_text())
            assert incoming["type"] == "call-request"
            assert incoming["from"] == alice["user"]["id"]
            assert incoming["data"]["callerName"] == "alice"


def test_call_request_to_offline_user_gets_call_failed(client):  # type: ignore[no-untyped-def]
    alice = _signup(client, "alice")
    bob = _signup(client, "bob")  # signed up but never connects

    with client.websocket_connect(f"/ws?token={alice['access_token']}") as a:
        a.receive_text()  # hello
        a.receive_text()  # roster
        a.send_text(json.dumps({"type": "call-request", "to": bob["user"]["id"]}))
        msg = json.loads(a.receive_text())
        assert msg["type"] == "call-failed"


def test_sdp_offer_forwarded(client):  # type: ignore[no-untyped-def]
    alice = _signup(client, "alice")
    bob = _signup(client, "bob")

    with client.websocket_connect(f"/ws?token={alice['access_token']}") as a:
        a.receive_text(); a.receive_text()
        with client.websocket_connect(f"/ws?token={bob['access_token']}") as b:
            b.receive_text(); b.receive_text()
            a.receive_text()  # roster update

            fake_offer = {"type": "offer", "sdp": "v=0..."}
            a.send_text(
                json.dumps({"type": "offer", "to": bob["user"]["id"], "data": fake_offer})
            )
            forwarded = json.loads(b.receive_text())
            assert forwarded["type"] == "offer"
            assert forwarded["from"] == alice["user"]["id"]
            assert forwarded["data"] == fake_offer
