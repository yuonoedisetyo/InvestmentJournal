<?php

namespace App\Repositories;

use App\Models\Dividend;
use Illuminate\Support\Collection;

class DividendRepository
{
    public function create(array $payload): Dividend
    {
        return Dividend::query()->create($payload);
    }

    public function listByUser(int $userId, ?int $portfolioId = null, int $limit = 200): Collection
    {
        return Dividend::query()
            ->where('user_id', $userId)
            ->when($portfolioId, fn ($query) => $query->where('portfolio_id', $portfolioId))
            ->orderByDesc('pay_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function findOwned(int $userId, int $dividendId): ?Dividend
    {
        return Dividend::query()
            ->where('user_id', $userId)
            ->where('id', $dividendId)
            ->first();
    }

    public function save(Dividend $dividend): Dividend
    {
        $dividend->save();
        return $dividend;
    }

    public function delete(Dividend $dividend): void
    {
        $dividend->delete();
    }
}
