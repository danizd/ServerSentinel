#!/bin/bash
# ServerSentinel - Log Rotation Script
# Rotates and compresses old logs

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
ARCHIVE_DIR="$LOG_DIR/archive"

mkdir -p "$ARCHIVE_DIR"

echo "[$(date -Iseconds)] Log rotation started"

find "$LOG_DIR" -name "*.log" -not -path "$ARCHIVE_DIR/*" -mtime +7 -exec gzip -9 {} \; -exec mv {}.gz "$ARCHIVE_DIR/" \; 2>/dev/null

find "$ARCHIVE_DIR" -name "*.gz" -mtime +30 -delete 2>/dev/null

echo "[$(date -Iseconds)] Log rotation completed"
