<?php

namespace App\Repositories;

use App\Models\StockPrice;

class PriceRepository
{
    public function upsertDailyPrice(string $stockCode, string $priceDate, string $price, string $source): void
    {
        StockPrice::query()->updateOrCreate(
            [
                'stock_code' => $stockCode,
                'price_date' => $priceDate,
            ],
            [
                'price' => $price,
                'source' => $source,
            ]
        );
    }
}
