<?php

namespace App\Repositories;

use App\Models\PortfolioPosition;

class PositionRepository
{
    public function lockByPortfolioAndStock(int $portfolioId, string $stockCode): ?PortfolioPosition
    {
        return PortfolioPosition::query()
            ->where('portfolio_id', $portfolioId)
            ->where('stock_code', $stockCode)
            ->lockForUpdate()
            ->first();
    }

    public function create(array $payload): PortfolioPosition
    {
        return PortfolioPosition::query()->create($payload);
    }

    public function save(PortfolioPosition $position): PortfolioPosition
    {
        $position->save();
        return $position;
    }
}
