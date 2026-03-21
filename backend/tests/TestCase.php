<?php

namespace Tests;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function authHeaders(?User $user = null): array
    {
        $user ??= User::factory()->create();

        $plainTextToken = Str::random(80);
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
        ])->save();

        return [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$plainTextToken,
        ];
    }

    protected function createPortfolio(User $user, array $attributes = []): Portfolio
    {
        return Portfolio::query()->create(array_merge([
            'user_id' => $user->id,
            'name' => 'Primary Portfolio',
            'currency' => 'IDR',
            'initial_capital' => '0.0000',
            'is_active' => true,
        ], $attributes));
    }
}
