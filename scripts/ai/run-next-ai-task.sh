#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ai/run-next-ai-task.sh [--issue <number>] [--limit <number>] [--dry-run] [--allow-empty]

Environment:
  AI_AGENT_COMMAND   Required. Shell command that edits code for the task.
                     Use {prompt} for the prompt file path and {issue} for the issue number.
                     If {prompt} is omitted, the prompt file path is appended.

  AI_VERIFY_COMMAND  Optional. Shell command to run after the agent edits files.
                     Supports {prompt} and {issue} placeholders.

  AI_COMMIT_MESSAGE  Optional. Commit message. Supports {issue}.

Examples:
  AI_AGENT_COMMAND='codex exec --ask-for-approval never --sandbox workspace-write - < {prompt}' scripts/ai/run-next-ai-task.sh
  AI_AGENT_COMMAND='my-agent {prompt}' AI_VERIFY_COMMAND='cd frontend && npm test' scripts/ai/run-next-ai-task.sh --issue 12

What it does:
  - Selects one open issue labeled ai-task and ai-ready.
  - Skips issues labeled ai-in-progress, blocked, or needs-review.
  - Prepares the issue branch and prompt.
  - Runs the configured AI agent command.
  - Refuses unsafe generated/secret paths.
  - Runs optional verification.
  - Commits changes if the agent did not commit them.
  - Creates a Pull Request with scripts/ai/create-ai-pr.sh.
USAGE
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

shell_quote() {
  printf '%q' "$1"
}

build_command() {
  local template="$1"
  local prompt_file="$2"
  local issue_number="$3"
  local prompt_quoted

  prompt_quoted="$(shell_quote "$prompt_file")"
  template="${template//\{issue\}/$issue_number}"

  if [[ "$template" == *"{prompt}"* ]]; then
    template="${template//\{prompt\}/$prompt_quoted}"
  else
    template="${template} ${prompt_quoted}"
  fi

  printf '%s' "$template"
}

ready_filter() {
  cat <<'JQ'
[
  .[]
  | select(([.labels[].name] | index("ai-in-progress") | not))
  | select(([.labels[].name] | index("blocked") | not))
  | select(([.labels[].name] | index("needs-review") | not))
]
JQ
}

select_issue() {
  local limit="$1"
  local filter

  filter="$(ready_filter)"
  gh issue list \
    --state open \
    --label ai-task \
    --label ai-ready \
    --limit "$limit" \
    --json number,title,labels,updatedAt \
    --jq "${filter} | sort_by(.updatedAt) | .[0].number // empty"
}

validate_issue_ready() {
  local issue_number="$1"
  local labels state

  state="$(gh issue view "$issue_number" --json state --jq '.state')" || die "Unable to read issue #$issue_number."
  [[ "$state" == "OPEN" ]] || die "Issue #$issue_number is not open. Current state: $state"

  labels="$(gh issue view "$issue_number" --json labels --jq '[.labels[].name] | join(",")')"

  case ",${labels}," in
    *,ai-task,*) ;;
    *) die "Issue #$issue_number must have label ai-task." ;;
  esac

  case ",${labels}," in
    *,ai-ready,*) ;;
    *) die "Issue #$issue_number must have label ai-ready." ;;
  esac

  case ",${labels}," in
    *,ai-in-progress,*|*,blocked,*|*,needs-review,*)
      die "Issue #$issue_number is not startable. Current labels: ${labels:-none}"
      ;;
  esac
}

unsafe_changes() {
  git status --porcelain | awk '
    {
      path = $0
      sub(/^.../, "", path)
      if (path ~ /^frontend\/dist\//) print path
      if (path ~ /^backend_blueprint\//) print path
      if (path ~ /^backend_custom\//) print path
      if (path ~ /(^|\/)\.env($|\.)/) print path
      if (path ~ /(^|\/)(id_rsa|id_ed25519|\.npmrc|\.pypirc)$/) print path
    }
  '
}

clean_generated_outputs() {
  local path

  # Vite rewrites tracked frontend/dist assets during build. Keep build as a
  # verification step, but do not let generated output enter AI task commits.
  git restore frontend/dist >/dev/null 2>&1 || true

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    rm -f "$path"
  done < <(git status --porcelain frontend/dist | awk '$1 == "??" {print $2}')
}

LIMIT=20
DRY_RUN=0
ALLOW_EMPTY=0
ISSUE_NUMBER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue)
      shift
      [[ "${1:-}" =~ ^[0-9]+$ ]] || die "--issue requires a numeric value."
      ISSUE_NUMBER="$1"
      ;;
    --limit)
      shift
      [[ "${1:-}" =~ ^[0-9]+$ ]] || die "--limit requires a numeric value."
      LIMIT="$1"
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    --allow-empty)
      ALLOW_EMPTY=1
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

DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)"
[[ -n "$DEFAULT_BRANCH" ]] || DEFAULT_BRANCH="main"

CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$DEFAULT_BRANCH" ]] || die "Run full automation from ${DEFAULT_BRANCH}. Current branch is ${CURRENT_BRANCH}."

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Worktree is not clean. Commit, stash, or discard local changes before running automation."
fi

if [[ -z "$ISSUE_NUMBER" ]]; then
  ISSUE_NUMBER="$(select_issue "$LIMIT")"
fi

if [[ -z "$ISSUE_NUMBER" ]]; then
  if [[ "$ALLOW_EMPTY" == "1" ]]; then
    echo "No ready AI tasks found."
    exit 0
  fi

  die "No ready AI tasks found."
fi
validate_issue_ready "$ISSUE_NUMBER"

TITLE="$(gh issue view "$ISSUE_NUMBER" --json title --jq '.title')"
PROMPT_FILE=".ai/runs/${ISSUE_NUMBER}/prompt.md"
AGENT_COMMAND="not configured"
VERIFY_COMMAND=""

if [[ -n "${AI_AGENT_COMMAND:-}" ]]; then
  AGENT_COMMAND="$(build_command "$AI_AGENT_COMMAND" "$PROMPT_FILE" "$ISSUE_NUMBER")"
elif [[ "$DRY_RUN" != "1" ]]; then
  die "AI_AGENT_COMMAND is required. Run with --dry-run to inspect the selected issue."
fi

if [[ -n "${AI_VERIFY_COMMAND:-}" ]]; then
  VERIFY_COMMAND="$(build_command "$AI_VERIFY_COMMAND" "$PROMPT_FILE" "$ISSUE_NUMBER")"
fi

cat <<PLAN
Full automation plan

Issue:
  #${ISSUE_NUMBER} ${TITLE}

Agent command:
  ${AGENT_COMMAND}

Verification command:
  ${VERIFY_COMMAND:-none}
PLAN

if [[ "$DRY_RUN" == "1" ]]; then
  exit 0
fi

scripts/ai/prepare-ai-task.sh "$ISSUE_NUMBER"

if [[ ! -f "$PROMPT_FILE" ]]; then
  gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
  die "Prompt file was not created: $PROMPT_FILE"
fi

set +e
bash -lc "$AGENT_COMMAND"
AGENT_STATUS=$?
set -e

if [[ "$AGENT_STATUS" -ne 0 ]]; then
  gh issue comment "$ISSUE_NUMBER" --body "Full automation stopped: AI agent command failed with exit code ${AGENT_STATUS}."
  gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
  gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true
  die "AI agent command failed with exit code ${AGENT_STATUS}."
fi

BAD_PATHS="$(unsafe_changes)"
if [[ -n "$BAD_PATHS" ]]; then
  gh issue comment "$ISSUE_NUMBER" --body "Full automation stopped: unsafe changed paths detected.\n\n${BAD_PATHS}"
  gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
  gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true
  die "Unsafe changed paths detected:
${BAD_PATHS}"
fi

if [[ -n "$VERIFY_COMMAND" ]]; then
  set +e
  bash -lc "$VERIFY_COMMAND"
  VERIFY_STATUS=$?
  set -e

  if [[ "$VERIFY_STATUS" -ne 0 ]]; then
    gh issue comment "$ISSUE_NUMBER" --body "Full automation stopped: verification command failed with exit code ${VERIFY_STATUS}."
    gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
    gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true
    die "Verification command failed with exit code ${VERIFY_STATUS}."
  fi
fi

clean_generated_outputs

BAD_PATHS="$(unsafe_changes)"
if [[ -n "$BAD_PATHS" ]]; then
  gh issue comment "$ISSUE_NUMBER" --body "Full automation stopped: unsafe changed paths detected after verification.\n\n${BAD_PATHS}"
  gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
  gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true
  die "Unsafe changed paths detected after verification:
${BAD_PATHS}"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git add .
  COMMIT_MESSAGE="${AI_COMMIT_MESSAGE:-chore: implement issue #{issue}}"
  COMMIT_MESSAGE="${COMMIT_MESSAGE//\{issue\}/$ISSUE_NUMBER}"
  git commit -m "$COMMIT_MESSAGE"
fi

if [[ "$(git rev-list --count "origin/${DEFAULT_BRANCH}..HEAD")" == "0" ]]; then
  gh issue comment "$ISSUE_NUMBER" --body "Full automation stopped: agent completed but produced no commits."
  gh issue edit "$ISSUE_NUMBER" --add-label blocked >/dev/null
  gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true
  die "Agent completed but produced no commits."
fi

scripts/ai/create-ai-pr.sh "$ISSUE_NUMBER"
