<?php

namespace App\Repositories;

use App\Models\Dividend;

class DividendRepository
{
    public function create(array $payload): Dividend
    {
        return Dividend::query()->create($payload);
    }
}
