<?php

namespace App\Http\Controllers;

use App\Services\DividendService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

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

        $result = $this->dividendService->createManualDividend($this->resolveUserId($request), $validated);
        return response()->json($result, 201);
    }

    public function update(Request $request, int $dividend): JsonResponse
    {
        $validated = $request->validate([
            'stock_code' => ['nullable', 'string', 'max:20'],
            'amount' => ['nullable', 'numeric', 'gt:0'],
            'pay_date' => ['nullable', 'date'],
            'ex_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->dividendService->updateManualDividend($this->resolveUserId($request), $dividend, $validated);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function destroy(Request $request, int $dividend): JsonResponse
    {
        try {
            $result = $this->dividendService->deleteManualDividend($this->resolveUserId($request), $dividend);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
