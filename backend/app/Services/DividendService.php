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

    public function updateManualDividend(int $userId, int $dividendId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $dividendId, $payload): array {
            $dividend = $this->dividendRepository->findOwned($userId, $dividendId);
            if (! $dividend) {
                abort(404, 'Dividend not found.');
            }

            $oldStockCode = (string) $dividend->stock_code;
            $oldAmount = (string) $dividend->amount;
            $portfolioId = (int) $dividend->portfolio_id;

            if (isset($payload['stock_code'])) {
                $dividend->stock_code = strtoupper((string) $payload['stock_code']);
            }
            if (isset($payload['amount'])) {
                $dividend->amount = (string) $payload['amount'];
            }
            if (isset($payload['pay_date'])) {
                $dividend->pay_date = $payload['pay_date'];
            }
            if (array_key_exists('ex_date', $payload)) {
                $dividend->ex_date = $payload['ex_date'];
            }
            if (array_key_exists('notes', $payload)) {
                $dividend->notes = $payload['notes'];
            }
            $this->dividendRepository->save($dividend);

            $mutation = $this->cashMutationRepository->findLinkedDividendMutation($userId, $portfolioId, $dividend->id);
            if ($mutation) {
                $mutation->amount = (string) $dividend->amount;
                $mutation->description = 'Manual dividend for '.strtoupper((string) $dividend->stock_code);
                $mutation->created_at = $dividend->pay_date;
                $this->cashMutationRepository->save($mutation);
            }

            $newStockCode = (string) $dividend->stock_code;
            $newAmount = (string) $dividend->amount;
            $this->adjustPositionDividendIncome($portfolioId, $oldStockCode, $oldAmount, $newStockCode, $newAmount);

            return ['dividend_id' => $dividend->id];
        });
    }

    public function deleteManualDividend(int $userId, int $dividendId): array
    {
        return DB::transaction(function () use ($userId, $dividendId): array {
            $dividend = $this->dividendRepository->findOwned($userId, $dividendId);
            if (! $dividend) {
                abort(404, 'Dividend not found.');
            }

            $portfolioId = (int) $dividend->portfolio_id;
            $stockCode = (string) $dividend->stock_code;
            $amount = (string) $dividend->amount;

            $mutation = $this->cashMutationRepository->findLinkedDividendMutation($userId, $portfolioId, $dividend->id);
            if ($mutation) {
                $this->cashMutationRepository->delete($mutation);
            }

            $this->dividendRepository->delete($dividend);

            $position = $this->positionRepository->lockByPortfolioAndStock($portfolioId, $stockCode);
            if ($position) {
                $newIncome = DecimalMath::sub((string) $position->dividend_income, $amount, 4);
                if (DecimalMath::cmp($newIncome, '0', 4) < 0) {
                    $newIncome = '0.0000';
                }
                $position->dividend_income = $newIncome;
                $this->positionRepository->save($position);
            }

            return ['deleted' => true];
        });
    }

    private function adjustPositionDividendIncome(
        int $portfolioId,
        string $oldStockCode,
        string $oldAmount,
        string $newStockCode,
        string $newAmount
    ): void {
        $oldCode = strtoupper($oldStockCode);
        $newCode = strtoupper($newStockCode);

        if ($oldCode === $newCode) {
            $position = $this->positionRepository->lockByPortfolioAndStock($portfolioId, $newCode);
            if (! $position) {
                return;
            }
            $adjusted = DecimalMath::sub((string) $position->dividend_income, $oldAmount, 4);
            $adjusted = DecimalMath::add($adjusted, $newAmount, 4);
            if (DecimalMath::cmp($adjusted, '0', 4) < 0) {
                $adjusted = '0.0000';
            }
            $position->dividend_income = $adjusted;
            $this->positionRepository->save($position);
            return;
        }

        $oldPosition = $this->positionRepository->lockByPortfolioAndStock($portfolioId, $oldCode);
        if ($oldPosition) {
            $updatedOld = DecimalMath::sub((string) $oldPosition->dividend_income, $oldAmount, 4);
            if (DecimalMath::cmp($updatedOld, '0', 4) < 0) {
                $updatedOld = '0.0000';
            }
            $oldPosition->dividend_income = $updatedOld;
            $this->positionRepository->save($oldPosition);
        }

        $newPosition = $this->positionRepository->lockByPortfolioAndStock($portfolioId, $newCode);
        if ($newPosition) {
            $newPosition->dividend_income = DecimalMath::add((string) $newPosition->dividend_income, $newAmount, 4);
            $this->positionRepository->save($newPosition);
        }
    }
}
