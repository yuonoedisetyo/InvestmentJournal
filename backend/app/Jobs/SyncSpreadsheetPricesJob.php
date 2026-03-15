<?php

namespace App\Jobs;

use App\Services\PriceSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncSpreadsheetPricesJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 120;

    public function handle(PriceSyncService $priceSyncService): void
    {
        $spreadsheetUrl = (string) config('investment.spreadsheet.default_url', '');
        if ($spreadsheetUrl === '') {
            Log::warning('Skip spreadsheet price sync: PRICE_SPREADSHEET_URL is empty.');
            return;
        }

        $source = (string) config('investment.spreadsheet.auto_sync_source', 'SPREADSHEET_AUTO');
        $result = $priceSyncService->readSpreadsheetPrices($spreadsheetUrl, true, $source);

        if (! empty($result['error'])) {
            Log::error('Spreadsheet price sync failed.', [
                'error' => $result['error'],
                'source_url' => $result['source_url'] ?? $spreadsheetUrl,
            ]);
            return;
        }

        Log::info('Spreadsheet price sync completed.', [
            'parsed' => $result['parsed'] ?? 0,
            'upserted' => $result['upserted'] ?? 0,
            'source_url' => $result['source_url'] ?? $spreadsheetUrl,
        ]);
    }
}
