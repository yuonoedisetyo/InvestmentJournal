<?php

namespace App\Services;

use App\Models\Portfolio;
use App\Repositories\PortfolioRepository;
use Illuminate\Support\Facades\DB;

class PortfolioService
{
    public function __construct(private readonly PortfolioRepository $portfolioRepository)
    {
    }

    public function listByUser(int $userId)
    {
        return $this->portfolioRepository->listByUser($userId);
    }

    public function create(int $userId, array $payload): Portfolio
    {
        return $this->portfolioRepository->create([
            'user_id' => $userId,
            'name' => $payload['name'],
            'currency' => $payload['currency'] ?? 'IDR',
            'initial_capital' => $payload['initial_capital'] ?? '0.0000',
            'is_active' => (bool) ($payload['is_active'] ?? false),
        ]);
    }

    public function activatePortfolio(int $userId, int $portfolioId): void
    {
        DB::transaction(function () use ($userId, $portfolioId): void {
            $portfolio = $this->portfolioRepository->findOwned($userId, $portfolioId);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $this->portfolioRepository->deactivateAllForUser($userId);
            $this->portfolioRepository->activate($portfolioId);
        });
    }
}
