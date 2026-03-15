<?php

namespace App\Services;

use App\Repositories\PortfolioRepository;
use App\Repositories\PriceRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class PriceSyncService
{
    public function __construct(
        private readonly PortfolioRepository $portfolioRepository,
        private readonly PriceRepository $priceRepository,
    ) {
    }

    public function syncActivePortfolioStocksForUser(int $userId): array
    {
        $provider = (string) config('investment.price_provider', 'alpha_vantage');
        $today = now()->toDateString();
        $symbols = $this->normalizedSymbols($this->portfolioRepository->activeHoldingStockCodesForUser($userId));
        if (empty($symbols)) {
            return ['synced' => 0, 'symbols' => [], 'skipped' => 0, 'reason' => 'no_active_symbols'];
        }

        $symbols = $this->filterSymbolsNotSyncedToday($provider, $symbols, $today);
        if (empty($symbols)) {
            return ['synced' => 0, 'symbols' => [], 'skipped' => 0, 'reason' => 'already_synced_today'];
        }

        $payload = $this->fetchFromProvider($provider, $symbols);
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
            Cache::put($this->symbolSyncedCacheKey($provider, $stockCode, $today), true, $this->secondsUntilEndOfDay());
            $synced++;
        }

        return ['synced' => $synced, 'symbols' => $symbols, 'skipped' => count($symbols) - $synced];
    }

    public function manualUpsertPrices(array $rows): array
    {
        $upserted = 0;
        $symbols = [];

        foreach ($rows as $row) {
            $stockCode = strtoupper((string) ($row['stock_code'] ?? ''));
            $price = (string) ($row['price'] ?? '0');
            $priceDate = $this->normalizeDateString((string) ($row['price_date'] ?? now()->toDateString()));
            $source = (string) ($row['source'] ?? 'MANUAL');

            if ($stockCode === '' || $price === '0') {
                continue;
            }

            $this->priceRepository->upsertDailyPrice($stockCode, $priceDate, $price, $source);
            $upserted++;
            $symbols[] = $stockCode;
        }

        return [
            'upserted' => $upserted,
            'symbols' => array_values(array_unique($symbols)),
        ];
    }

    public function readSpreadsheetPrices(string $spreadsheetUrl, bool $upsert = false, string $source = 'SPREADSHEET'): array
    {
        $csvUrl = $this->normalizeSpreadsheetUrl($spreadsheetUrl);
        try {
            $response = Http::timeout(20)->get($csvUrl);
        } catch (Throwable $exception) {
            return [
                'rows' => [],
                'parsed' => 0,
                'upserted' => 0,
                'source_url' => $csvUrl,
                'error' => $exception->getMessage(),
            ];
        }
        if (! $response->successful()) {
            return [
                'rows' => [],
                'parsed' => 0,
                'upserted' => 0,
                'source_url' => $csvUrl,
                'error' => 'Unable to fetch spreadsheet URL.',
            ];
        }

        $rows = $this->parseSpreadsheetCsv($response->body(), $source);
        if (! $upsert) {
            return [
                'rows' => $rows,
                'parsed' => count($rows),
                'upserted' => 0,
                'source_url' => $csvUrl,
            ];
        }

        $result = $this->manualUpsertPrices($rows);
        return [
            'rows' => $rows,
            'parsed' => count($rows),
            'upserted' => $result['upserted'] ?? 0,
            'symbols' => $result['symbols'] ?? [],
            'source_url' => $csvUrl,
        ];
    }

    private function fetchFromProvider(string $provider, array $symbols): array
    {
        if ($provider === 'custom_endpoint') {
            return $this->fetchFromCustomEndpoint($symbols);
        }

        return $this->fetchFromAlphaVantage($symbols);
    }

    private function fetchFromAlphaVantage(array $symbols): array
    {
        $apiKey = (string) config('investment.alpha_vantage.key', '');
        if ($apiKey === '') {
            return [];
        }

        $baseUrl = (string) config('investment.alpha_vantage.base_url', 'https://www.alphavantage.co/query');
        $suffix = (string) config('investment.alpha_vantage.symbol_suffix', '.JK');
        $intervalMs = (int) config('investment.alpha_vantage.request_interval_ms', 12000);
        $dailyLimit = (int) config('investment.alpha_vantage.daily_request_limit', 25);

        $rows = [];
        $count = count($symbols);
        foreach ($symbols as $index => $symbol) {
            if (! $this->tryConsumeDailyQuota('alpha_vantage', $dailyLimit)) {
                break;
            }

            $stockCode = strtoupper((string) $symbol);
            $providerSymbol = $stockCode.$suffix;

            $response = Http::timeout(20)->get($baseUrl, [
                'function' => 'GLOBAL_QUOTE',
                'symbol' => $providerSymbol,
                'apikey' => $apiKey,
            ]);

            if (! $response->successful()) {
                continue;
            }

            $json = $response->json();

            if (isset($json['Note'])) {
                // Rate-limit note from Alpha Vantage.
                break;
            }

            

            $quote = $json['Global Quote'] ?? null;
            if (! is_array($quote)) {
                continue;
            }

            $price = (string) ($quote['05. price'] ?? '0');
            $priceDate = (string) ($quote['07. latest trading day'] ?? now()->toDateString());
            if ($price === '' || $price === '0' || $price === '0.0000') {
                continue;
            }

            $rows[] = [
                'stock_code' => $stockCode,
                'price' => $price,
                'price_date' => $priceDate,
                'source' => 'ALPHA_VANTAGE',
            ];

            if ($intervalMs > 0 && $index < $count - 1) {
                usleep($intervalMs * 1000);
            }
        }

        return $rows;
    }

    private function fetchFromCustomEndpoint(array $symbols): array
    {
        $endpoint = (string) config('investment.price_sync_endpoint');
        if ($endpoint === '') {
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

    private function parseSpreadsheetCsv(string $content, string $source): array
    {
        $lines = preg_split('/\r\n|\n|\r/', trim($content)) ?: [];
        if (count($lines) < 2) {
            return [];
        }

        $header = str_getcsv((string) array_shift($lines));
        $normalizedHeader = array_map(
            fn ($value) => strtolower(trim((string) $value)),
            $header
        );

        $stockIndex = $this->findHeaderIndex($normalizedHeader, ['stock_code', 'kode_emiten', 'kode', 'symbol', 'ticker']);
        $priceIndex = $this->findHeaderIndex($normalizedHeader, ['price', 'harga', 'harga_sekarang', 'last_price']);
        $priceDateIndex = $this->findHeaderIndex($normalizedHeader, ['price_date', 'tanggal', 'date']);

        if ($stockIndex === null || $priceIndex === null) {
            return [];
        }

        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $columns = str_getcsv($line);
            $stockCode = strtoupper(trim((string) ($columns[$stockIndex] ?? '')));
            $priceRaw = trim((string) ($columns[$priceIndex] ?? '0'));
            $price = str_replace(',', '.', preg_replace('/[^\d,.\-]/', '', $priceRaw) ?? '0');
            $priceDate = $priceDateIndex !== null ? trim((string) ($columns[$priceDateIndex] ?? '')) : '';

            if ($stockCode === '' || $price === '' || ! is_numeric($price) || (float) $price <= 0) {
                continue;
            }

            $rows[] = [
                'stock_code' => $stockCode,
                'price' => (string) $price,
                'price_date' => $this->normalizeDateString($priceDate),
                'source' => $source,
            ];
        }

        return $rows;
    }

    private function findHeaderIndex(array $header, array $aliases): ?int
    {
        foreach ($aliases as $alias) {
            $index = array_search($alias, $header, true);
            if ($index !== false) {
                return (int) $index;
            }
        }

        return null;
    }

    private function normalizeSpreadsheetUrl(string $url): string
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return '';
        }

        // Convert Google Sheets edit URL to CSV export URL.
        if (preg_match('#https://docs\.google\.com/spreadsheets/d/([^/]+)/?.*#', $trimmed, $matches)) {
            $sheetId = $matches[1];
            $gid = '0';
            if (preg_match('/[?&]gid=(\d+)/', $trimmed, $gidMatch)) {
                $gid = $gidMatch[1];
            }
            return "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&gid={$gid}";
        }

        return $trimmed;
    }

    private function normalizeDateString(?string $date): string
    {
        if (! $date) {
            return now()->toDateString();
        }

        try {
            return Carbon::parse($date)->toDateString();
        } catch (Throwable) {
            return now()->toDateString();
        }
    }

    private function normalizedSymbols(array $symbols): array
    {
        return array_values(array_unique(array_map(
            fn ($symbol) => strtoupper((string) $symbol),
            $symbols
        )));
    }

    private function filterSymbolsNotSyncedToday(string $provider, array $symbols, string $today): array
    {
        $alreadyInDatabase = $this->priceRepository->symbolsWithPriceOnDate($symbols, $today);
        $alreadySet = array_flip($alreadyInDatabase);

        return array_values(array_filter($symbols, function (string $symbol) use ($provider, $today, $alreadySet): bool {
            if (isset($alreadySet[$symbol])) {
                return false;
            }

            return ! Cache::has($this->symbolSyncedCacheKey($provider, $symbol, $today));
        }));
    }

    private function tryConsumeDailyQuota(string $provider, int $dailyLimit): bool
    {
        if ($dailyLimit <= 0) {
            return true;
        }

        $key = $this->dailyQuotaCacheKey($provider);
        $ttl = $this->secondsUntilEndOfDay();
        Cache::add($key, 0, $ttl);

        $nextCount = Cache::increment($key);
        if ($nextCount > $dailyLimit) {
            Cache::decrement($key);
            return false;
        }

        return true;
    }

    private function dailyQuotaCacheKey(string $provider): string
    {
        return sprintf('price_sync:quota:%s:%s', $provider, now()->format('Y-m-d'));
    }

    private function symbolSyncedCacheKey(string $provider, string $stockCode, string $date): string
    {
        return sprintf('price_sync:synced:%s:%s:%s', $provider, $stockCode, $date);
    }

    private function secondsUntilEndOfDay(): int
    {
        return max(60, now()->diffInSeconds(Carbon::tomorrow(), false));
    }
}
