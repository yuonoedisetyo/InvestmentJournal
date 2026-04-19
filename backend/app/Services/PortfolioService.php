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
                'performance_cutoff_date' => $payload['performance_cutoff_date'] ?? null,
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

        $positions = $this->positionRepository->listWithLatestPriceByPortfolio($portfolioId);
        $transactions = $this->performanceRepository->stockTransactionsInRange($userId, $portfolioId, $startDate, $endDate);
        $cashMutations = $this->performanceRepository->cashMutationsInRange($userId, $portfolioId, $startDate, $endDate);
        $currentCashBalance = (float) $this->cashMutationRepository->getBalanceByPortfolio($userId, $portfolioId);
        $currentTotalModalDisetor = (float) DecimalMath::sub(
            $this->cashMutationRepository->getTotalTopupByPortfolio($userId, $portfolioId),
            $this->cashMutationRepository->getTotalWithdrawByPortfolio($userId, $portfolioId),
            4
        );

        $stockCodes = $positions
            ->pluck('stock_code')
            ->concat($transactions->pluck('stock_code'))
            ->map(fn ($value) => strtoupper((string) $value))
            ->unique()
            ->values()
            ->all();

        $priceRows = $this->performanceRepository->stockPriceSeries($stockCodes, $startDate, $endDate);
        $openingPriceRows = $this->performanceRepository->latestStockPricesBeforeDate($stockCodes, $startDate);
        $ihsgRows = $this->performanceRepository->ihsgPriceSeries($startDate, $endDate);
        $openingIhsgRow = $this->performanceRepository->latestIhsgPriceBeforeDate($startDate);

        $transactionByDate = [];
        $holdings = [];
        $lastKnownPrice = [];
        foreach ($positions as $position) {
            $code = strtoupper((string) $position->stock_code);
            $holdings[$code] = (int) ($position->total_shares ?? 0);
            $lastKnownPrice[$code] = (float) ($position->last_price ?? 0);
        }

        foreach ($transactions as $transaction) {
            $date = Carbon::parse($transaction->transaction_date)->toDateString();
            $normalizedTransaction = [
                'stock_code' => strtoupper((string) $transaction->stock_code),
                'type' => (string) $transaction->type,
                'lot' => (int) $transaction->lot,
                'price' => (float) $transaction->price,
                'net_amount' => (float) $transaction->net_amount,
            ];

            $transactionByDate[$date][] = $normalizedTransaction;
        }

        $cashDeltaByDate = [];
        $externalFlowByDate = [];
        $modalDisetorDeltaByDate = [];
        $cashBalance = $currentCashBalance;
        $totalModalDisetor = $currentTotalModalDisetor;
        foreach ($cashMutations as $mutation) {
            $date = Carbon::parse($mutation->created_at)->toDateString();
            $amount = (float) $mutation->amount;
            $type = (string) $mutation->type;
            $isManualDeposit = $type === 'DEPOSIT' && $mutation->reference_id === null;
            $isManualWithdraw = $type === 'WITHDRAW' && $mutation->reference_id === null;
            $isLinkedStockCashMutation = in_array($type, ['DEPOSIT', 'WITHDRAW'], true) && $mutation->reference_id !== null;

            if ($isLinkedStockCashMutation) {
                continue;
            }

            $delta = in_array($type, ['WITHDRAW', 'FEE'], true) ? -$amount : $amount;

            $cashDeltaByDate[$date] = ($cashDeltaByDate[$date] ?? 0.0) + $delta;

            if ($isManualDeposit) {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) + $amount;
                $modalDisetorDeltaByDate[$date] = ($modalDisetorDeltaByDate[$date] ?? 0.0) + $amount;
            } elseif ($isManualWithdraw) {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) - $amount;
                $modalDisetorDeltaByDate[$date] = ($modalDisetorDeltaByDate[$date] ?? 0.0) - $amount;
            } elseif ($type === 'ADJUSTMENT') {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) + $delta;
            }
        }

        $priceByDate = [];
        foreach ($openingPriceRows as $priceRow) {
            $code = strtoupper((string) $priceRow->stock_code);
            if (($lastKnownPrice[$code] ?? 0.0) <= 0) {
                $lastKnownPrice[$code] = (float) $priceRow->price;
            }
        }

        foreach ($priceRows as $priceRow) {
            $date = Carbon::parse($priceRow->price_date)->toDateString();
            $code = strtoupper((string) $priceRow->stock_code);
            $priceByDate[$date][$code] = (float) $priceRow->price;
        }

        $ihsgByDate = [];
        foreach ($ihsgRows as $priceRow) {
            $date = Carbon::parse($priceRow->price_date)->toDateString();
            $ihsgByDate[$date] = (float) $priceRow->close;
        }

        foreach ($transactions->sortByDesc(fn ($transaction) => sprintf(
            '%s-%010d',
            Carbon::parse($transaction->transaction_date)->toDateString(),
            (int) $transaction->id
        )) as $transaction) {
            $this->reverseStockTransaction($holdings, $cashBalance, [
                'stock_code' => strtoupper((string) $transaction->stock_code),
                'type' => (string) $transaction->type,
                'lot' => (int) $transaction->lot,
                'net_amount' => (float) $transaction->net_amount,
            ]);
        }

        foreach ($cashMutations->sortByDesc(fn ($mutation) => sprintf(
            '%s-%010d',
            Carbon::parse($mutation->created_at)->toDateString(),
            (int) $mutation->id
        )) as $mutation) {
            $type = (string) $mutation->type;
            $amount = (float) $mutation->amount;
            $isLinkedStockCashMutation = in_array($type, ['DEPOSIT', 'WITHDRAW'], true) && $mutation->reference_id !== null;
            if ($isLinkedStockCashMutation) {
                continue;
            }

            $delta = in_array($type, ['WITHDRAW', 'FEE'], true) ? -$amount : $amount;
            $cashBalance -= $delta;

            if ($type === 'DEPOSIT' && $mutation->reference_id === null) {
                $totalModalDisetor -= $amount;
            } elseif ($type === 'WITHDRAW' && $mutation->reference_id === null) {
                $totalModalDisetor += $amount;
            }
        }

        $lastKnownIhsg = $openingIhsgRow ? (float) $openingIhsgRow->close : 0.0;
        $series = [];

        foreach (CarbonPeriod::create($start, $end) as $date) {
            $dateKey = $date->toDateString();

            foreach ($transactionByDate[$dateKey] ?? [] as $transaction) {
                $this->applyStockTransaction($holdings, $lastKnownPrice, $cashBalance, $transaction);
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

            if (array_key_exists($dateKey, $ihsgByDate)) {
                $lastKnownIhsg = $ihsgByDate[$dateKey];
            }

            $totalModalDisetor += $modalDisetorDeltaByDate[$dateKey] ?? 0.0;
            $netAssetValue = $marketValue + $cashBalance;
            $externalFlow = $externalFlowByDate[$dateKey] ?? 0.0;

            $series[] = [
                'date' => $dateKey,
                'portfolio_nav' => round($netAssetValue, 4),
                'market_value' => round($marketValue, 4),
                'cash_balance' => round($cashBalance, 4),
                'total_modal_disetor' => round($totalModalDisetor, 4),
                'total_asset_value' => round($netAssetValue, 4),
                'net_flow' => round($externalFlow, 4),
                'benchmark_close' => round($lastKnownIhsg, 4),
                'portfolio_daily_return' => 0.0,
                'portfolio_index' => 100.0,
                'benchmark_daily_return' => 0.0,
                'benchmark_index' => 100.0,
                'portfolio' => 100.0,
                'ihsg' => 100.0,
            ];
        }

        $defaultCutoffDate = $this->resolveDefaultPerformanceCutoffDate($userId, $portfolioId, $startDate);
        $effectiveCutoffDate = $startDate;
        if ($portfolio->performance_cutoff_date) {
            $portfolioCutoffDate = Carbon::parse($portfolio->performance_cutoff_date)->toDateString();
            if ($portfolioCutoffDate > $effectiveCutoffDate) {
                $effectiveCutoffDate = $portfolioCutoffDate;
            }
        } elseif ($defaultCutoffDate > $effectiveCutoffDate) {
            $effectiveCutoffDate = $defaultCutoffDate;
        }
        if ($effectiveCutoffDate > $endDate) {
            $effectiveCutoffDate = $endDate;
        }

        $indexedSeries = $this->applyPerformanceCutoff($series, $effectiveCutoffDate);

        $cutoffSeries = array_values(array_filter(
            $indexedSeries,
            fn (array $point): bool => (string) ($point['date'] ?? '') >= $effectiveCutoffDate
        ));

        $startNav = $cutoffSeries[0]['portfolio_nav'] ?? 0.0;
        $endNav = $cutoffSeries !== [] ? $cutoffSeries[array_key_last($cutoffSeries)]['portfolio_nav'] : 0.0;
        $portfolioReturnNominal = $endNav - $startNav;
        $portfolioReturnPercent = $startNav > 0 ? ($portfolioReturnNominal / $startNav) * 100 : 0.0;
        $benchmarkStartPrice = $cutoffSeries[0]['benchmark_close'] ?? 0.0;
        $benchmarkEndPrice = $cutoffSeries !== [] ? ($cutoffSeries[array_key_last($cutoffSeries)]['benchmark_close'] ?? 0.0) : 0.0;
        $benchmarkReturnPercent = ($benchmarkStartPrice > 0 && $benchmarkEndPrice > 0)
            ? (($benchmarkEndPrice - $benchmarkStartPrice) / $benchmarkStartPrice) * 100
            : 0.0;
        $maxDrawdownPercent = $this->calculateMaxDrawdownPercent($cutoffSeries);

        return [
            'meta' => [
                'portfolio_id' => $portfolioId,
                'currency' => (string) ($portfolio->currency ?? 'IDR'),
                'benchmark' => 'IHSG',
                'method' => 'time_weighted_return',
                'base_index' => 100,
                'performance_cutoff_date' => $effectiveCutoffDate,
                'default_cutoff_date' => $defaultCutoffDate,
                'portfolio_cutoff_date' => $portfolio->performance_cutoff_date
                    ? Carbon::parse($portfolio->performance_cutoff_date)->toDateString()
                    : null,
                'effective_performance_cutoff_date' => $effectiveCutoffDate,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $days,
            ],
            'summary' => [
                'portfolio' => [
                    'start_nav' => round($startNav, 4),
                    'end_nav' => round($endNav, 4),
                    'return_nominal' => round($portfolioReturnNominal, 4),
                    'return_percent' => round($portfolioReturnPercent, 4),
                    'max_drawdown_percent' => round($maxDrawdownPercent, 4),
                ],
                'benchmark' => [
                    'start_price' => round((float) ($benchmarkStartPrice ?? 0.0), 4),
                    'end_price' => round($benchmarkEndPrice, 4),
                    'return_percent' => round($benchmarkReturnPercent, 4),
                ],
                'alpha_percent' => round($portfolioReturnPercent - $benchmarkReturnPercent, 4),
            ],
            'series' => $indexedSeries,
        ];
    }

    private function applyStockTransaction(array &$holdings, array &$lastKnownPrice, float &$cashBalance, array $transaction): void
    {
        $code = $transaction['stock_code'];
        $sharesDelta = ($transaction['type'] === 'BUY' ? 1 : -1) * $transaction['lot'] * 100;
        $holdings[$code] = ($holdings[$code] ?? 0) + $sharesDelta;
        $cashBalance += $transaction['type'] === 'BUY'
            ? -$transaction['net_amount']
            : $transaction['net_amount'];
        $lastKnownPrice[$code] = $transaction['price'];
    }

    private function reverseStockTransaction(array &$holdings, float &$cashBalance, array $transaction): void
    {
        $code = $transaction['stock_code'];
        $sharesDelta = ($transaction['type'] === 'BUY' ? 1 : -1) * $transaction['lot'] * 100;
        $holdings[$code] = ($holdings[$code] ?? 0) - $sharesDelta;
        $cashBalance -= $transaction['type'] === 'BUY'
            ? -$transaction['net_amount']
            : $transaction['net_amount'];
    }

    private function calculateMaxDrawdownPercent(array $series): float
    {
        $peak = null;
        $maxDrawdown = 0.0;

        foreach ($series as $point) {
            $nav = (float) ($point['portfolio_nav'] ?? 0);
            if ($nav <= 0) {
                continue;
            }

            if ($peak === null || $nav > $peak) {
                $peak = $nav;
                continue;
            }

            if ($peak > 0) {
                $drawdown = (($nav - $peak) / $peak) * 100;
                if ($drawdown < $maxDrawdown) {
                    $maxDrawdown = $drawdown;
                }
            }
        }

        return $maxDrawdown;
    }

    private function applyPerformanceCutoff(array $series, string $cutoffDate): array
    {
        $previousNav = null;
        $previousIhsgClose = null;
        $portfolioIndex = 100.0;
        $benchmarkIndex = 100.0;
        $hasStarted = false;

        foreach ($series as $index => $point) {
            $date = (string) ($point['date'] ?? '');

            if ($date < $cutoffDate) {
                continue;
            }

            $nav = (float) ($point['portfolio_nav'] ?? 0);
            $netFlow = (float) ($point['net_flow'] ?? 0);
            $benchmarkClose = (float) ($point['benchmark_close'] ?? 0);

            if (! $hasStarted) {
                $hasStarted = true;
                $previousNav = $nav;
                $previousIhsgClose = $benchmarkClose > 0 ? $benchmarkClose : null;
                $series[$index]['portfolio_daily_return'] = 0.0;
                $series[$index]['portfolio_index'] = 100.0;
                $series[$index]['benchmark_daily_return'] = 0.0;
                $series[$index]['benchmark_index'] = 100.0;
                $series[$index]['portfolio'] = 100.0;
                $series[$index]['ihsg'] = 100.0;
                continue;
            }

            $portfolioDailyReturn = 0.0;
            if ($previousNav !== null && $previousNav > 0) {
                $portfolioDailyReturn = ($nav - $previousNav - $netFlow) / $previousNav;
                $portfolioIndex *= (1 + $portfolioDailyReturn);
            }

            $benchmarkDailyReturn = 0.0;
            if ($previousIhsgClose !== null && $previousIhsgClose > 0 && $benchmarkClose > 0) {
                $benchmarkDailyReturn = ($benchmarkClose / $previousIhsgClose) - 1;
                $benchmarkIndex *= (1 + $benchmarkDailyReturn);
            }

            $series[$index]['portfolio_daily_return'] = round($portfolioDailyReturn * 100, 4);
            $series[$index]['portfolio_index'] = round($portfolioIndex, 2);
            $series[$index]['benchmark_daily_return'] = round($benchmarkDailyReturn * 100, 4);
            $series[$index]['benchmark_index'] = round($benchmarkIndex, 2);
            $series[$index]['portfolio'] = round($portfolioIndex, 2);
            $series[$index]['ihsg'] = round($benchmarkIndex, 2);

            $previousNav = $nav;
            if ($benchmarkClose > 0) {
                $previousIhsgClose = $benchmarkClose;
            }
        }

        return $series;
    }

    private function resolveDefaultPerformanceCutoffDate(int $userId, int $portfolioId, string $fallbackDate): string
    {
        $candidateDates = array_filter([
            $this->performanceRepository->earliestStockTransactionDate($userId, $portfolioId),
            $this->performanceRepository->earliestCashMutationDate($userId, $portfolioId),
        ]);

        if ($candidateDates === []) {
            return $fallbackDate;
        }

        $normalizedDates = array_map(
            static fn (string $value): string => Carbon::parse($value)->toDateString(),
            $candidateDates
        );

        sort($normalizedDates);

        return $normalizedDates[0] ?? $fallbackDate;
    }
}
