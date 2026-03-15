<?php

namespace App\Services;

use App\Models\CashMutation;
use App\Repositories\CashMutationRepository;
use App\Repositories\PortfolioRepository;
use App\Support\DecimalMath;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CashService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly CashMutationRepository $cashMutationRepository,
    ) {
    }

    public function topup(int $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload): array {
            $portfolio = $this->portfolioRepository->findOwned($userId, (int) $payload['portfolio_id']);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $amount = (string) $payload['amount'];
            $mutation = $this->cashMutationRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'type' => CashMutation::TYPE_DEPOSIT,
                'amount' => $amount,
                'description' => $payload['notes'] ?? 'Topup cash',
                'created_at' => $payload['transaction_date'],
            ]);

            $balance = $this->cashMutationRepository->getBalanceByPortfolio($userId, (int) $payload['portfolio_id']);

            return [
                'cash_mutation_id' => $mutation->id,
                'cash_balance' => $balance,
            ];
        });
    }

    public function withdraw(int $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload): array {
            $portfolio = $this->portfolioRepository->findOwned($userId, (int) $payload['portfolio_id']);
            if (! $portfolio) {
                abort(404, 'Portfolio not found.');
            }

            $amount = (string) $payload['amount'];
            $balance = $this->cashMutationRepository->getBalanceByPortfolio($userId, (int) $payload['portfolio_id']);
            if (DecimalMath::cmp($balance, $amount, 4) < 0) {
                throw new RuntimeException('Saldo cash tidak cukup untuk withdraw.');
            }

            $mutation = $this->cashMutationRepository->create([
                'user_id' => $userId,
                'portfolio_id' => (int) $payload['portfolio_id'],
                'type' => CashMutation::TYPE_WITHDRAW,
                'amount' => $amount,
                'description' => $payload['notes'] ?? 'Withdraw cash',
                'created_at' => $payload['transaction_date'],
            ]);

            $newBalance = $this->cashMutationRepository->getBalanceByPortfolio($userId, (int) $payload['portfolio_id']);

            return [
                'cash_mutation_id' => $mutation->id,
                'cash_balance' => $newBalance,
            ];
        });
    }

    public function balance(int $userId, int $portfolioId): array
    {
        $portfolio = $this->portfolioRepository->findOwned($userId, $portfolioId);
        if (! $portfolio) {
            abort(404, 'Portfolio not found.');
        }

        return [
            'portfolio_id' => $portfolioId,
            'cash_balance' => $this->cashMutationRepository->getBalanceByPortfolio($userId, $portfolioId),
        ];
    }

    public function listJournalEntries(int $userId, ?int $portfolioId = null): array
    {
        return $this->cashMutationRepository
            ->listByUser($userId, $portfolioId)
            ->map(function (CashMutation $mutation): array {
                return [
                    'id' => $mutation->id,
                    'entry_type' => 'CASH',
                    'transaction_date' => (string) $mutation->created_at,
                    'type' => $mutation->type === CashMutation::TYPE_DEPOSIT ? 'TOPUP' : 'WITHDRAW',
                    'stock_code' => null,
                    'lot' => null,
                    'price' => null,
                    'amount' => (string) $mutation->amount,
                    'fee' => null,
                    'notes' => $mutation->description,
                ];
            })
            ->values()
            ->toArray();
    }

    public function updateMutation(int $userId, int $mutationId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $mutationId, $payload): array {
            $mutation = $this->cashMutationRepository->findOwned($userId, $mutationId);
            if (! $mutation) {
                abort(404, 'Cash mutation not found.');
            }

            if (! in_array($mutation->type, [CashMutation::TYPE_DEPOSIT, CashMutation::TYPE_WITHDRAW], true)) {
                throw new RuntimeException('Mutation type is not editable.');
            }
            if ($mutation->reference_id !== null) {
                throw new RuntimeException('Mutation ini terhubung ke transaksi saham dan tidak bisa diedit dari menu cash.');
            }

            $newAmount = (string) ($payload['amount'] ?? $mutation->amount);
            if ($mutation->type === CashMutation::TYPE_WITHDRAW) {
                $balanceExcludingCurrent = $this->cashMutationRepository->getBalanceByPortfolioExcludingMutation(
                    $userId,
                    (int) $mutation->portfolio_id,
                    $mutation->id
                );
                if (DecimalMath::cmp($balanceExcludingCurrent, $newAmount, 4) < 0) {
                    throw new RuntimeException('Saldo cash tidak cukup untuk update withdraw.');
                }
            }

            $mutation->amount = $newAmount;
            $mutation->created_at = $payload['transaction_date'] ?? $mutation->created_at;
            if (array_key_exists('notes', $payload)) {
                $mutation->description = $payload['notes'];
            }
            $this->cashMutationRepository->save($mutation);

            return [
                'cash_mutation_id' => $mutation->id,
                'cash_balance' => $this->cashMutationRepository->getBalanceByPortfolio($userId, (int) $mutation->portfolio_id),
            ];
        });
    }

    public function deleteMutation(int $userId, int $mutationId): array
    {
        return DB::transaction(function () use ($userId, $mutationId): array {
            $mutation = $this->cashMutationRepository->findOwned($userId, $mutationId);
            if (! $mutation) {
                abort(404, 'Cash mutation not found.');
            }

            if (! in_array($mutation->type, [CashMutation::TYPE_DEPOSIT, CashMutation::TYPE_WITHDRAW], true)) {
                throw new RuntimeException('Mutation type is not deletable.');
            }
            if ($mutation->reference_id !== null) {
                throw new RuntimeException('Mutation ini terhubung ke transaksi saham dan tidak bisa dihapus dari menu cash.');
            }

            if ($mutation->type === CashMutation::TYPE_DEPOSIT) {
                $balanceExcludingCurrent = $this->cashMutationRepository->getBalanceByPortfolioExcludingMutation(
                    $userId,
                    (int) $mutation->portfolio_id,
                    $mutation->id
                );
                if (DecimalMath::cmp($balanceExcludingCurrent, '0', 4) < 0) {
                    throw new RuntimeException('Topup ini tidak bisa dihapus karena membuat saldo negatif.');
                }
            }

            $portfolioId = (int) $mutation->portfolio_id;
            $this->cashMutationRepository->delete($mutation);

            return [
                'deleted' => true,
                'cash_balance' => $this->cashMutationRepository->getBalanceByPortfolio($userId, $portfolioId),
            ];
        });
    }
}
