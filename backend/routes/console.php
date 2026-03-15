<?php

use App\Jobs\SyncSpreadsheetPricesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new SyncSpreadsheetPricesJob())
    ->dailyAt((string) config('investment.spreadsheet.auto_sync_time', '18:00'))
    ->timezone((string) config('investment.spreadsheet.auto_sync_timezone', 'Asia/Jakarta'))
    ->name('sync-spreadsheet-prices-daily');
