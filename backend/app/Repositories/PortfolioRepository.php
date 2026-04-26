<?php

namespace App\Repositories;

use App\Models\Portfolio;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PortfolioRepository
{
    public function hasAnyForUser(int $userId): bool
    {
        return Portfolio::query()
            ->where('user_id', $userId)
            ->exists();
    }

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

    public function save(Portfolio $portfolio): Portfolio
    {
        $portfolio->save();

        return $portfolio;
    }

    public function findOwned(int $userId, int $portfolioId): ?Portfolio
    {
        return Portfolio::query()
            ->where('user_id', $userId)
            ->where('id', $portfolioId)
            ->first();
    }

    public function findPublicByShareToken(string $shareToken): ?Portfolio
    {
        return Portfolio::query()
            ->where('share_token', $shareToken)
            ->where('is_public', true)
            ->first();
    }

    public function listPublic(): Collection
    {
        return Portfolio::query()
            ->from('portfolios')
            ->join('users', 'users.id', '=', 'portfolios.user_id')
            ->where('portfolios.is_public', true)
            ->whereNotNull('portfolios.share_token')
            ->orderByDesc('portfolios.updated_at')
            ->get([
                'portfolios.id',
                'portfolios.name',
                'portfolios.currency',
                'portfolios.share_token',
                'portfolios.updated_at',
                DB::raw('users.name as owner_name'),
            ]);
    }

    public function findByShareToken(string $shareToken): ?Portfolio
    {
        return Portfolio::query()
            ->where('share_token', $shareToken)
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
