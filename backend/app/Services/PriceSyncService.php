<?php

namespace App\Services;

use App\Repositories\PortfolioRepository;
use App\Repositories\PriceRepository;
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
        $symbols = $this->normalizedSymbols($this->portfolioRepository->activeHoldingStockCodesForUser($userId));
        if (empty($symbols)) {
            return ['synced' => 0, 'symbols' => [], 'skipped' => 0, 'reason' => 'no_active_symbols'];
        }

        $spreadsheetUrl = (string) config('investment.spreadsheet.default_url', '');
        if ($spreadsheetUrl === '') {
            return ['synced' => 0, 'symbols' => $symbols, 'skipped' => count($symbols), 'reason' => 'spreadsheet_url_empty'];
        }

        $source = (string) config('investment.spreadsheet.auto_sync_source', 'SPREADSHEET_AUTO');
        $result = $this->readSpreadsheetPrices($spreadsheetUrl, false, $source);
        if (! empty($result['error'])) {
            return [
                'synced' => 0,
                'symbols' => $symbols,
                'skipped' => count($symbols),
                'reason' => 'spreadsheet_fetch_failed',
                'error' => $result['error'],
            ];
        }

        $payload = $this->filterRowsBySymbols($result['rows'] ?? [], $symbols);
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

    private function filterRowsBySymbols(array $rows, array $symbols): array
    {
        $allowed = array_flip($this->normalizedSymbols($symbols));

        return array_values(array_filter($rows, function (array $row) use ($allowed): bool {
            $stockCode = strtoupper((string) ($row['stock_code'] ?? ''));
            return $stockCode !== '' && isset($allowed[$stockCode]);
        }));
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

}
