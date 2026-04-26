<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DividendController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\PriceSyncController;
use App\Http\Controllers\CashController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/public/portfolios', [PortfolioController::class, 'publicIndex']);
Route::get('/public/portfolios/{shareToken}', [PortfolioController::class, 'publicShow']);

Route::middleware('auth.token')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/portfolios', [PortfolioController::class, 'index']);
    Route::post('/portfolios', [PortfolioController::class, 'store']);
    Route::patch('/portfolios/{portfolio}/activate', [PortfolioController::class, 'activate']);
    Route::patch('/portfolios/{portfolio}/sharing', [PortfolioController::class, 'updateSharing']);
    Route::get('/portfolios/{portfolio}/positions', [PortfolioController::class, 'positions']);
    Route::get('/portfolios/{portfolio}/cash-balance', [CashController::class, 'balance']);
    Route::get('/portfolios/{portfolio}/capital-summary', [PortfolioController::class, 'capitalSummary']);
    Route::get('/portfolios/{portfolio}/performance', [PortfolioController::class, 'performance']);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions/buy', [TransactionController::class, 'buy']);
    Route::post('/transactions/sell', [TransactionController::class, 'sell']);
    Route::patch('/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy']);
    Route::post('/cash/topup', [CashController::class, 'topup']);
    Route::post('/cash/withdraw', [CashController::class, 'withdraw']);
    Route::patch('/cash/mutations/{mutation}', [CashController::class, 'update']);
    Route::delete('/cash/mutations/{mutation}', [CashController::class, 'destroy']);

    Route::post('/dividends/manual', [DividendController::class, 'store']);
    Route::patch('/dividends/{dividend}', [DividendController::class, 'update']);
    Route::delete('/dividends/{dividend}', [DividendController::class, 'destroy']);

    Route::post('/prices/sync-active', [PriceSyncController::class, 'syncActive']);
    Route::post('/prices/manual', [PriceSyncController::class, 'manualUpdate']);
    Route::post('/prices/read-spreadsheet', [PriceSyncController::class, 'readSpreadsheet']);

    Route::get('/master/stocks', [StockController::class, 'index']);
});
