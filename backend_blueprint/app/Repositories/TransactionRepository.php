<?php

namespace App\Repositories;

use App\Models\StockTransaction;

class TransactionRepository
{
    public function create(array $payload): StockTransaction
    {
        return StockTransaction::query()->create($payload);
    }
}
