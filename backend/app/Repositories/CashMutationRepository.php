<?php

namespace App\Repositories;

use App\Models\CashMutation;
use App\Support\DecimalMath;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CashMutationRepository
{
    public function create(array $payload): CashMutation
    {
        return CashMutation::query()->create($payload);
    }

    public function getBalanceByPortfolio(int $userId, int $portfolioId): string
    {
        return $this->calculateBalance($userId, $portfolioId);
    }

    public function getBalanceByPortfolioExcludingMutation(int $userId, int $portfolioId, int $mutationId): string
    {
        return $this->calculateBalance($userId, $portfolioId, $mutationId);
    }

    public function listByUser(int $userId, ?int $portfolioId = null, int $limit = 200): Collection
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->whereIn('type', [CashMutation::TYPE_DEPOSIT, CashMutation::TYPE_WITHDRAW])
            ->whereNull('reference_id')
            ->when($portfolioId, fn ($query) => $query->where('portfolio_id', $portfolioId))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function findOwned(int $userId, int $mutationId): ?CashMutation
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->where('id', $mutationId)
            ->first();
    }

    public function findLinkedStockMutation(int $userId, int $portfolioId, int $transactionId): ?CashMutation
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->whereIn('type', [CashMutation::TYPE_DEPOSIT, CashMutation::TYPE_WITHDRAW])
            ->where('reference_id', $transactionId)
            ->first();
    }

    public function findLinkedDividendMutation(int $userId, int $portfolioId, int $dividendId): ?CashMutation
    {
        return CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->where('type', CashMutation::TYPE_DIVIDEND)
            ->where('reference_id', $dividendId)
            ->first();
    }

    public function getTotalTopupByPortfolio(int $userId, int $portfolioId): string
    {
        $value = CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->where('type', CashMutation::TYPE_DEPOSIT)
            ->whereNull('reference_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->value('total');

        return (string) ($value ?? '0');
    }

    public function getTotalWithdrawByPortfolio(int $userId, int $portfolioId): string
    {
        $value = CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->where('type', CashMutation::TYPE_WITHDRAW)
            ->whereNull('reference_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->value('total');

        return (string) ($value ?? '0');
    }

    public function save(CashMutation $mutation): CashMutation
    {
        $mutation->save();
        return $mutation;
    }

    public function delete(CashMutation $mutation): void
    {
        $mutation->delete();
    }

    private function calculateBalance(int $userId, int $portfolioId, ?int $excludeMutationId = null): string
    {
        $cashMutationDelta = CashMutation::query()
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->when($excludeMutationId, fn ($query) => $query->where('id', '!=', $excludeMutationId))
            // Stock BUY/SELL are calculated from stock_transactions.
            ->where(function ($query): void {
                $query->whereNotIn('type', [CashMutation::TYPE_DEPOSIT, CashMutation::TYPE_WITHDRAW])
                    ->orWhereNull('reference_id');
            })
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN type IN ('WITHDRAW', 'FEE') THEN -amount ELSE amount END), 0) as balance"
            )
            ->value('balance');

        $stockTransactionDelta = DB::table('stock_transactions')
            ->where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN type = 'BUY' THEN -net_amount WHEN type = 'SELL' THEN net_amount ELSE 0 END), 0) as balance"
            )
            ->value('balance');

        return DecimalMath::add(
            (string) ($cashMutationDelta ?? '0'),
            (string) ($stockTransactionDelta ?? '0'),
            4
        );
    }
}
