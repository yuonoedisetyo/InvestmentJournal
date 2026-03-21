<?php

namespace App\Console;

use App\Jobs\SyncSpreadsheetPricesJob;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        $schedule->job(new SyncSpreadsheetPricesJob())
            ->dailyAt((string) config('investment.spreadsheet.auto_sync_time', '18:00'))
            ->timezone((string) config('investment.spreadsheet.auto_sync_timezone', 'Asia/Jakarta'))
            ->name('sync-spreadsheet-prices-daily');
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
