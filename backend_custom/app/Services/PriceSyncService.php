<?php

namespace App\Services;

use App\Repositories\PortfolioRepository;
use App\Repositories\PriceRepository;
use Illuminate\Support\Facades\Http;

class PriceSyncService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly PriceRepository $priceRepository,
    ) {
    }

    public function syncActivePortfolioStocksForUser(int $userId): array
    {
        $symbols = $this->portfolioRepository->activeHoldingStockCodesForUser($userId);
        if (empty($symbols)) {
            return ['synced' => 0, 'symbols' => []];
        }

        $payload = $this->fetchFromProvider($symbols);
        $synced = 0;

        foreach ($payload as $row) {
            $stockCode = strtoupper((string) ($row['stock_code'] ?? ''));
            $price = (string) ($row['price'] ?? '0');
            $priceDate = (string) ($row['price_date'] ?? now()->toDateString());
            $source = (string) ($row['source'] ?? 'CUSTOM_API');

            if ($stockCode === '' || $price === '0') {
                continue;
            }

            $this->priceRepository->upsertDailyPrice($stockCode, $priceDate, $price, $source);
            $synced++;
        }

        return ['synced' => $synced, 'symbols' => $symbols];
    }

    private function fetchFromProvider(array $symbols): array
    {
        $endpoint = config('investment.price_sync_endpoint');
        if (! $endpoint) {
            return [];
        }

        $response = Http::timeout(15)->get($endpoint, [
            'symbols' => implode(',', $symbols),
        ]);

        if (! $response->successful()) {
            return [];
        }

        $json = $response->json();
        return is_array($json['data'] ?? null) ? $json['data'] : [];
    }
}
