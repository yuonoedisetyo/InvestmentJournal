<?php

namespace App\Repositories;

use App\Models\StockTransaction;
use Illuminate\Support\Collection;

class TransactionRepository
{
    public function listByUser(int $userId, ?int $portfolioId = null, int $limit = 200): Collection
    {
        return StockTransaction::query()
            ->where('user_id', $userId)
            ->when($portfolioId, fn ($query) => $query->where('portfolio_id', $portfolioId))
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function create(array $payload): StockTransaction
    {
        return StockTransaction::query()->create($payload);
    }

    public function findOwned(int $userId, int $transactionId): ?StockTransaction
    {
        return StockTransaction::query()
            ->where('user_id', $userId)
            ->where('id', $transactionId)
            ->first();
    }

    public function listByPortfolioAndStock(int $portfolioId, string $stockCode): Collection
    {
        return StockTransaction::query()
            ->where('portfolio_id', $portfolioId)
            ->where('stock_code', $stockCode)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();
    }

    public function save(StockTransaction $transaction): StockTransaction
    {
        $transaction->save();
        return $transaction;
    }

    public function delete(StockTransaction $transaction): void
    {
        $transaction->delete();
    }
}
