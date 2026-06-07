# Architecture

Project: Investment Journal

## Active Stack

Backend:
- Laravel 10
- PHP 8.1
- MySQL 8
- API token auth
- Pattern: Controller -> Service -> Repository

Frontend:
- React 18
- Vite
- Vitest

Mobile:
- React Native
- Expo
- Jest

Local infrastructure:
- Docker Compose for Laravel API and MySQL
- MySQL host port: 3307
- Laravel API: http://localhost:8000
- Web frontend: http://localhost:5173

## Important Folders

- `backend/`: active Laravel API.
- `frontend/`: active React web app.
- `mobile/`: active React Native app.
- `docs/`: API, ERD, business rules, and folder structure docs.
- `planning/`: implementation planning docs.

## Routine No-Touch Areas

Do not edit these for normal AI tasks unless the issue explicitly asks for them:

- `backend_blueprint/`
- `backend_custom/`
- `frontend/dist/`
- `.env` files
- credentials, tokens, secrets, database dumps, or hosting credentials

## Backend Rules

- Keep the `Controller -> Service -> Repository` structure.
- Put business rules in Services.
- Put database queries in Repositories.
- Use migrations for schema changes.
- Keep the app shared-hosting friendly: do not introduce Redis, queue workers, or long-running worker requirements without a dedicated issue.
- All financial values must use MySQL `DECIMAL` and PHP BCMath-compatible handling, not floats.

## Financial Business Rules

- Lot size is fixed at 100 shares.
- BUY updates weighted average position.
- SELL must not exceed available shares.
- SELL realized PnL is based on sell net minus cost basis.
- When position shares become zero, average price and invested amount become zero.
- Manual dividends create both a dividend record and a cash mutation.
- Price sync is selective for active portfolio holdings with positive shares.

## Workflow Rules

- Work from a branch, never directly on `main` or `master`.
- Use branch format `ai/<issue-number>-<slug>` for AI tasks.
- Make Pull Requests for review.
- Run tests/builds according to the touched scope before PR.
- If tests cannot be run, explain the reason in the PR.
