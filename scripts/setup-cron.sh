#!/bin/bash
# ServerSentinel - Cron Setup Script
# Installs all cron jobs for the honeypot system

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "ServerSentinel Cron Setup"
echo "========================"
echo ""

CRON_ENTRIES="
# ServerSentinel - Nightly Pipeline (daily at 00:00)
0 0 * * * $SCRIPT_DIR/nightly.sh

# ServerSentinel - Health Check (every 5 minutes)
*/5 * * * * $SCRIPT_DIR/health-check.sh

# ServerSentinel - DB Maintenance (Sundays at 02:00)
0 2 * * 0 $SCRIPT_DIR/db-maintenance.sh

# ServerSentinel - Log Rotation (daily at 01:00)
0 1 * * * $SCRIPT_DIR/log-rotation.sh
"

(crontab -l 2>/dev/null | grep -v "ServerSentinel"; echo "$CRON_ENTRIES") | crontab -

if [ $? -eq 0 ]; then
  echo "Cron jobs installed successfully!"
  echo ""
  echo "Installed jobs:"
  echo "  - nightly.sh:     0 0 * * *  (daily 00:00)"
  echo "  - health-check.sh: */5 * * * * (every 5 min)"
  echo "  - db-maintenance.sh: 0 2 * * 0 (Sundays 02:00)"
  echo "  - log-rotation.sh: 0 1 * * * (daily 01:00)"
  echo ""
  echo "Verify with: crontab -l"
else
  echo "ERROR: Failed to install cron jobs"
  exit 1
fi
