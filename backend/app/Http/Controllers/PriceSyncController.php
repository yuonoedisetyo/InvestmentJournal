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
        $result = $this->priceSyncService->syncActivePortfolioStocksForUser($this->resolveUserId($request));
        return response()->json($result);
    }

    public function manualUpdate(Request $request): JsonResponse
    {
        if ($request->has('rows')) {
            $validated = $request->validate([
                'rows' => ['required', 'array', 'min:1'],
                'rows.*.stock_code' => ['required', 'string', 'max:20'],
                'rows.*.price' => ['required', 'numeric', 'gt:0'],
                'rows.*.price_date' => ['nullable', 'date'],
                'rows.*.source' => ['nullable', 'string', 'max:30'],
            ]);

            $result = $this->priceSyncService->manualUpsertPrices($validated['rows']);
            return response()->json($result);
        }

        $validated = $request->validate([
            'stock_code' => ['required', 'string', 'max:20'],
            'price' => ['required', 'numeric', 'gt:0'],
            'price_date' => ['nullable', 'date'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);

        $result = $this->priceSyncService->manualUpsertPrices([$validated]);
        return response()->json($result);
    }

    public function readSpreadsheet(Request $request): JsonResponse
    {
        if ($request->exists('spreadsheet_url') && blank($request->input('spreadsheet_url'))) {
            return response()->json([
                'rows' => [],
                'parsed' => 0,
                'upserted' => 0,
                'error' => 'Spreadsheet URL must not be empty.',
            ], 422);
        }

        $validated = $request->validate([
            'spreadsheet_url' => ['nullable', 'url'],
            'upsert' => ['nullable', 'boolean'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);

        $url = (string) ($validated['spreadsheet_url'] ?? config('investment.spreadsheet.default_url', ''));
        
        if ($url === '') {
            return response()->json([
                'rows' => [],
                'parsed' => 0,
                'upserted' => 0,
                'error' => 'Spreadsheet URL is required.',
            ], 422);
        }

        $result = $this->priceSyncService->readSpreadsheetPrices(
            $url,
            (bool) ($validated['upsert'] ?? false),
            (string) ($validated['source'] ?? 'SPREADSHEET')
        );

        return response()->json($result);
    }
}
