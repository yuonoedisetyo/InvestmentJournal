<?php

namespace App\Http\Controllers;

use App\Services\PortfolioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    public function __construct(private readonly PortfolioService $portfolioService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->portfolioService->listByUser((int) $request->user()->id));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:10'],
            'initial_capital' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $portfolio = $this->portfolioService->create((int) $request->user()->id, $validated);
        return response()->json($portfolio, 201);
    }

    public function activate(Request $request, int $portfolio): JsonResponse
    {
        $this->portfolioService->activatePortfolio((int) $request->user()->id, $portfolio);
        return response()->json(['message' => 'Portfolio activated']);
    }
}
