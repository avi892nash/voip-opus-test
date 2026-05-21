"""FastAPI app entrypoint.

Run with:  uvicorn server.main:app --reload  (from repo root)

In production, this same process serves:
  - /api/*          REST endpoints
  - /ws             WebSocket signaling
  - everything else the built React PWA (web/dist/ or path from WEB_DIST env)
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routes import auth_routes, users_routes
from .ws import signaling


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title="VoIP + Opus backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API + WebSocket routes (registered FIRST so they win over the SPA fallback) ---
app.include_router(auth_routes.router)
app.include_router(users_routes.router)
app.include_router(signaling.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Static SPA serving ---
#
# The whole point of the .deb deploy: one process answers /api/*, /ws, AND the
# frontend. WEB_DIST defaults to the repo-relative web/dist (so `npm run build`
# in web/ is enough for local prod-mode testing). In the .deb, postinst
# installs the built assets to /opt/voip-opus/web-dist and the systemd unit
# sets WEB_DIST accordingly.

WEB_DIST_ENV = os.environ.get("WEB_DIST")
WEB_DIST = Path(WEB_DIST_ENV) if WEB_DIST_ENV else (Path(__file__).resolve().parent.parent / "web" / "dist")

_NO_CACHE = "no-cache, no-store, must-revalidate"
_IMMUTABLE = "public, max-age=31536000, immutable"
_NEVER_CACHE_FILES = {"sw.js", "registerSW.js", "manifest.webmanifest"}


def _file_response(path: Path, *, immutable: bool = False) -> FileResponse:
    headers: dict[str, str] = {}
    if path.name in _NEVER_CACHE_FILES or path.name == "index.html":
        headers["cache-control"] = _NO_CACHE
    elif immutable:
        headers["cache-control"] = _IMMUTABLE
    return FileResponse(path, headers=headers)


if WEB_DIST.is_dir():
    log = logging.getLogger("static")
    log.info("Serving SPA from %s", WEB_DIST)

    assets_dir = WEB_DIST / "assets"
    if assets_dir.is_dir():
        # Vite hashes the filenames inside /assets/, so they're safe to cache
        # forever. The mount happens BEFORE the catch-all below.
        app.mount(
            "/assets",
            StaticFiles(directory=assets_dir),
            name="assets",
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> Response:
        """SPA fallback. Tries to serve a file from WEB_DIST; falls back to
        index.html for client-side-routed paths so React Router can handle them.
        """
        # Don't shadow API/WS — the routes registered above already match
        # those, but if a weird path like /api/foo reaches here (no API
        # route matched) we still don't want to return index.html for it.
        if full_path.startswith("api/") or full_path == "ws":
            return Response(status_code=404)
        if full_path:
            candidate = (WEB_DIST / full_path).resolve()
            # Path-traversal guard: candidate must be inside WEB_DIST.
            try:
                candidate.relative_to(WEB_DIST.resolve())
            except ValueError:
                return Response(status_code=403)
            if candidate.is_file():
                return _file_response(candidate)
        # Default: serve index.html for any client-routed path.
        index = WEB_DIST / "index.html"
        if index.is_file():
            return _file_response(index)
        return Response(status_code=404)
else:
    logging.getLogger("static").info(
        "WEB_DIST %s does not exist — running in API-only mode "
        "(frontend is served separately).",
        WEB_DIST,
    )
