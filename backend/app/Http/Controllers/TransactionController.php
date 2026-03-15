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

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['nullable', 'integer'],
        ]);

        $result = $this->transactionService->listJournal(
            $this->resolveUserId($request),
            isset($validated['portfolio_id']) ? (int) $validated['portfolio_id'] : null
        );

        return response()->json($result);
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

        $result = $this->transactionService->buy($this->resolveUserId($request), $validated);
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
            $result = $this->transactionService->sell($this->resolveUserId($request), $validated);
            return response()->json($result, 201);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function update(Request $request, int $transaction): JsonResponse
    {
        $validated = $request->validate([
            'lot' => ['nullable', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'gt:0'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'transaction_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->transactionService->updateJournal($this->resolveUserId($request), $transaction, $validated);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function destroy(Request $request, int $transaction): JsonResponse
    {
        try {
            $result = $this->transactionService->deleteJournal($this->resolveUserId($request), $transaction);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
