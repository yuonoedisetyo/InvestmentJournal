<?php

use App\Http\Controllers\DividendController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\PriceSyncController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/portfolios', [PortfolioController::class, 'index']);
    Route::post('/portfolios', [PortfolioController::class, 'store']);
    Route::patch('/portfolios/{portfolio}/activate', [PortfolioController::class, 'activate']);

    Route::post('/transactions/buy', [TransactionController::class, 'buy']);
    Route::post('/transactions/sell', [TransactionController::class, 'sell']);

    Route::post('/dividends/manual', [DividendController::class, 'store']);

    Route::post('/prices/sync-active', [PriceSyncController::class, 'syncActive']);
});
