<?php

// Shared hosting helper script.
// Usage:
//   php cron/sync_prices.php 1
// It executes: php artisan prices:sync-active {user_id}

$userId = $argv[1] ?? null;
if (! $userId) {
    fwrite(STDERR, "Usage: php cron/sync_prices.php <user_id>\n");
    exit(1);
}

$projectRoot = dirname(__DIR__);
$artisan = $projectRoot.'/backend/artisan';

if (! file_exists($artisan)) {
    fwrite(STDERR, "artisan file not found at {$artisan}.\n");
    exit(1);
}

$cmd = sprintf('php %s prices:sync-active %d', escapeshellarg($artisan), (int) $userId);
passthru($cmd, $exitCode);
exit($exitCode);
