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

        $transactions = $this->performanceRepository->stockTransactionsUpToDate($userId, $portfolioId, $endDate);
        $cashMutations = $this->performanceRepository->cashMutationsUpToDate($userId, $portfolioId, $endDate);

        $stockCodes = $transactions
            ->pluck('stock_code')
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
        $cashBalance = 0.0;
        $lastKnownPrice = [];
        foreach ($transactions as $transaction) {
            $date = Carbon::parse($transaction->transaction_date)->toDateString();
            $normalizedTransaction = [
                'stock_code' => strtoupper((string) $transaction->stock_code),
                'type' => (string) $transaction->type,
                'lot' => (int) $transaction->lot,
                'price' => (float) $transaction->price,
                'net_amount' => (float) $transaction->net_amount,
            ];

            if ($date < $startDate) {
                $this->applyStockTransaction($holdings, $lastKnownPrice, $cashBalance, $normalizedTransaction);
                continue;
            }

            $transactionByDate[$date][] = $normalizedTransaction;
        }

        $cashDeltaByDate = [];
        $externalFlowByDate = [];
        foreach ($cashMutations as $mutation) {
            $date = Carbon::parse($mutation->created_at)->toDateString();
            $amount = (float) $mutation->amount;
            $type = (string) $mutation->type;
            $delta = in_array($type, ['WITHDRAW', 'FEE'], true) ? -$amount : $amount;

            if ($date < $startDate) {
                $cashBalance += $delta;
                continue;
            }

            $cashDeltaByDate[$date] = ($cashDeltaByDate[$date] ?? 0.0) + $delta;

            if ($type === 'DEPOSIT' && $mutation->reference_id === null) {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) + $amount;
            } elseif ($type === 'WITHDRAW' && $mutation->reference_id === null) {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) - $amount;
            } elseif ($type === 'ADJUSTMENT') {
                $externalFlowByDate[$date] = ($externalFlowByDate[$date] ?? 0.0) + $delta;
            }
        }

        $priceByDate = [];
        foreach ($openingPriceRows as $priceRow) {
            $lastKnownPrice[strtoupper((string) $priceRow->stock_code)] = (float) $priceRow->price;
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

        $lastKnownIhsg = $openingIhsgRow ? (float) $openingIhsgRow->close : 0.0;
        $previousNav = null;
        $previousIhsgClose = $lastKnownIhsg > 0 ? $lastKnownIhsg : null;
        $portfolioIndex = 100.0;
        $benchmarkIndex = 100.0;
        $benchmarkStartPrice = null;
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

            $netAssetValue = $marketValue + $cashBalance;
            $externalFlow = $externalFlowByDate[$dateKey] ?? 0.0;
            $portfolioDailyReturn = 0.0;
            if ($previousNav !== null && $previousNav > 0) {
                $portfolioDailyReturn = ($netAssetValue - $previousNav - $externalFlow) / $previousNav;
                $portfolioIndex *= (1 + $portfolioDailyReturn);
            }

            $benchmarkDailyReturn = 0.0;
            if ($lastKnownIhsg > 0 && $benchmarkStartPrice === null) {
                $benchmarkStartPrice = $lastKnownIhsg;
            }
            if ($previousIhsgClose !== null && $previousIhsgClose > 0 && $lastKnownIhsg > 0) {
                $benchmarkDailyReturn = ($lastKnownIhsg / $previousIhsgClose) - 1;
                $benchmarkIndex *= (1 + $benchmarkDailyReturn);
            }

            $series[] = [
                'date' => $dateKey,
                'portfolio_nav' => round($netAssetValue, 4),
                'market_value' => round($marketValue, 4),
                'cash_balance' => round($cashBalance, 4),
                'net_flow' => round($externalFlow, 4),
                'portfolio_daily_return' => round($portfolioDailyReturn * 100, 4),
                'portfolio_index' => round($portfolioIndex, 2),
                'benchmark_close' => round($lastKnownIhsg, 4),
                'benchmark_daily_return' => round($benchmarkDailyReturn * 100, 4),
                'benchmark_index' => round($benchmarkIndex, 2),
                // Compatibility aliases for current frontend/chart consumers.
                'portfolio' => round($portfolioIndex, 2),
                'ihsg' => round($benchmarkIndex, 2),
            ];

            $previousNav = $netAssetValue;
            if ($lastKnownIhsg > 0) {
                $previousIhsgClose = $lastKnownIhsg;
            }
        }

        $startNav = $series[0]['portfolio_nav'] ?? 0.0;
        $endNav = $series !== [] ? $series[array_key_last($series)]['portfolio_nav'] : 0.0;
        $portfolioReturnNominal = $endNav - $startNav;
        $portfolioReturnPercent = $startNav > 0 ? ($portfolioReturnNominal / $startNav) * 100 : 0.0;
        $benchmarkEndPrice = $series !== [] ? ($series[array_key_last($series)]['benchmark_close'] ?? 0.0) : 0.0;
        $benchmarkReturnPercent = ($benchmarkStartPrice !== null && $benchmarkStartPrice > 0 && $benchmarkEndPrice > 0)
            ? (($benchmarkEndPrice - $benchmarkStartPrice) / $benchmarkStartPrice) * 100
            : 0.0;
        $maxDrawdownPercent = $this->calculateMaxDrawdownPercent($series);

        return [
            'meta' => [
                'portfolio_id' => $portfolioId,
                'currency' => (string) ($portfolio->currency ?? 'IDR'),
                'benchmark' => 'IHSG',
                'method' => 'time_weighted_return',
                'base_index' => 100,
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
            'series' => $series,
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
}
