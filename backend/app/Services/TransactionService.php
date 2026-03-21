<?php

namespace App\Services;

use App\Models\CashMutation;
use App\Repositories\CashMutationRepository;
use App\Repositories\DividendRepository;
use App\Repositories\PortfolioRepository;
use App\Repositories\PositionRepository;
use App\Repositories\TransactionRepository;
use App\Support\DecimalMath;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use RuntimeException;

class TransactionService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly PositionRepository $positionRepository,
        private readonly CashService $cashService,
        private readonly CashMutationRepository $cashMutationRepository,
        private readonly DividendRepository $dividendRepository,
    ) {
    }

    public function listJournal(int $userId, ?int $portfolioId = null): array
    {
        $stockEntries = $this->transactionRepository
            ->listByUser($userId, $portfolioId)
            ->map(function ($transaction): array {
                return [
                    'id' => $transaction->id,
                    'entry_type' => 'STOCK',
                    'transaction_date' => (string) $transaction->transaction_date,
                    'type' => $transaction->type,
                    'stock_code' => $transaction->stock_code,
                    'lot' => (int) $transaction->lot,
                    'price' => (string) $transaction->price,
                    'amount' => (string) $transaction->net_amount,
                    'fee' => (string) $transaction->fee,
                    'notes' => $transaction->notes,
                ];
            })
            ->values()
            ->toArray();

        $cashEntries = $this->cashService->listJournalEntries($userId, $portfolioId);
        $dividendEntries = $this->dividendRepository
            ->listByUser($userId, $portfolioId)
            ->map(function ($dividend): array {
                return [
                    'id' => $dividend->id,
                    'entry_type' => 'DIVIDEND',
                    'transaction_date' => (string) $dividend->pay_date,
                    'type' => 'DIVIDEND',
                    'stock_code' => $dividend->stock_code,
                    'lot' => null,
                    'price' => null,
                    'amount' => (string) $dividend->amount,
                    'fee' => null,
                    'notes' => $dividend->notes,
                ];
            })
            ->values()
            ->toArray();

        $merged = array_merge($stockEntries, $cashEntries, $dividendEntries);
        usort($merged, static function (array $a, array $b): int {
            $dateComparison = strcmp((string) $b['transaction_date'], (string) $a['transaction_date']);
            if ($dateComparison !== 0) {
                return $dateComparison;
            }

            return (int) $b['id'] <=> (int) $a['id'];
        });

        return $merged;
    }

    public function updateJournal(int $userId, int $transactionId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $transactionId, $payload): array {
            $transaction = $this->transactionRepository->findOwned($userId, $transactionId);
            if (! $transaction) {
                abort(404, 'Transaction not found.');
            }

            $transaction->lot = (int) ($payload['lot'] ?? $transaction->lot);
            $transaction->price = (string) ($payload['price'] ?? $transaction->price);
            $transaction->fee = (string) ($payload['fee'] ?? $transaction->fee);
            $transaction->transaction_date = $payload['transaction_date'] ?? $transaction->transaction_date;
            $transaction->notes = $payload['notes'] ?? $transaction->notes;

            $shares = (string) ($transaction->lot * 100);
            $gross = DecimalMath::mul($shares, (string) $transaction->price, 4);
            $net = $transaction->type === 'BUY'
                ? DecimalMath::add($gross, (string) $transaction->fee, 4)
                : DecimalMath::sub($gross, (string) $transaction->fee, 4);

            $transaction->gross_amount = $gross;
            $transaction->net_amount = $net;
            $this->transactionRepository->save($transaction);
            $this->upsertStockCashMutation($userId, $transaction->toArray());

            $position = $this->recomputePosition($transaction->portfolio_id, $transaction->stock_code);

            return [
                'transaction_id' => $transaction->id,
                'position' => $position,
            ];
        });
    }

    public function deleteJournal(int $userId, int $transactionId): array
    {
        return DB::transaction(function () use ($userId, $transactionId): array {
            $transaction = $this->transactionRepository->findOwned($userId, $transactionId);
            if (! $transaction) {
                abort(404, 'Transaction not found.');
            }

            $portfolioId = (int) $transaction->portfolio_id;
            $stockCode = (string) $transaction->stock_code;

            $this->deleteStockCashMutation($userId, $portfolioId, $transaction->id);
            $this->transactionRepository->delete($transaction);
            $position = $this->recomputePosition($portfolioId, $stockCode);

            return [
                'deleted' => true,
                'position' => $position,
            ];
        });
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
            $this->upsertStockCashMutation($userId, $tx->toArray());

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
            $this->upsertStockCashMutation($userId, $tx->toArray());

            return [
                'transaction_id' => $tx->id,
                'realized_pnl' => $realized,
                'position' => $position->fresh(),
            ];
        });
    }

    private function recomputePosition(int $portfolioId, string $stockCode): ?array
    {
        $position = $this->positionRepository->lockByPortfolioAndStock($portfolioId, $stockCode);
        $dividendIncome = $position ? (string) $position->dividend_income : '0.0000';

        $shares = 0;
        $invested = '0.0000';
        $averagePrice = '0.00000000';
        $realizedPnl = '0.0000';

        $transactions = $this->transactionRepository->listByPortfolioAndStock($portfolioId, $stockCode);
        foreach ($transactions as $transaction) {
            $txShares = (int) $transaction->lot * 100;
            $price = (string) $transaction->price;
            $fee = (string) $transaction->fee;

            if ($transaction->type === 'BUY') {
                $gross = DecimalMath::mul((string) $txShares, $price, 4);
                $net = DecimalMath::add($gross, $fee, 4);

                $shares += $txShares;
                $invested = DecimalMath::add($invested, $net, 4);
                $averagePrice = $shares > 0
                    ? DecimalMath::div($invested, (string) $shares, 8)
                    : '0.00000000';
                continue;
            }

            if ($shares < $txShares) {
                throw new RuntimeException('Update/delete would make sell quantity exceed available shares.');
            }

            $gross = DecimalMath::mul((string) $txShares, $price, 4);
            $net = DecimalMath::sub($gross, $fee, 4);
            $costBasis = DecimalMath::mul($averagePrice, (string) $txShares, 4);
            $realizedPnl = DecimalMath::add($realizedPnl, DecimalMath::sub($net, $costBasis, 4), 4);

            $shares -= $txShares;
            $invested = DecimalMath::sub($invested, $costBasis, 4);
            if ($shares === 0 || DecimalMath::cmp($invested, '0', 4) < 0) {
                $invested = '0.0000';
                $averagePrice = '0.00000000';
            } else {
                $averagePrice = DecimalMath::div($invested, (string) $shares, 8);
            }
        }

        if (! $position) {
            if ($shares === 0 && DecimalMath::cmp($realizedPnl, '0', 4) === 0 && DecimalMath::cmp($dividendIncome, '0', 4) === 0) {
                return null;
            }

            $position = $this->positionRepository->create([
                'portfolio_id' => $portfolioId,
                'stock_code' => $stockCode,
                'total_shares' => $shares,
                'average_price' => $averagePrice,
                'invested_amount' => $invested,
                'realized_pnl' => $realizedPnl,
                'dividend_income' => $dividendIncome,
            ]);

            return $position->fresh()?->toArray();
        }

        $position->total_shares = $shares;
        $position->average_price = $averagePrice;
        $position->invested_amount = $invested;
        $position->realized_pnl = $realizedPnl;
        $position->dividend_income = $dividendIncome;
        $this->positionRepository->save($position);

        return $position->fresh()?->toArray();
    }

    private function upsertStockCashMutation(int $userId, array $transaction): void
    {
        $portfolioId = (int) $transaction['portfolio_id'];
        $transactionId = (int) $transaction['id'];
        $isBuy = $transaction['type'] === 'BUY';
        $transactionDate = Carbon::parse((string) $transaction['transaction_date'])->format('Y-m-d H:i:s');

        $mutation = $this->cashMutationRepository->findLinkedStockMutation($userId, $portfolioId, $transactionId);
        if (! $mutation) {
            $mutation = $this->cashMutationRepository->create([
                'user_id' => $userId,
                'portfolio_id' => $portfolioId,
                'type' => $isBuy ? CashMutation::TYPE_WITHDRAW : CashMutation::TYPE_DEPOSIT,
                'amount' => (string) $transaction['net_amount'],
                'reference_id' => $transactionId,
                'description' => sprintf('Auto %s %s', $transaction['type'], $transaction['stock_code']),
                'created_at' => $transactionDate,
            ]);
            return;
        }

        $mutation->type = $isBuy ? CashMutation::TYPE_WITHDRAW : CashMutation::TYPE_DEPOSIT;
        $mutation->amount = (string) $transaction['net_amount'];
        $mutation->description = sprintf('Auto %s %s', $transaction['type'], $transaction['stock_code']);
        $mutation->created_at = $transactionDate;
        $this->cashMutationRepository->save($mutation);
    }

    private function deleteStockCashMutation(int $userId, int $portfolioId, int $transactionId): void
    {
        $mutation = $this->cashMutationRepository->findLinkedStockMutation($userId, $portfolioId, $transactionId);
        if ($mutation) {
            $this->cashMutationRepository->delete($mutation);
        }
    }
}
