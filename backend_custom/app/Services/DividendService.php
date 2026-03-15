<?php

namespace App\Services;

use App\Models\CashMutation;
use App\Repositories\CashMutationRepository;
use App\Repositories\DividendRepository;
use App\Repositories\PortfolioRepository;
use App\Repositories\PositionRepository;
use App\Support\DecimalMath;
use Illuminate\Support\Facades\DB;

class DividendService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly DividendRepository $dividendRepository,
        private readonly CashMutationRepository $cashMutationRepository,
        private readonly PositionRepository $positionRepository,
    ) {
    }

    public function createManualDividend(int $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload): array {
            $portfolio = $this->portfolioRepository->findOwned($userId, (int) $payload['portfolio_id']);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $stockCode = strtoupper($payload['stock_code']);
            $amount = (string) $payload['amount'];

            $dividend = $this->dividendRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'stock_code' => $stockCode,
                'amount' => $amount,
                'ex_date' => $payload['ex_date'] ?? null,
                'pay_date' => $payload['pay_date'],
                'notes' => $payload['notes'] ?? null,
            ]);

            $this->cashMutationRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'type' => CashMutation::TYPE_DIVIDEND,
                'amount' => $amount,
                'reference_id' => $dividend->id,
                'description' => 'Manual dividend for '.$stockCode,
                'created_at' => $payload['pay_date'],
            ]);

            $position = $this->positionRepository->lockByPortfolioAndStock((int) $payload['portfolio_id'], $stockCode);
            if ($position) {
                $position->dividend_income = DecimalMath::add((string) $position->dividend_income, $amount, 4);
                $this->positionRepository->save($position);
            }

            return [
                'dividend_id' => $dividend->id,
            ];
        });
    }
}
