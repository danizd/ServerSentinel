#!/bin/bash
# ServerSentinel - Health Check Script
# Verifies all honeypot services are running

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/health-check.log"

mkdir -p "$LOG_DIR"

HTTP_PORT="${HTTP_PORT:-80}"
SSH_PORT="${SSH_PORT:-2222}"
FTP_PORT="${FTP_PORT:-2121}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

check_port() {
  local port=$1
  local name=$2
  if nc -z localhost "$port" 2>/dev/null; then
    echo "  $name (port $port): UP"
    return 0
  else
    echo "  $name (port $port): DOWN"
    return 1
  fi
}

echo "[$(date -Iseconds)] Health Check" >> "$LOG_FILE"

DOWN_COUNT=0

check_port $HTTP_PORT "HTTP" >> "$LOG_FILE" || ((DOWN_COUNT++))
check_port $SSH_PORT "SSH" >> "$LOG_FILE" || ((DOWN_COUNT++))
check_port $FTP_PORT "FTP" >> "$LOG_FILE" || ((DOWN_COUNT++))
check_port $MYSQL_PORT "MySQL" >> "$LOG_FILE" || ((DOWN_COUNT++))

if [ $DOWN_COUNT -gt 0 ]; then
  echo "  WARNING: $DOWN_COUNT service(s) down" >> "$LOG_FILE"
  if command -v docker-compose &> /dev/null; then
    cd "$PROJECT_DIR"
    docker-compose restart honeypot >> "$LOG_FILE" 2>&1
    echo "  Attempted restart of honeypot container" >> "$LOG_FILE"
  fi
else
  echo "  All services UP" >> "$LOG_FILE"
fi

find "$LOG_DIR" -name "health-check.log" -size +1M -exec truncate -s 0 {} \; 2>/dev/null
