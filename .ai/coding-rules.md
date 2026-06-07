# Coding Rules

## General

- Work only on the scope described in the issue.
- Prefer existing project patterns over new abstractions.
- Do not refactor unrelated files.
- Do not change public API behavior unless the acceptance criteria says so.
- Do not add a dependency unless it is clearly needed and explained in the PR.
- Do not commit generated output, local environment files, credentials, or secrets.
- Do not edit `backend_blueprint/`, `backend_custom/`, or `frontend/dist/` for routine tasks.

## Backend

- Follow `Controller -> Service -> Repository`.
- Controllers validate and shape HTTP requests/responses.
- Services contain business logic and transaction orchestration.
- Repositories contain database access.
- Use Laravel migrations for every database schema change.
- Add or update Feature Tests for API changes.
- Add or update tests for financial logic changes.
- Use `DECIMAL` and BCMath-compatible operations for money, shares, average price, PnL, dividends, and cash mutations.
- Do not use PHP floats for financial calculations.
- Keep shared-hosting compatibility in mind: no required Redis, queue workers, or external daemons without a dedicated issue.

## Frontend

- Follow the current module structure under `frontend/src/modules`.
- Keep reusable calculation logic in `frontend/src/utils` when practical.
- Add or update Vitest and Testing Library tests for important behavior.
- Keep API calls centralized in `frontend/src/services/api.js` unless the existing structure changes intentionally.
- Do not edit `frontend/dist`.

## Mobile

- Touch `mobile/` only when the issue explicitly includes mobile scope.
- Keep API behavior aligned with the Laravel backend.
- Add or update Jest tests when behavior changes.

## Documentation

- Update `docs/API.md` when API contracts change.
- Update `docs/BUSINESS_RULES.md` only when business rules intentionally change.
- Add planning notes in `planning/` for broad or risky work.

## Verification Commands

Backend:

```bash
docker compose exec app php artisan test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

Mobile:

```bash
cd mobile
npm test
```

Use only the commands relevant to the changed scope. If a command cannot be run locally, record the reason in the PR.
