<?php

namespace App\Repositories;

use App\Models\CashMutation;

class CashMutationRepository
{
    public function create(array $payload): CashMutation
    {
        return CashMutation::query()->create($payload);
    }
}
