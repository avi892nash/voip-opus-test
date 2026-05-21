"""WebSocket signaling — authenticated at connect time via ?token=<jwt>.

Wire protocol (JSON messages, all keyed by `type`).

  Inbound (client → server):
    -- legacy 1:1 call (still used by /call) --
    call-request    { to }                              ring a single user
    call-response   { to, data: { accepted } }          accept/decline
    hang-up         { to }
    add-contact     { username }

    -- rooms (multi-party Meet-like) --
    room-create     { data?: { code? } }                make a room, returns code
    room-join       { data: { code } }                  join an existing room
    room-leave                                          leave the current room

    -- signaling (used by both 1:1 and rooms) --
    offer           { to, data: <RTCSessionDescription> }
    answer          { to, data: <RTCSessionDescription> }
    ice-candidate   { to, data: <RTCIceCandidate> }

  Outbound (server → client):
    websocket-connected   { data: { user } }
    contacts-update       { data: PublicUser[] }
    call-request          { from, data: { callerId, callerName } }
    call-response         { from, data: { accepted } }
    call-failed           { data: { reason } }
    hang-up               { from }
    offer/answer/ice-candidate { from, data }                forwarded

    -- room events --
    room-joined           { data: { code, participants: PublicUser[], you: PublicUser } }
    room-left             { data: { code } }
    room-error            { data: { reason } }
    participant-joined    { data: { participant: PublicUser, code } }
    participant-left      { data: { userId, code } }

Auth: the JWT is supplied as a query parameter so browsers can use the standard
WebSocket API (which can't set Authorization headers). Tokens are short-lived
JWTs and the channel must run over TLS in production.

Room model: in-memory, mesh-topology. The server only relays signaling — actual
audio packets fly peer-to-peer between browsers via WebRTC. A room is identified
by a short readable code (e.g. "purple-fox-42"). Empty rooms are garbage-
collected automatically on the last leave.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
from typing import Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from ..auth import decode_token
from ..db import UserRow, get_user_by_id, get_users_by_ids
from ..models import PublicUser


log = logging.getLogger("signaling")

router = APIRouter()


# --- Room-code generator --------------------------------------------------------------

_ADJECTIVES = [
    "amber", "azure", "brave", "bright", "calm", "clever", "coral", "crisp",
    "dewy", "eager", "fiery", "frosty", "gentle", "golden", "happy", "humble",
    "indigo", "jolly", "jade", "keen", "kind", "lively", "lucky", "merry",
    "misty", "noble", "olive", "plucky", "proud", "quick", "rosy", "scarlet",
    "silver", "snappy", "soft", "spry", "sunny", "swift", "teal", "tidy",
    "vivid", "warm", "witty", "wild", "young", "zany",
]
_ANIMALS = [
    "ant", "ape", "bat", "bee", "boar", "bug", "cat", "cod", "cow", "crab",
    "crow", "deer", "dog", "duck", "eel", "elk", "emu", "fox", "frog", "goat",
    "hare", "hawk", "hen", "ibis", "kiwi", "koala", "lamb", "lark", "lion",
    "lynx", "mole", "moose", "moth", "newt", "otter", "owl", "panda", "pig",
    "puma", "quail", "ram", "rat", "robin", "seal", "shark", "sheep", "snail",
    "squid", "stork", "swan", "tiger", "toad", "trout", "tuna", "wasp",
    "whale", "wolf", "yak", "zebra",
]


def _generate_room_code() -> str:
    return f"{random.choice(_ADJECTIVES)}-{random.choice(_ANIMALS)}-{random.randint(10, 99)}"


# --- ConnectionManager ----------------------------------------------------------------


class ConnectionManager:
    """In-memory registry of connected users plus the rooms they're in.

    All mutations happen on the event loop thread; the asyncio.Lock guards the
    rare case where two coroutines try to add/remove a user simultaneously.
    """

    def __init__(self) -> None:
        self._sockets: dict[str, WebSocket] = {}            # user_id → ws
        self._rooms: dict[str, set[str]] = {}               # room_code → {user_id, ...}
        self._user_room: dict[str, str] = {}                # user_id → room_code
        self._lock = asyncio.Lock()

    # -- presence -----------------------------------------------------------------

    async def register(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            old = self._sockets.get(user_id)
            self._sockets[user_id] = ws
        if old is not None:
            try:
                await old.close(code=status.WS_1008_POLICY_VIOLATION)
            except Exception:  # noqa: BLE001
                pass

    async def unregister(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            if self._sockets.get(user_id) is ws:
                self._sockets.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return user_id in self._sockets

    def online_ids(self) -> list[str]:
        return list(self._sockets.keys())

    async def send_to(self, user_id: str, payload: dict[str, Any]) -> bool:
        ws = self._sockets.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(payload))
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("send failure to %s: %s", user_id, exc)
            return False

    async def broadcast_roster(self) -> None:
        """Push the current online roster to every connected client."""
        ids = self.online_ids()
        users = get_users_by_ids(ids)
        payload = {
            "type": "contacts-update",
            "data": [
                PublicUser(
                    id=u.id, username=u.username, email=u.email, created_at=u.created_at
                ).model_dump()
                for u in users
            ],
        }
        async with self._lock:
            sockets = list(self._sockets.items())
        for uid, ws in sockets:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception as exc:  # noqa: BLE001
                log.warning("roster broadcast to %s failed: %s", uid, exc)

    # -- rooms --------------------------------------------------------------------

    def room_of(self, user_id: str) -> Optional[str]:
        return self._user_room.get(user_id)

    def members(self, code: str) -> list[str]:
        return list(self._rooms.get(code, set()))

    async def create_room(self, requested: Optional[str] = None) -> str:
        """Reserve an empty room. The caller has to follow up with `join_room`."""
        async with self._lock:
            for _ in range(20):
                code = (requested or _generate_room_code()).lower().strip()
                if code and code not in self._rooms:
                    self._rooms[code] = set()
                    return code
                if requested:
                    # caller insisted on a specific code that's taken
                    raise ValueError("Room code already in use.")
            raise ValueError("Could not allocate a unique room code, try again.")

    async def join_room(self, code: str, user_id: str) -> set[str]:
        """Add user to room. Returns the OTHER members already present."""
        async with self._lock:
            code = code.lower().strip()
            if code not in self._rooms:
                # Be lenient: if the code looks well-formed, auto-create.
                # That way two people can agree on a code in chat and just join.
                self._rooms[code] = set()
            # If this user was in another room, drop that membership first.
            prev = self._user_room.get(user_id)
            if prev and prev != code:
                self._rooms.get(prev, set()).discard(user_id)
                if prev in self._rooms and not self._rooms[prev]:
                    self._rooms.pop(prev, None)
            existing_others = set(self._rooms[code])
            existing_others.discard(user_id)
            self._rooms[code].add(user_id)
            self._user_room[user_id] = code
            return existing_others

    async def leave_room(self, user_id: str) -> Optional[tuple[str, set[str]]]:
        """Remove user from whichever room they're in. Returns (code, remaining)."""
        async with self._lock:
            code = self._user_room.pop(user_id, None)
            if not code:
                return None
            members = self._rooms.get(code, set())
            members.discard(user_id)
            if not members:
                self._rooms.pop(code, None)
            return code, set(members)


manager = ConnectionManager()


# --- Connection bootstrap -------------------------------------------------------------


async def _authenticate(ws: WebSocket) -> Optional[UserRow]:
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="missing token")
        return None
    user_id = decode_token(token)
    if not user_id:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid token")
        return None
    user = get_user_by_id(user_id)
    if not user:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="user not found")
        return None
    return user


async def _safe_send(ws: WebSocket, payload: dict[str, Any]) -> None:
    try:
        await ws.send_text(json.dumps(payload))
    except Exception:  # noqa: BLE001
        pass


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    user = await _authenticate(ws)
    if not user:
        return

    await manager.register(user.id, ws)
    await _safe_send(
        ws,
        {
            "type": "websocket-connected",
            "data": {
                "user": PublicUser(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    created_at=user.created_at,
                ).model_dump()
            },
        },
    )
    await manager.broadcast_roster()

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _safe_send(
                    ws, {"type": "error", "data": {"message": "invalid JSON"}}
                )
                continue

            await _route(user, msg)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.warning("ws error for %s: %s", user.id, exc)
    finally:
        # If they were in a room, tell the rest of the room.
        left = await manager.leave_room(user.id)
        if left:
            code, remaining = left
            await _broadcast_to_room(code, remaining, {
                "type": "participant-left",
                "data": {"userId": user.id, "code": code},
            })
        await manager.unregister(user.id, ws)
        await manager.broadcast_roster()


# --- Message routing ------------------------------------------------------------------


def _public(u: UserRow) -> dict[str, Any]:
    return PublicUser(
        id=u.id, username=u.username, email=u.email, created_at=u.created_at
    ).model_dump()


async def _broadcast_to_room(code: str, member_ids: set[str], payload: dict[str, Any]) -> None:
    for uid in member_ids:
        await manager.send_to(uid, payload)


async def _route(sender: UserRow, msg: dict[str, Any]) -> None:
    msg_type = msg.get("type")
    to = msg.get("to")
    data = msg.get("data") or {}

    # --- 1:1 call setup ---
    if msg_type == "call-request":
        if not isinstance(to, str):
            return
        delivered = await manager.send_to(
            to,
            {
                "type": "call-request",
                "from": sender.id,
                "data": {"callerId": sender.id, "callerName": sender.username},
            },
        )
        if not delivered:
            await manager.send_to(
                sender.id,
                {"type": "call-failed", "data": {"reason": "User is offline."}},
            )
        return

    # --- room control ---
    if msg_type == "room-create":
        try:
            requested = (data.get("code") or None) if isinstance(data, dict) else None
            code = await manager.create_room(requested)
        except ValueError as e:
            await manager.send_to(
                sender.id, {"type": "room-error", "data": {"reason": str(e)}}
            )
            return
        # Auto-join the creator so the next message can already be signaling.
        existing = await manager.join_room(code, sender.id)
        members = get_users_by_ids(existing)
        await manager.send_to(
            sender.id,
            {
                "type": "room-joined",
                "data": {
                    "code": code,
                    "you": _public(sender),
                    "participants": [_public(m) for m in members],
                },
            },
        )
        # Tell the others that someone joined (existing is empty for fresh rooms,
        # but matters if create was called with an already-known code).
        await _broadcast_to_room(code, existing, {
            "type": "participant-joined",
            "data": {"participant": _public(sender), "code": code},
        })
        return

    if msg_type == "room-join":
        code = (data.get("code") or "") if isinstance(data, dict) else ""
        code = code.lower().strip()
        if not code:
            await manager.send_to(
                sender.id, {"type": "room-error", "data": {"reason": "Missing room code."}}
            )
            return
        existing = await manager.join_room(code, sender.id)
        members = get_users_by_ids(existing)
        await manager.send_to(
            sender.id,
            {
                "type": "room-joined",
                "data": {
                    "code": code,
                    "you": _public(sender),
                    "participants": [_public(m) for m in members],
                },
            },
        )
        await _broadcast_to_room(code, existing, {
            "type": "participant-joined",
            "data": {"participant": _public(sender), "code": code},
        })
        return

    if msg_type == "room-leave":
        left = await manager.leave_room(sender.id)
        if left:
            code, remaining = left
            await manager.send_to(
                sender.id, {"type": "room-left", "data": {"code": code}}
            )
            await _broadcast_to_room(code, remaining, {
                "type": "participant-left",
                "data": {"userId": sender.id, "code": code},
            })
        return

    # --- per-peer signaling (works for both 1:1 calls and rooms) ---
    if msg_type in {"call-response", "offer", "answer", "ice-candidate", "hang-up"}:
        if not isinstance(to, str):
            return
        # If sender is in a room, only allow signaling to other members.
        sender_room = manager.room_of(sender.id)
        if sender_room is not None:
            members = set(manager.members(sender_room))
            if to not in members:
                return
        await manager.send_to(to, {
            "type": msg_type,
            "from": sender.id,
            "data": msg.get("data"),
        })
        return

    # Unknown types are silently dropped.
