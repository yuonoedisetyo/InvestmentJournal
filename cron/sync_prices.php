<?php

declare(strict_types=1);

use App\Services\PriceSyncService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Shared hosting helper script.
// Usage:
//   php cron/sync_prices.php
//   php cron/sync_prices.php 1
// Without arguments it syncs all users who have holdings in active portfolios.
// With a user_id argument it syncs only that specific user.

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

$userIds = [];
$cliUserId = $argv[1] ?? null;

if ($cliUserId !== null && $cliUserId !== '') {
    $userIds = [(int) $cliUserId];
} else {
    $userIds = DB::table('portfolios as p')
        ->join('portfolio_positions as pp', 'pp.portfolio_id', '=', 'p.id')
        ->where('p.is_active', true)
        ->where('pp.total_shares', '>', 0)
        ->distinct()
        ->orderBy('p.user_id')
        ->pluck('p.user_id')
        ->map(static fn ($userId) => (int) $userId)
        ->all();
}

if ($userIds === []) {
    fwrite(STDOUT, "No users with active holdings found.\n");
    exit(0);
}

$hasFailure = false;

foreach ($userIds as $userId) {
    try {
        $result = $priceSyncService->syncActivePortfolioStocksForUser($userId);
        $symbols = implode(', ', $result['symbols'] ?? []);
        fwrite(
            STDOUT,
            sprintf(
                "User %d -> synced: %d, skipped: %d, symbols: %s\n",
                $userId,
                (int) ($result['synced'] ?? 0),
                (int) ($result['skipped'] ?? 0),
                $symbols !== '' ? $symbols : '-'
            )
        );
    } catch (Throwable $exception) {
        $hasFailure = true;
        fwrite(STDERR, sprintf("User %d -> error: %s\n", $userId, $exception->getMessage()));
    }
}

exit($hasFailure ? 1 : 0);
