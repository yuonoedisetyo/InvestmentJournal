<?php

namespace App\Http\Controllers;

use App\Services\CashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CashController extends Controller
{
    public function __construct(private readonly CashService $cashService)
    {
    }

    public function topup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $this->cashService->topup($this->resolveUserId($request), $validated);
        return response()->json($result, 201);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $this->cashService->withdraw($this->resolveUserId($request), $validated);
            return response()->json($result, 201);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function balance(Request $request, int $portfolio): JsonResponse
    {
        $result = $this->cashService->balance($this->resolveUserId($request), $portfolio);
        return response()->json($result);
    }

    public function update(Request $request, int $mutation): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'gt:0'],
            'transaction_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $this->cashService->updateMutation($this->resolveUserId($request), $mutation, $validated);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function destroy(Request $request, int $mutation): JsonResponse
    {
        try {
            $result = $this->cashService->deleteMutation($this->resolveUserId($request), $mutation);
            return response()->json($result);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
