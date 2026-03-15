<?php

namespace App\Repositories;

use App\Models\Portfolio;
use Illuminate\Support\Collection;

class PortfolioRepository
{
    public function listByUser(int $userId): Collection
    {
        return Portfolio::query()
            ->where('user_id', $userId)
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();
    }

    public function create(array $payload): Portfolio
    {
        return Portfolio::query()->create($payload);
    }

    public function findOwned(int $userId, int $portfolioId): ?Portfolio
    {
        return Portfolio::query()
            ->where('user_id', $userId)
            ->where('id', $portfolioId)
            ->first();
    }

    public function deactivateAllForUser(int $userId): void
    {
        Portfolio::query()
            ->where('user_id', $userId)
            ->update(['is_active' => false]);
    }

    public function activate(int $portfolioId): void
    {
        Portfolio::query()->where('id', $portfolioId)->update(['is_active' => true]);
    }

    public function activeHoldingStockCodesForUser(int $userId): array
    {
        return Portfolio::query()
            ->from('portfolios as p')
            ->join('portfolio_positions as pp', 'pp.portfolio_id', '=', 'p.id')
            ->where('p.user_id', $userId)
            ->where('p.is_active', true)
            ->where('pp.total_shares', '>', 0)
            ->distinct()
            ->pluck('pp.stock_code')
            ->all();
    }
}
