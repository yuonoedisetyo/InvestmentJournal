<?php

namespace App\Repositories;

use App\Models\CashMutation;
use App\Models\StockTransaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PerformanceRepository
{
    public function earliestStockTransactionDate(int $userId, int $portfolioId): ?string
    {
        $value = StockTransaction::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->orderBy('transaction_date')
            ->value('transaction_date');

        return $value ? (string) $value : null;
    }

    public function earliestCashMutationDate(int $userId, int $portfolioId): ?string
    {
        $value = CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->orderBy('created_at')
            ->value('created_at');

        return $value ? (string) $value : null;
    }

    public function stockTransactionsInRange(int $userId, int $portfolioId, string $startDate, string $endDate): Collection
    {
        return StockTransaction::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get(['id', 'transaction_date', 'stock_code', 'type', 'lot', 'price', 'net_amount']);
    }

    public function stockTransactionsUpToDate(int $userId, int $portfolioId, string $endDate): Collection
    {
        return StockTransaction::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereDate('transaction_date', '<=', $endDate)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get(['transaction_date', 'stock_code', 'type', 'lot', 'price', 'net_amount']);
    }

    public function cashMutationsInRange(int $userId, int $portfolioId, string $startDate, string $endDate): Collection
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'created_at', 'type', 'amount', 'reference_id']);
    }

    public function cashMutationsUpToDate(int $userId, int $portfolioId, string $endDate): Collection
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereDate('created_at', '<=', $endDate)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['created_at', 'type', 'amount', 'reference_id']);
    }

    public function stockPriceSeries(array $stockCodes, string $startDate, string $endDate): Collection
    {
        if (empty($stockCodes)) {
            return collect();
        }

        return DB::table('stock_prices')
            ->whereIn('stock_code', $stockCodes)
            ->whereBetween('price_date', [$startDate, $endDate])
            ->orderBy('price_date')
            ->orderBy('stock_code')
            ->get(['price_date', 'stock_code', 'price']);
    }

    public function latestStockPricesBeforeDate(array $stockCodes, string $date): Collection
    {
        if (empty($stockCodes)) {
            return collect();
        }

        return DB::table('stock_prices as sp')
            ->join(DB::raw('(
                SELECT stock_code, MAX(price_date) as max_price_date
                FROM stock_prices
                WHERE price_date < "'.$date.'"
                GROUP BY stock_code
            ) latest'), function ($join): void {
                $join->on('sp.stock_code', '=', 'latest.stock_code')
                    ->on('sp.price_date', '=', 'latest.max_price_date');
            })
            ->whereIn('sp.stock_code', $stockCodes)
            ->get(['sp.price_date', 'sp.stock_code', 'sp.price']);
    }

    public function ihsgPriceSeries(string $startDate, string $endDate): Collection
    {
        return DB::table('ihsg_prices')
            ->whereBetween('price_date', [$startDate, $endDate])
            ->orderBy('price_date')
            ->get(['price_date', 'close']);
    }

    public function latestIhsgPriceBeforeDate(string $date): ?object
    {
        return DB::table('ihsg_prices')
            ->where('price_date', '<', $date)
            ->orderByDesc('price_date')
            ->first(['price_date', 'close']);
    }
}
