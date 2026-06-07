#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ai/list-ai-tasks.sh [--limit <number>]

What it does:
  - Lists open GitHub issues labeled ai-task and ai-ready.
  - Skips issues labeled ai-in-progress, blocked, or needs-review.
  - Prints the prepare command for each issue.
  - Does not create branches, comments, commits, or Pull Requests.
USAGE
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

LIMIT=20

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)
      shift
      [[ "${1:-}" =~ ^[0-9]+$ ]] || die "--limit requires a numeric value."
      LIMIT="$1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
  shift
done

require_command git
require_command gh

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Run this from inside a git repository."
cd "$REPO_ROOT"

gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated. Run: gh auth login"

READY_FILTER='
[
  .[]
  | select(([.labels[].name] | index("ai-in-progress") | not))
  | select(([.labels[].name] | index("blocked") | not))
  | select(([.labels[].name] | index("needs-review") | not))
]
'

COUNT="$(gh issue list \
  --state open \
  --label ai-task \
  --label ai-ready \
  --limit "$LIMIT" \
  --json number,title,labels,url,updatedAt \
  --jq "${READY_FILTER} | length")"

if [[ -z "$COUNT" || "$COUNT" == "0" ]]; then
  cat <<EMPTY
No ready AI tasks found.

Criteria:
  include: ai-task, ai-ready
  exclude: ai-in-progress, blocked, needs-review
EMPTY
  exit 0
fi

cat <<HEADER
Ready AI tasks (${COUNT})

Criteria:
  include: ai-task, ai-ready
  exclude: ai-in-progress, blocked, needs-review

HEADER

gh issue list \
  --state open \
  --label ai-task \
  --label ai-ready \
  --limit "$LIMIT" \
  --json number,title,labels,url,updatedAt \
  --jq "${READY_FILTER} | .[] | \"- #\(.number): \(.title)\n  URL: \(.url)\n  Labels: \([.labels[].name] | join(\", \"))\n  Updated: \(.updatedAt)\n  Prepare: scripts/ai/prepare-ai-task.sh \(.number)\n\""
