<?php

namespace App\Services;

use Carbon\CarbonPeriod;
use App\Models\Portfolio;
use App\Repositories\CashMutationRepository;
use App\Repositories\PerformanceRepository;
use App\Repositories\PortfolioRepository;
use App\Repositories\PositionRepository;
use App\Support\DecimalMath;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PortfolioService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly PositionRepository $positionRepository,
        private readonly CashMutationRepository $cashMutationRepository,
        private readonly PerformanceRepository $performanceRepository,
    ) {
    }

    public function listByUser(int $userId)
    {
        return $this->portfolioRepository->listByUser($userId);
    }

    public function create(int $userId, array $payload): Portfolio
    {
        $shouldActivate = (bool) ($payload['is_active'] ?? false)
            || ! $this->portfolioRepository->hasAnyForUser($userId);

        return DB::transaction(function () use ($userId, $payload, $shouldActivate): Portfolio {
            if ($shouldActivate) {
                $this->portfolioRepository->deactivateAllForUser($userId);
            }

            return $this->portfolioRepository->create([
                'user_id' => $userId,
                'name' => $payload['name'],
                'currency' => $payload['currency'] ?? 'IDR',
                'initial_capital' => $payload['initial_capital'] ?? '0.0000',
                'is_active' => $shouldActivate,
            ]);
        });
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

    public function listPositions(int $userId, int $portfolioId): array
    {
        $portfolio = $this->portfolioRepository->findOwned($userId, $portfolioId);
        if (! $portfolio) {
            abort(404, 'Portfolio not found.');
        }

        return $this->positionRepository->listWithLatestPriceByPortfolio($portfolioId)->toArray();
    }

    public function capitalSummary(int $userId, int $portfolioId): array
    {
        $portfolio = $this->portfolioRepository->findOwned($userId, $portfolioId);
        if (! $portfolio) {
            abort(404, 'Portfolio not found.');
        }

        $totalTopup = $this->cashMutationRepository->getTotalTopupByPortfolio($userId, $portfolioId);
        $totalWithdraw = $this->cashMutationRepository->getTotalWithdrawByPortfolio($userId, $portfolioId);
        $totalModalDisetor = DecimalMath::sub($totalTopup, $totalWithdraw, 4);

        $cashBalance = $this->cashMutationRepository->getBalanceByPortfolio($userId, $portfolioId);

        $positions = $this->positionRepository->listWithLatestPriceByPortfolio($portfolioId);
        $marketValue = '0.0000';
        foreach ($positions as $position) {
            $marketValue = DecimalMath::add($marketValue, (string) ($position->market_value ?? '0'), 4);
        }

        $netAssetValue = DecimalMath::add($marketValue, $cashBalance, 4);
        $overallReturnNominal = DecimalMath::sub($netAssetValue, $totalModalDisetor, 4);
        $overallReturnPercent = DecimalMath::cmp($totalModalDisetor, '0', 4) === 0
            ? '0.0000'
            : DecimalMath::mul(
                DecimalMath::div($overallReturnNominal, $totalModalDisetor, 8),
                '100',
                4
            );

        return [
            'portfolio_id' => $portfolioId,
            'total_modal_disetor' => $totalModalDisetor,
            'total_topup' => $totalTopup,
            'total_withdraw' => $totalWithdraw,
            'cash_balance' => $cashBalance,
            'net_asset_value' => $netAssetValue,
            'overall_return' => [
                'nominal' => $overallReturnNominal,
                'percent' => $overallReturnPercent,
            ],
        ];
    }

    public function performanceSeries(int $userId, int $portfolioId, int $days = 120): array
    {
        $portfolio = $this->portfolioRepository->findOwned($userId, $portfolioId);
        if (! $portfolio) {
            abort(404, 'Portfolio not found.');
        }

        $days = max(7, min(3650, $days));
        $end = Carbon::today();
        $start = (clone $end)->subDays($days - 1);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $transactions = $this->performanceRepository->stockTransactionsInRange($userId, $portfolioId, $startDate, $endDate);
        $cashMutations = $this->performanceRepository->cashMutationsInRange($userId, $portfolioId, $startDate, $endDate);

        $stockCodes = $transactions
            ->pluck('stock_code')
            ->map(fn ($value) => strtoupper((string) $value))
            ->unique()
            ->values()
            ->all();

        $priceRows = $this->performanceRepository->stockPriceSeries($stockCodes, $startDate, $endDate);

        $transactionByDate = [];
        foreach ($transactions as $transaction) {
            $date = Carbon::parse($transaction->transaction_date)->toDateString();
            $transactionByDate[$date][] = [
                'stock_code' => strtoupper((string) $transaction->stock_code),
                'type' => (string) $transaction->type,
                'lot' => (int) $transaction->lot,
                'price' => (float) $transaction->price,
                'net_amount' => (float) $transaction->net_amount,
            ];
        }

        $cashDeltaByDate = [];
        foreach ($cashMutations as $mutation) {
            $date = Carbon::parse($mutation->created_at)->toDateString();
            $amount = (float) $mutation->amount;
            $type = (string) $mutation->type;
            $delta = in_array($type, ['WITHDRAW', 'FEE'], true) ? -$amount : $amount;
            $cashDeltaByDate[$date] = ($cashDeltaByDate[$date] ?? 0.0) + $delta;
        }

        $priceByDate = [];
        foreach ($priceRows as $priceRow) {
            $date = Carbon::parse($priceRow->price_date)->toDateString();
            $code = strtoupper((string) $priceRow->stock_code);
            $priceByDate[$date][$code] = (float) $priceRow->price;
        }

        $holdings = [];
        $lastKnownPrice = [];
        $cashBalance = 0.0;
        $series = [];

        foreach (CarbonPeriod::create($start, $end) as $date) {
            $dateKey = $date->toDateString();

            foreach ($transactionByDate[$dateKey] ?? [] as $transaction) {
                $code = $transaction['stock_code'];
                $sharesDelta = ($transaction['type'] === 'BUY' ? 1 : -1) * $transaction['lot'] * 100;
                $holdings[$code] = ($holdings[$code] ?? 0) + $sharesDelta;
                $cashBalance += $transaction['type'] === 'BUY'
                    ? -$transaction['net_amount']
                    : $transaction['net_amount'];
                $lastKnownPrice[$code] = $transaction['price'];
            }

            $cashBalance += $cashDeltaByDate[$dateKey] ?? 0.0;

            foreach ($priceByDate[$dateKey] ?? [] as $code => $price) {
                $lastKnownPrice[$code] = $price;
            }

            $marketValue = 0.0;
            foreach ($holdings as $code => $shares) {
                if ($shares <= 0) {
                    continue;
                }
                $marketValue += $shares * ($lastKnownPrice[$code] ?? 0.0);
            }

            $netAssetValue = $marketValue + $cashBalance;
            $series[] = [
                'date' => $dateKey,
                'nav' => round($netAssetValue, 4),
            ];
        }

        $baseNav = null;
        foreach ($series as $point) {
            if ($point['nav'] > 0) {
                $baseNav = $point['nav'];
                break;
            }
        }
        $baseNav = $baseNav && $baseNav > 0 ? $baseNav : 1.0;

        return array_map(function (array $point) use ($baseNav): array {
            return [
                'date' => $point['date'],
                'portfolio' => round(($point['nav'] / $baseNav) * 100, 2),
                'ihsg' => 100.00,
                'nav' => $point['nav'],
            ];
        }, $series);
    }
}
