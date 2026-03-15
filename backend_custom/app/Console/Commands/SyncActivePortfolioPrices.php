<?php

namespace App\Console\Commands;

use App\Services\PriceSyncService;
use Illuminate\Console\Command;

class SyncActivePortfolioPrices extends Command
{
    protected $signature = 'prices:sync-active {user_id : Owner user id to sync active portfolios}';
    protected $description = 'Sync stock prices only for stocks held in active portfolios.';

    public function __construct(private readonly PriceSyncService $priceSyncService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $userId = (int) $this->argument('user_id');
        $result = $this->priceSyncService->syncActivePortfolioStocksForUser($userId);

        $this->info('Synced rows: '.$result['synced']);
        $this->line('Symbols: '.implode(', ', $result['symbols']));

        return self::SUCCESS;
    }
}
