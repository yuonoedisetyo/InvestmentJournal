#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

mkdir -p .ai/runs

LOCK_DIR=".ai/runs/auto-runner.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "AI runner is already active. Skipping this interval."
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

if [[ ! -f .ai/local.env ]]; then
  echo "Missing .ai/local.env. Create it from .ai/local.env.example first."
  exit 1
fi

# shellcheck disable=SC1091
source .ai/local.env

DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)"
[[ -n "$DEFAULT_BRANCH" ]] || DEFAULT_BRANCH="main"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Worktree is not clean. Skipping automation to avoid touching user work."
  git status --short
  exit 0
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]]; then
  git switch "$DEFAULT_BRANCH"
fi

git pull --ff-only origin "$DEFAULT_BRANCH"

scripts/ai/run-next-ai-task.sh --allow-empty
