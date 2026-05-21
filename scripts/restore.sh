#!/usr/bin/env bash
#
# Restore the voip-opus DB from a backup produced by scripts/backup.sh.
#
# Usage:
#   scripts/restore.sh path/to/voip-YYYYMMDDTHHMMSSZ.db.gz
#
# What it does:
#   1. Refuses to run if the server is still up (you'd corrupt the DB).
#   2. Renames the current DB to <DB_PATH>.pre-restore-<timestamp>.
#   3. Decompresses the backup into place.
#   4. Verifies by counting users.
#
# Env (or .env):
#   DB_PATH         path to the SQLite file  (default: ./data/voip.db)
#   SERVICE_NAME    systemd unit to check     (default: voip-opus)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

DB_PATH="${DB_PATH:-./data/voip.db}"
SERVICE_NAME="${SERVICE_NAME:-voip-opus}"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <backup-file.db.gz>" >&2
  echo "       (looks like voip-YYYYMMDDTHHMMSSZ.db.gz)" >&2
  exit 2
fi

BACKUP="$1"

if [[ ! -f "$BACKUP" ]]; then
  echo "✗ Backup file not found: $BACKUP" >&2
  exit 1
fi

# Refuse to restore over a running server.
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "✗ Service '$SERVICE_NAME' is running. Stop it first:" >&2
    echo "    sudo systemctl stop $SERVICE_NAME" >&2
    exit 1
  fi
fi

# Move the current DB aside, never overwrite without a recoverable copy.
if [[ -f "$DB_PATH" ]]; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  SIDELINED="${DB_PATH}.pre-restore-${STAMP}"
  mv "$DB_PATH" "$SIDELINED"
  echo "→ moved current DB aside: $SIDELINED"
fi

# Decompress into place. Use a temp file then atomically rename so a power
# cut mid-restore doesn't leave a half-written DB at the canonical path.
mkdir -p "$(dirname "$DB_PATH")"
TMP="${DB_PATH}.restoring"
gunzip -c "$BACKUP" > "$TMP"
mv "$TMP" "$DB_PATH"

# Sanity check.
COUNT="$(sqlite3 "$DB_PATH" 'SELECT count(*) FROM users;')"
echo "✓ Restored $DB_PATH from $BACKUP"
echo "  users table has $COUNT row(s)"
if command -v systemctl >/dev/null 2>&1; then
  echo "  start the server again with:  sudo systemctl start $SERVICE_NAME"
fi
