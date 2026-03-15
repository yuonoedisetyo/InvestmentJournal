<?php

namespace App\Http\Controllers;

use App\Services\DividendService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DividendController extends Controller
{
    public function __construct(private readonly DividendService $dividendService)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['required', 'integer'],
            'stock_code' => ['required', 'string', 'max:20'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'pay_date' => ['required', 'date'],
            'ex_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->dividendService->createManualDividend((int) $request->user()->id, $validated);
        return response()->json($result, 201);
    }
}
