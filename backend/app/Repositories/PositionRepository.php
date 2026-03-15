<?php

namespace App\Repositories;

use App\Models\PortfolioPosition;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PositionRepository
{
    public function listWithLatestPriceByPortfolio(int $portfolioId): Collection
    {
        $latestPriceDate = DB::table('stock_prices')
            ->select('stock_code', DB::raw('MAX(price_date) as max_price_date'))
            ->groupBy('stock_code');

        return DB::table('portfolio_positions as pp')
            ->leftJoinSub($latestPriceDate, 'lp', function ($join): void {
                $join->on('lp.stock_code', '=', 'pp.stock_code');
            })
            ->leftJoin('stock_prices as sp', function ($join): void {
                $join->on('sp.stock_code', '=', 'pp.stock_code')
                    ->on('sp.price_date', '=', 'lp.max_price_date');
            })
            ->where('pp.portfolio_id', $portfolioId)
            ->orderBy('pp.stock_code')
            ->selectRaw(
                'pp.stock_code,
                pp.total_shares,
                pp.average_price,
                pp.invested_amount,
                pp.realized_pnl,
                COALESCE(sp.price, pp.average_price) as last_price,
                (pp.total_shares * COALESCE(sp.price, pp.average_price)) as market_value,
                ((pp.total_shares * COALESCE(sp.price, pp.average_price)) - pp.invested_amount) as unrealized_pnl'
            )
            ->get();
    }

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
