# AI Task Template

Use this template when creating a GitHub Issue from HP or desktop.

## Title

[AI Task] <short task title>

## Context

- Project: Investment Journal
- Area: backend / frontend / mobile / docs
- Related files:
- Related docs:
- Current behavior:

## Goal

Describe the final user-visible or developer-visible outcome.

## Scope

- Item that may be changed.
- Item that may be added.
- Tests or docs expected for this task.

## Out of Scope

- Item that must not be changed.
- Related ideas that should wait for a separate issue.

## Acceptance Criteria

- The expected behavior is clear and checkable.
- Mention endpoint, page, command, data state, or UI behavior when relevant.
- Mention test expectations when relevant.

## Verification

- Backend:
- Frontend:
- Frontend build:
- Mobile:
- Manual test:

## Constraints

- Do not commit directly to `main` or `master`.
- Create a branch with format `ai/<issue-number>-<slug>`.
- Create a Pull Request for review.
- Do not commit `.env`, credentials, tokens, secrets, or local database dumps.
- Do not edit `backend_blueprint/`, `backend_custom/`, or `frontend/dist/` unless explicitly requested.

## Risk Notes

- Financial logic risk:
- Database migration risk:
- Backward compatibility risk:
- Manual review focus:
