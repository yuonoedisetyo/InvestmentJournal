# Business Rules

1. A user can own multiple portfolios.
2. Portfolio activation is user-scoped: activating one portfolio deactivates other user portfolios.
3. Lot size is fixed at 100 shares.
4. `BUY` updates position using weighted average:
   - `new_avg = (old_invested + buy_net) / (old_shares + buy_shares)`
5. `SELL` must not exceed available shares.
6. `SELL` realized PnL:
   - `realized = sell_net - (avg_price * sold_shares)`
7. When position shares become zero:
   - `average_price = 0`
   - `invested_amount = 0`
8. Dividends are manual input and recorded as:
   - `dividends` entry
   - `cash_mutations` entry (`type=DIVIDEND`)
9. All financial fields use MySQL `DECIMAL` and BCMath in PHP.
10. Price sync is selective:
    - only stocks from active portfolios
    - only positions with `total_shares > 0`
11. System is shared-hosting compatible:
    - no Redis
    - no queue workers required
    - cron/scheduler driven sync
