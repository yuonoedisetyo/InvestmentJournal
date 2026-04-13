<?php

namespace App\Repositories;

use App\Models\IhsgPrice;
use App\Models\StockPrice;
use Illuminate\Support\Carbon;
use Throwable;

class PriceRepository
{
    public function upsertDailyPrice(string $stockCode, string $priceDate, string $price, string $source): void
    {
        $normalizedDate = $this->normalizeDate($priceDate);

        $existing = StockPrice::query()
            ->where('stock_code', strtoupper($stockCode))
            ->whereDate('price_date', $normalizedDate)
            ->first();

        if ($existing) {
            $existing->price = $price;
            $existing->source = $source;
            $existing->price_date = $normalizedDate;
            $existing->save();
            return;
        }

        StockPrice::query()->create([
            'stock_code' => strtoupper($stockCode),
            'price_date' => $normalizedDate,
            'price' => $price,
            'source' => $source,
        ]);
    }

    public function symbolsWithPriceOnDate(array $symbols, string $priceDate): array
    {
        if (empty($symbols)) {
            return [];
        }

        return StockPrice::query()
            ->whereIn('stock_code', $symbols)
            ->where('price_date', $priceDate)
            ->pluck('stock_code')
            ->map(fn ($value) => strtoupper((string) $value))
            ->all();
    }

    public function upsertIhsgPrice(string $priceDate, string $close, string $source): void
    {
        $normalizedDate = $this->normalizeDate($priceDate);

        $existing = IhsgPrice::query()
            ->whereDate('price_date', $normalizedDate)
            ->first();

        if ($existing) {
            $existing->close = $close;
            $existing->source = $source;
            $existing->price_date = $normalizedDate;
            $existing->save();
            return;
        }

        IhsgPrice::query()->create([
            'price_date' => $normalizedDate,
            'close' => $close,
            'source' => $source,
        ]);
    }

    private function normalizeDate(string $value): string
    {
        try {
            return Carbon::parse($value)->toDateString();
        } catch (Throwable) {
            return now()->toDateString();
        }
    }
}
