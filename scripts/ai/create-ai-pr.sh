#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ai/create-ai-pr.sh <issue-number>

What it does:
  - Refuses to run from main or master.
  - Refuses to run with uncommitted local changes.
  - Refuses to run if the current branch has no commits over the default branch.
  - Pushes the current branch.
  - Creates a Pull Request linked to the issue.
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

CURRENT_BRANCH="$(git branch --show-current)"
[[ -n "$CURRENT_BRANCH" ]] || die "Detached HEAD is not supported."

case "$CURRENT_BRANCH" in
  main|master)
    die "Refusing to create an AI PR from ${CURRENT_BRANCH}."
    ;;
esac

echo "Current branch: ${CURRENT_BRANCH}"
echo
git status --short
echo

if [[ -n "$(git status --porcelain)" ]]; then
  die "Worktree has uncommitted changes. Commit them before creating a PR."
fi

DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)"
[[ -n "$DEFAULT_BRANCH" ]] || DEFAULT_BRANCH="main"

BASE_REF="origin/${DEFAULT_BRANCH}"

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  die "Cannot find ${BASE_REF}. Fetch from origin before creating the PR."
fi

COMMIT_COUNT="$(git rev-list --count "${BASE_REF}..HEAD")"

if [[ "$COMMIT_COUNT" == "0" ]]; then
  die "Current branch has no commits over ${BASE_REF}."
fi

ISSUE_TITLE="$(gh issue view "$ISSUE_NUMBER" --json title --jq '.title')" || die "Unable to read issue #$ISSUE_NUMBER."
PR_TITLE="${ISSUE_TITLE#\[AI Task\] }"
[[ -n "$PR_TITLE" ]] || PR_TITLE="$ISSUE_TITLE"

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

cat > "$BODY_FILE" <<BODY
## Summary

- Implements GitHub issue #${ISSUE_NUMBER}.

## Scope

- See linked issue for scope and acceptance criteria.

## Verification

- [ ] Backend tests
- [ ] Frontend tests
- [ ] Frontend build
- [ ] Mobile tests
- [ ] Manual test

## Risk Notes

- Review the linked issue risk notes and changed files.

## Linked Issue

Closes #${ISSUE_NUMBER}

## AI Workflow Checklist

- [x] Branch is not \`main\` or \`master\`
- [x] Scope matches the linked issue
- [ ] No \`.env\`, credential, token, secret, or local database dump is committed
- [ ] \`backend_blueprint/\`, \`backend_custom/\`, and \`frontend/dist/\` are untouched unless explicitly requested
BODY

git push -u origin "$CURRENT_BRANCH"

PR_URL="$(gh pr create --title "$PR_TITLE" --body-file "$BODY_FILE" --base "$DEFAULT_BRANCH" --head "$CURRENT_BRANCH")"

gh issue comment "$ISSUE_NUMBER" --body "Pull Request is ready for review: ${PR_URL}"
gh issue edit "$ISSUE_NUMBER" --add-label needs-review >/dev/null
gh issue edit "$ISSUE_NUMBER" --remove-label ai-in-progress >/dev/null 2>&1 || true

cat <<DONE
Created Pull Request for issue #${ISSUE_NUMBER}

PR:
  ${PR_URL}

Base:
  ${DEFAULT_BRANCH}

Head:
  ${CURRENT_BRANCH}
DONE
