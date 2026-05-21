#!/usr/bin/env bash
#
# Back up the voip-opus SQLite database safely (uses .backup, which is
# WAL-aware), gzip it, write to a destination directory, and rotate old
# backups.
#
# Usage:
#   scripts/backup.sh                                  # uses defaults below
#   scripts/backup.sh /mnt/usb/backups                  # custom destination
#   BACKUP_KEEP_DAYS=30 scripts/backup.sh               # change rotation window
#
# Env (or .env at repo root):
#   DB_PATH         path to the SQLite file        (default: ./data/voip.db)
#   BACKUP_DIR      where snapshots go             (default: ./backups)
#   BACKUP_KEEP_DAYS  delete backups older than N  (default: 14)

set -euo pipefail

# Resolve repo root regardless of where this is invoked from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Load .env if present so the script picks up the same DB_PATH the server uses.
if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

DB_PATH="${DB_PATH:-./data/voip.db}"
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "✗ DB not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/voip-$STAMP.db"

# SQLite .backup is the right way to snapshot a live DB — it co-operates with
# the WAL log so the resulting file is internally consistent even if the
# server is mid-write. Plain `cp` of a WAL-mode DB can produce a torn file.
sqlite3 "$DB_PATH" ".backup '$OUT'"

# Compress and remove the uncompressed intermediate.
gzip -9 "$OUT"
OUT="$OUT.gz"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✓ Wrote $OUT ($SIZE)"

# Rotate: delete backups older than KEEP_DAYS.
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "voip-*.db.gz" -mtime "+$KEEP_DAYS" -print -delete | wc -l | tr -d ' ')
if [[ "$DELETED" -gt 0 ]]; then
  echo "  rotated out $DELETED backup(s) older than $KEEP_DAYS days"
fi
