<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_master_stocks_for_authenticated_user(): void
    {
        DB::table('stocks')->insert([
            [
                'stock_code' => 'BBCA',
                'stock_name' => 'Bank Central Asia',
                'sector' => 'Banking',
                'exchange' => 'IDX',
                'currency' => 'IDR',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stock_code' => 'TLKM',
                'stock_name' => 'Telkom Indonesia',
                'sector' => 'Telecom',
                'exchange' => 'IDX',
                'currency' => 'IDR',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $headers = $this->authHeaders(User::factory()->create());

        $this->withHeaders($headers)->getJson('/api/master/stocks?q=BBC&limit=5')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.stock_code', 'BBCA');
    }
}
