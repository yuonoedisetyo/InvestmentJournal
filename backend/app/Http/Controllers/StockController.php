<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $q = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 10);

        $stocks = Stock::query()
            ->where('is_active', true)
            ->when($q !== '', function ($query) use ($q): void {
                $query->where(function ($inner) use ($q): void {
                    $inner->where('stock_code', 'like', "%{$q}%")
                        ->orWhere('stock_name', 'like', "%{$q}%");
                });
            })
            ->orderBy('stock_code')
            ->limit($limit)
            ->get(['stock_code', 'stock_name', 'sector', 'exchange']);

        return response()->json($stocks);
    }
}
