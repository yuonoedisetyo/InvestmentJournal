#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ai/prepare-ai-task.sh <issue-number>

What it does:
  - Validates gh auth.
  - Reads the GitHub issue title, body, labels, and URL.
  - Creates a new branch: ai/<issue-number>-<slug>.
  - Writes a local prompt to .ai/runs/<issue-number>/prompt.md.
  - Adds a progress comment to the GitHub issue.
USAGE
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/\[ai task\]//g; s/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' \
    | cut -c 1-56 \
    | sed -E 's/-+$//'
}

ISSUE_NUMBER="${1:-}"

if [[ -z "$ISSUE_NUMBER" || "$ISSUE_NUMBER" == "-h" || "$ISSUE_NUMBER" == "--help" ]]; then
  usage
  exit 0
fi

[[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]] || die "Issue number must be numeric."

require_command git
require_command gh

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Run this from inside a git repository."
cd "$REPO_ROOT"

gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated. Run: gh auth login"

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Worktree is not clean. Commit, stash, or discard local changes before preparing a new AI task."
fi

TITLE="$(gh issue view "$ISSUE_NUMBER" --json title --jq '.title')" || die "Unable to read issue #$ISSUE_NUMBER."
BODY="$(gh issue view "$ISSUE_NUMBER" --json body --jq '.body // ""')"
URL="$(gh issue view "$ISSUE_NUMBER" --json url --jq '.url')"
STATE="$(gh issue view "$ISSUE_NUMBER" --json state --jq '.state')"
LABELS="$(gh issue view "$ISSUE_NUMBER" --json labels --jq '[.labels[].name] | join(", ")')"

[[ "$STATE" == "OPEN" ]] || die "Issue #$ISSUE_NUMBER is not open. Current state: $STATE"

SLUG="$(slugify "$TITLE")"
[[ -n "$SLUG" ]] || SLUG="task"

BRANCH="ai/${ISSUE_NUMBER}-${SLUG}"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  die "Local branch already exists: $BRANCH"
fi

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  die "Remote branch already exists: origin/$BRANCH"
fi

git switch -c "$BRANCH"

RUN_DIR=".ai/runs/${ISSUE_NUMBER}"
PROMPT_FILE="${RUN_DIR}/prompt.md"
mkdir -p "$RUN_DIR"

cat > "$PROMPT_FILE" <<PROMPT
# AI Task Prompt

Issue: #${ISSUE_NUMBER}
URL: ${URL}
Title: ${TITLE}
Labels: ${LABELS:-none}
Branch: ${BRANCH}

## Required Context

Read these files before editing:

- .ai/architecture.md
- .ai/coding-rules.md
- .ai/task-template.md
- planning/workflow-ai-coding-laptop-rumah.md

## Issue Body

${BODY}

## Working Rules

- Work only on the issue scope.
- Do not commit directly to main or master.
- Do not edit backend_blueprint/, backend_custom/, or frontend/dist/ unless explicitly requested.
- Do not commit .env, credentials, tokens, secrets, or local database dumps.
- Run verification commands relevant to the touched scope before creating a PR.
- If verification cannot be run, record the reason in the PR.
PROMPT

gh issue comment "$ISSUE_NUMBER" --body "AI task preparation started on branch \`${BRANCH}\`. Local prompt: \`${PROMPT_FILE}\`."

cat <<DONE
Prepared AI task #${ISSUE_NUMBER}

Branch:
  ${BRANCH}

Prompt:
  ${PROMPT_FILE}

Next:
  1. Read the prompt.
  2. Implement the issue scope.
  3. Commit changes.
  4. Run: scripts/ai/create-ai-pr.sh ${ISSUE_NUMBER}
DONE
