<?php

namespace App\Services;

use App\Repositories\PortfolioRepository;
use App\Repositories\PositionRepository;
use App\Repositories\TransactionRepository;
use App\Support\DecimalMath;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class TransactionService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly PositionRepository $positionRepository,
    ) {
    }

    public function buy(int $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload): array {
            $portfolio = $this->portfolioRepository->findOwned($userId, (int) $payload['portfolio_id']);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $stockCode = strtoupper($payload['stock_code']);
            $shares = (string) (((int) $payload['lot']) * 100);
            $price = (string) $payload['price'];
            $fee = (string) ($payload['fee'] ?? '0');
            $gross = DecimalMath::mul($shares, $price, 4);
            $net = DecimalMath::add($gross, $fee, 4);

            $tx = $this->transactionRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'stock_code' => $stockCode,
                'type' => 'BUY',
                'lot' => (int) $payload['lot'],
                'price' => $price,
                'fee' => $fee,
                'gross_amount' => $gross,
                'net_amount' => $net,
                'transaction_date' => $payload['transaction_date'],
                'notes' => $payload['notes'] ?? null,
            ]);

            $position = $this->positionRepository->lockByPortfolioAndStock((int) $payload['portfolio_id'], $stockCode);
            if (! $position) {
                $position = $this->positionRepository->create([
                    'portfolio_id' => (int) $payload['portfolio_id'],
                    'stock_code' => $stockCode,
                    'total_shares' => 0,
                    'average_price' => '0.00000000',
                    'invested_amount' => '0.0000',
                    'realized_pnl' => '0.0000',
                    'dividend_income' => '0.0000',
                ]);
            }

            $newShares = (int) $position->total_shares + (int) $shares;
            $newInvested = DecimalMath::add((string) $position->invested_amount, $net, 4);
            $newAverage = DecimalMath::div($newInvested, (string) $newShares, 8);

            $position->total_shares = $newShares;
            $position->invested_amount = $newInvested;
            $position->average_price = $newAverage;
            $this->positionRepository->save($position);

            return [
                'transaction_id' => $tx->id,
                'position' => $position->fresh(),
            ];
        });
    }

    public function sell(int $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload): array {
            $portfolio = $this->portfolioRepository->findOwned($userId, (int) $payload['portfolio_id']);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $stockCode = strtoupper($payload['stock_code']);
            $shares = (string) (((int) $payload['lot']) * 100);
            $price = (string) $payload['price'];
            $fee = (string) ($payload['fee'] ?? '0');

            $position = $this->positionRepository->lockByPortfolioAndStock((int) $payload['portfolio_id'], $stockCode);
            if (! $position || $position->total_shares <= 0) {
                throw new RuntimeException('No existing position for selected stock.');
            }

            if ((int) $position->total_shares < (int) $shares) {
                throw new RuntimeException('Sell quantity exceeds available shares.');
            }

            $gross = DecimalMath::mul($shares, $price, 4);
            $net = DecimalMath::sub($gross, $fee, 4);
            $costBasis = DecimalMath::mul((string) $position->average_price, $shares, 4);
            $realized = DecimalMath::sub($net, $costBasis, 4);

            $tx = $this->transactionRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'stock_code' => $stockCode,
                'type' => 'SELL',
                'lot' => (int) $payload['lot'],
                'price' => $price,
                'fee' => $fee,
                'gross_amount' => $gross,
                'net_amount' => $net,
                'transaction_date' => $payload['transaction_date'],
                'notes' => $payload['notes'] ?? null,
            ]);

            $newShares = (int) $position->total_shares - (int) $shares;
            $newInvested = DecimalMath::sub((string) $position->invested_amount, $costBasis, 4);
            if ($newShares === 0 || DecimalMath::cmp($newInvested, '0', 4) < 0) {
                $newInvested = '0.0000';
            }

            $position->total_shares = $newShares;
            $position->invested_amount = $newInvested;
            $position->average_price = $newShares === 0
                ? '0.00000000'
                : DecimalMath::div($newInvested, (string) $newShares, 8);
            $position->realized_pnl = DecimalMath::add((string) $position->realized_pnl, $realized, 4);
            $this->positionRepository->save($position);

            return [
                'transaction_id' => $tx->id,
                'realized_pnl' => $realized,
                'position' => $position->fresh(),
            ];
        });
    }
}
