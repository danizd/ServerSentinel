#!/bin/bash
# ServerSentinel - Nightly Pipeline Script
# Runs the threat report generation pipeline

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
DATE=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
LOG_FILE="$LOG_DIR/pipeline-$DATE.log"

mkdir -p "$LOG_DIR"

echo "[$(date -Iseconds)] [INFO] Pipeline started for $DATE" >> "$LOG_FILE"

cd "$PROJECT_DIR"

if ! command -v node &> /dev/null; then
  echo "[$(date -Iseconds)] [ERROR] Node.js not found" >> "$LOG_FILE"
  exit 1
fi

node src/pipeline/run.js "$DATE" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$(date -Iseconds)] [INFO] Pipeline completed successfully" >> "$LOG_FILE"
else
  echo "[$(date -Iseconds)] [ERROR] Pipeline failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

find "$LOG_DIR" -name "pipeline-*.log" -mtime +30 -delete 2>/dev/null

exit $EXIT_CODE
