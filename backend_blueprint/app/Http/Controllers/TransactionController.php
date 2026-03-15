<?php

namespace App\Http\Controllers;

use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class TransactionController extends Controller
{
    public function __construct(private readonly TransactionService $transactionService)
    {
    }

    public function buy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['required', 'integer'],
            'stock_code' => ['required', 'string', 'max:20'],
            'lot' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'gt:0'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->transactionService->buy((int) $request->user()->id, $validated);
        return response()->json($result, 201);
    }

    public function sell(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['required', 'integer'],
            'stock_code' => ['required', 'string', 'max:20'],
            'lot' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'gt:0'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->transactionService->sell((int) $request->user()->id, $validated);
            return response()->json($result, 201);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
