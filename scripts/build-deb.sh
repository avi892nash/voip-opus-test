#!/usr/bin/env bash
#
# Build a .deb that installs the whole voip-opus stack (backend + built
# frontend) into /opt/voip-opus on a Debian/Raspbian/Ubuntu system.
#
# The .deb is `Architecture: all`: it carries Python source and pre-built JS
# only. The Python virtualenv is created on the TARGET machine by the
# postinst script, so wheels match the target's CPU (e.g. arm64 on a Pi).
#
# Requirements on the build machine:
#   - node + npm (for `npm run build`)
#   - fpm   (Ruby; `gem install --no-document fpm`  or  brew install fpm)
#   - dpkg-deb (Debian/Ubuntu: pre-installed; macOS: `brew install dpkg`)
#
# Usage:
#   scripts/build-deb.sh                       # version from package.json
#   scripts/build-deb.sh 0.2.0                 # explicit version override
#   FRONTEND_API_URL=https://thor.example.com \
#     scripts/build-deb.sh                     # bake the public hostname
#                                              # into the frontend bundle
#
# Output:
#   dist/voip-opus_<version>_all.deb

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Version source order:
#   1. positional arg  (`scripts/build-deb.sh 1.2.3`) — what CI passes
#   2. $VERSION env var
#   3. root package.json — the canonical source semantic-release maintains
VERSION="${1:-${VERSION:-$(node -p "require('./package.json').version")}}"
PKG_NAME="voip-opus"
ARCH="all"

OUT_DIR="$REPO_ROOT/dist"
STAGE="$REPO_ROOT/.deb-staging"

# --- 0. Sanity checks ----------------------------------------------------
for cmd in fpm node npm; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "✗ Required command not found: $cmd" >&2
        echo "  Install fpm: gem install --no-document fpm" >&2
        exit 1
    fi
done

# --- 1. Build the frontend -----------------------------------------------
echo "→ Building web/ (production)..."
(
  cd web
  npm install --no-audit --no-fund --silent
  # If VITE_API_URL / VITE_WS_URL aren't set, Vite reads them as empty and
  # the frontend uses relative URLs — which is what we want when the
  # FastAPI process serves the SPA on the same origin. So we don't bake any
  # API URL into the bundle by default.
  npm run build
)

# --- 2. Stage the file layout the .deb will install ----------------------
echo "→ Staging files in $STAGE ..."
rm -rf "$STAGE"
mkdir -p "$STAGE"

# /opt/voip-opus
install -d -m 755 "$STAGE/opt/voip-opus"
cp -r server "$STAGE/opt/voip-opus/"
cp server/requirements.txt "$STAGE/opt/voip-opus/requirements.txt"
# Drop test-only files — they're not needed in the deployed package.
rm -rf "$STAGE/opt/voip-opus/server/tests"
rm -rf "$STAGE/opt/voip-opus/server/__pycache__" \
       "$STAGE/opt/voip-opus/server"/*/__pycache__ 2>/dev/null || true

# Built frontend lives at /opt/voip-opus/web-dist
install -d -m 755 "$STAGE/opt/voip-opus/web-dist"
cp -r web/dist/. "$STAGE/opt/voip-opus/web-dist/"

# /lib/systemd/system/voip-opus.service
install -d -m 755 "$STAGE/lib/systemd/system"
install -m 644 scripts/voip-opus.service "$STAGE/lib/systemd/system/voip-opus.service"

# /etc/voip-opus.env  (dpkg conffile)
install -d -m 755 "$STAGE/etc"
install -m 640 scripts/deb/voip-opus.env "$STAGE/etc/voip-opus.env"

# --- 3. Build the .deb with fpm ------------------------------------------
mkdir -p "$OUT_DIR"
DEB_FILE="$OUT_DIR/${PKG_NAME}_${VERSION}_${ARCH}.deb"
rm -f "$DEB_FILE"

echo "→ Building $DEB_FILE ..."
fpm \
    -s dir \
    -t deb \
    -n "$PKG_NAME" \
    -v "$VERSION" \
    --architecture "$ARCH" \
    --maintainer "$(git config user.email 2>/dev/null || echo 'unknown@example.com')" \
    --description "Self-hosted Opus voice calls (1:1 + group rooms) over WebRTC, served as a PWA." \
    --license "MIT" \
    --depends "python3 (>= 3.10)" \
    --depends "python3-venv" \
    --depends "python3-pip" \
    --depends "adduser" \
    --depends "systemd" \
    --after-install scripts/deb/postinst \
    --before-remove scripts/deb/prerm \
    --after-remove  scripts/deb/postrm \
    --config-files /etc/voip-opus.env \
    --package "$DEB_FILE" \
    -C "$STAGE" \
    .

# --- 4. Done -------------------------------------------------------------
echo ""
echo "✓ Built $DEB_FILE"
ls -lh "$DEB_FILE"
echo ""
echo "Install on the Pi:"
echo "  scp $DEB_FILE pi@your-pi:/tmp/"
echo "  ssh pi@your-pi sudo apt install /tmp/$(basename "$DEB_FILE")"
echo ""
echo "Then point Cloudflare Tunnel at http://127.0.0.1:8000 and edit"
echo "/etc/voip-opus.env (CORS_ORIGINS) to match your public hostname."
