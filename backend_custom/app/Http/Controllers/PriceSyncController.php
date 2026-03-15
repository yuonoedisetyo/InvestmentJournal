<?php

namespace App\Http\Controllers;

use App\Services\PriceSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PriceSyncController extends Controller
{
    public function __construct(private readonly PriceSyncService $priceSyncService)
    {
    }

    public function syncActive(Request $request): JsonResponse
    {
        $result = $this->priceSyncService->syncActivePortfolioStocksForUser((int) $request->user()->id);
        return response()->json($result);
    }
}
