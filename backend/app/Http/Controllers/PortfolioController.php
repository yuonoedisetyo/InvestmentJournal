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
        return response()->json($this->portfolioService->listByUser($this->resolveUserId($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:10'],
            'initial_capital' => ['nullable', 'numeric', 'min:0'],
            'performance_cutoff_date' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $portfolio = $this->portfolioService->create($this->resolveUserId($request), $validated);
        return response()->json($portfolio, 201);
    }

    public function activate(Request $request, int $portfolio): JsonResponse
    {
        $this->portfolioService->activatePortfolio($this->resolveUserId($request), $portfolio);
        return response()->json(['message' => 'Portfolio activated']);
    }

    public function positions(Request $request, int $portfolio): JsonResponse
    {
        $data = $this->portfolioService->listPositions($this->resolveUserId($request), $portfolio);
        return response()->json($data);
    }

    public function capitalSummary(Request $request, int $portfolio): JsonResponse
    {
        $data = $this->portfolioService->capitalSummary($this->resolveUserId($request), $portfolio);
        return response()->json($data);
    }

    public function performance(Request $request, int $portfolio): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:7', 'max:3650'],
        ]);

        $days = (int) ($validated['days'] ?? 120);
        $data = $this->portfolioService->performanceSeries($this->resolveUserId($request), $portfolio, $days);

        return response()->json($data);
    }
}
