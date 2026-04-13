<?php

namespace App\Console;

use App\Jobs\SyncIhsgPricesJob;
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

        $schedule->job(new SyncIhsgPricesJob())
            ->dailyAt((string) config('investment.ihsg.auto_sync_time', '18:15'))
            ->timezone((string) config('investment.ihsg.auto_sync_timezone', 'Asia/Jakarta'))
            ->name('sync-ihsg-prices-daily');
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
