<?php

namespace App\Repositories;

use App\Models\CashMutation;
use App\Models\StockTransaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PerformanceRepository
{
    public function stockTransactionsInRange(int $userId, int $portfolioId, string $startDate, string $endDate): Collection
    {
        return StockTransaction::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereBetween('transaction_date', [$startDate, $endDate])
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
            ->get(['created_at', 'type', 'amount']);
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
}
