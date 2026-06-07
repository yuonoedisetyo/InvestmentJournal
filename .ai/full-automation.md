# Full Automation

Full automation lets the home laptop pick one ready GitHub Issue, run Codex,
verify the result, commit, and create a Pull Request.

## Required Labels

The runner only starts issues with both labels:

- `ai-task`
- `ai-ready`

It skips issues with any of these labels:

- `ai-in-progress`
- `blocked`
- `needs-review`

## Local Setup

Create the ignored local env file:

```bash
cp .ai/local.env.example .ai/local.env
```

Edit `.ai/local.env` if needed. The default agent command is:

```bash
codex exec --ask-for-approval never --sandbox workspace-write - < {prompt}
```

## Manual Full Runner

Inspect the next task without changing anything:

```bash
scripts/ai/run-next-ai-task.sh --dry-run --allow-empty
```

Run one task:

```bash
scripts/ai/auto-run-next-ai-task.sh
```

## macOS Scheduler

Install LaunchAgent:

```bash
scripts/ai/install-launch-agent.sh
```

Check logs:

```bash
tail -f .ai/runs/auto-runner.out.log
tail -f .ai/runs/auto-runner.err.log
```

Uninstall LaunchAgent:

```bash
scripts/ai/uninstall-launch-agent.sh
```

## Safety Notes

- The scheduler skips work if the git worktree is dirty.
- The runner refuses unsafe changed paths such as `frontend/dist`, `.env`,
  `backend_blueprint`, and `backend_custom`.
- The runner marks an issue `blocked` if the agent or verification command fails.
- Keep `ai-ready` as the final approval label from HP.
