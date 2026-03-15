# API

Base: `/api` (auth via Sanctum or equivalent)

## Portfolio

### `GET /portfolios`
List user portfolios.

### `POST /portfolios`
Create portfolio.

Request:
```json
{
  "name": "Retirement",
  "currency": "IDR",
  "initial_capital": "10000000.0000",
  "is_active": true
}
```

### `PATCH /portfolios/{id}/activate`
Set active portfolio for current user.

## Transactions

### `POST /transactions/buy`
Register buy and update weighted-average position.

Request:
```json
{
  "portfolio_id": 1,
  "stock_code": "BBCA",
  "lot": 2,
  "price": "9325.0000",
  "fee": "1500.0000",
  "transaction_date": "2026-02-28",
  "notes": "Accumulation"
}
```

### `POST /transactions/sell`
Register sell and compute realized PnL.

## Dividends

### `POST /dividends/manual`
Manual dividend input. Also creates `cash_mutations` record with type `DIVIDEND`.

Request:
```json
{
  "portfolio_id": 1,
  "stock_code": "BBCA",
  "amount": "500000.0000",
  "pay_date": "2026-02-28",
  "ex_date": "2026-02-20",
  "notes": "Final dividend"
}
```

## Price Sync

### `POST /prices/sync-active`
Sync latest prices only for stocks currently held (`total_shares > 0`) in active portfolios.

Server reads `PRICE_SYNC_ENDPOINT` and expects:
```json
{
  "data": [
    {
      "stock_code": "BBCA",
      "price": "9325.0000",
      "price_date": "2026-02-28",
      "source": "CUSTOM_API"
    }
  ]
}
```
