<?php

declare(strict_types=1);

use App\Services\PriceSyncService;
use Illuminate\Contracts\Console\Kernel;

// Shared hosting helper script.
// Usage:
//   php cron/sync_ihsg.php
//
// Source priority:
// 1. IHSG_SOURCE_PATH -> local CSV file path
// 2. IHSG_SOURCE_URL  -> remote CSV / Google Sheet URL
//
// Expected CSV headers:
//   price_date,close
// or
//   date,ihsg

$projectRoot = dirname(__DIR__);
$backendRoot = $projectRoot.'/backend';
$artisan = $backendRoot.'/artisan';

if (! file_exists($artisan)) {
    fwrite(STDERR, "artisan file not found at {$artisan}.\n");
    exit(1);
}

require $backendRoot.'/vendor/autoload.php';

$app = require_once $backendRoot.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

/** @var PriceSyncService $priceSyncService */
$priceSyncService = $app->make(PriceSyncService::class);

$result = $priceSyncService->syncIhsgFromConfiguredSource();

if (! empty($result['error'])) {
    fwrite(STDERR, sprintf(
        "IHSG sync error: %s (source: %s)\n",
        $result['error'],
        (string) ($result['source_url'] ?? '-')
    ));
    exit(1);
}

fwrite(STDOUT, sprintf(
    "IHSG synced -> parsed: %d, upserted: %d, source: %s\n",
    (int) ($result['parsed'] ?? 0),
    (int) ($result['upserted'] ?? 0),
    (string) ($result['source_url'] ?? '-')
));

exit(0);
