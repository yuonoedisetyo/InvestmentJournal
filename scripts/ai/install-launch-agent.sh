#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .ai/local.env ]]; then
  echo "Missing .ai/local.env. Create it from .ai/local.env.example first."
  exit 1
fi

# shellcheck disable=SC1091
source .ai/local.env

LABEL="com.investmentjournal.ai-runner"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
INTERVAL="${AI_RUNNER_INTERVAL_SECONDS:-900}"

mkdir -p "${HOME}/Library/LaunchAgents" .ai/runs

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
      <string>${REPO_ROOT}/scripts/ai/auto-run-next-ai-task.sh</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${REPO_ROOT}</string>

    <key>StartInterval</key>
    <integer>${INTERVAL}</integer>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${REPO_ROOT}/.ai/runs/auto-runner.out.log</string>

    <key>StandardErrorPath</key>
    <string>${REPO_ROOT}/.ai/runs/auto-runner.err.log</string>
  </dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

cat <<DONE
Installed LaunchAgent:
  ${PLIST_PATH}

Interval:
  ${INTERVAL} seconds

Logs:
  ${REPO_ROOT}/.ai/runs/auto-runner.out.log
  ${REPO_ROOT}/.ai/runs/auto-runner.err.log
DONE
