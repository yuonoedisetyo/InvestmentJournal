<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Shared hosting friendly: run by cron every 10 minutes without queues.
        // Example cron: */10 * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
        // Then define one scheduled command per user, or call command directly from crontab.
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
