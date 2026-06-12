#!/bin/bash
# ServerSentinel - DB Maintenance Script
# Runs weekly: VACUUM, backup, old backup cleanup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="${DB_PATH:-$PROJECT_DIR/data/sentinel.db}"
BACKUP_DIR="$PROJECT_DIR/data/backups"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/db-maintenance.log"

mkdir -p "$LOG_DIR" "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/sentinel-$DATE.db"

echo "[$(date -Iseconds)] [INFO] DB Maintenance started" >> "$LOG_FILE"

if [ ! -f "$DB_PATH" ]; then
  echo "[$(date -Iseconds)] [ERROR] Database not found at $DB_PATH" >> "$LOG_FILE"
  exit 1
fi

cp "$DB_PATH" "$BACKUP_FILE"
echo "[$(date -Iseconds)] [INFO] Backup created: $BACKUP_FILE" >> "$LOG_FILE"

if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_PATH" "VACUUM;" >> "$LOG_FILE" 2>&1
  echo "[$(date -Iseconds)] [INFO] VACUUM completed" >> "$LOG_FILE"
else
  echo "[$(date -Iseconds)] [WARN] sqlite3 not found, skipping VACUUM" >> "$LOG_FILE"
fi

find "$BACKUP_DIR" -name "sentinel-*.db" -mtime +30 -delete 2>/dev/null
echo "[$(date -Iseconds)] [INFO] Old backups cleaned up (>30 days)" >> "$LOG_FILE"

echo "[$(date -Iseconds)] [INFO] DB Maintenance completed" >> "$LOG_FILE"
