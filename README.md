# Investment Journal Backend (Laravel + MySQL)

Backend blueprint for an investment journal with:

- Multi-portfolio per user
- Buy/Sell engine using weighted average price
- Manual dividend input
- Selective stock price sync (active portfolio holdings only)
- Shared-hosting friendly operation (no Redis, no queue)
- Financial precision with `DECIMAL` + BCMath (no float)
- Clean architecture (`Controller -> Service -> Repository`)

## Structure

- `backend/app/Http/Controllers` API controllers
- `backend/app/Services` business logic
- `backend/app/Repositories` data access
- `backend/database/migrations` schema
- `backend/app/Console/Commands/SyncActivePortfolioPrices.php` sync command

## Core APIs (`routes/api.php`)

- `GET /api/portfolios`
- `POST /api/portfolios`
- `PATCH /api/portfolios/{id}/activate`
- `POST /api/transactions/buy`
- `POST /api/transactions/sell`
- `POST /api/dividends/manual`
- `POST /api/prices/sync-active`

## Weighted Average Engine

- Buy:
  - `shares = lot * 100`
  - `gross = shares * price`
  - `net = gross + fee`
  - `new_invested = old_invested + net`
  - `new_avg = new_invested / new_total_shares`
- Sell:
  - `gross = shares * price`
  - `net = gross - fee`
  - `cost_basis = avg_price * sold_shares`
  - `realized_pnl = net - cost_basis`
  - Update position shares, invested amount, and realized pnl

## Shared Hosting Cron

No queue workers needed.

1. Configure provider in `.env`:

```bash
PRICE_PROVIDER=alpha_vantage
ALPHA_VANTAGE_API_KEY=your_api_key
ALPHA_VANTAGE_SYMBOL_SUFFIX=.JK
ALPHA_VANTAGE_REQUEST_INTERVAL_MS=12000
```

Optional legacy custom endpoint:

```bash
PRICE_PROVIDER=custom_endpoint
PRICE_SYNC_ENDPOINT=https://your-service/prices
```

2. Call command from cron:

```bash
php artisan prices:sync-active 1
```

or use scheduler:

```bash
*/10 * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

## Notes

- Use MySQL `DECIMAL` columns for all money/price values.
- Ensure PHP BCMath extension is enabled.
- Use Sanctum or your preferred auth to supply `request()->user()`.
