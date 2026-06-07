#!/usr/bin/env bash
set -euo pipefail

LABEL="com.investmentjournal.ai-runner"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
rm -f "$PLIST_PATH"

echo "Uninstalled LaunchAgent: ${PLIST_PATH}"
