"""GET /api/users/online — list of users currently connected via WS."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..db import UserRow, get_users_by_ids
from ..models import PublicUser
from ..ws.signaling import manager


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/online", response_model=list[PublicUser])
def online_users(_: Annotated[UserRow, Depends(get_current_user)]) -> list[PublicUser]:
    ids = manager.online_ids()
    users = get_users_by_ids(ids)
    return [
        PublicUser(id=u.id, username=u.username, email=u.email, created_at=u.created_at)
        for u in users
    ]
