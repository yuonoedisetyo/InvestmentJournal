<?php

namespace App\Jobs;

use App\Services\PriceSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncIhsgPricesJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 120;

    public function handle(PriceSyncService $priceSyncService): void
    {
        $sourcePath = trim((string) config('investment.ihsg.source_path', ''));
        $sourceUrl = trim((string) config('investment.ihsg.source_url', ''));
        $source = $sourcePath !== '' ? $sourcePath : $sourceUrl;

        if ($source === '') {
            Log::warning('Skip IHSG sync: IHSG source is empty.');
            return;
        }

        $result = $priceSyncService->syncIhsgFromConfiguredSource();

        if (! empty($result['error'])) {
            Log::error('IHSG price sync failed.', [
                'error' => $result['error'],
                'source_url' => $result['source_url'] ?? $source,
            ]);
            return;
        }

        Log::info('IHSG price sync completed.', [
            'parsed' => $result['parsed'] ?? 0,
            'upserted' => $result['upserted'] ?? 0,
            'source_url' => $result['source_url'] ?? $source,
        ]);
    }
}
