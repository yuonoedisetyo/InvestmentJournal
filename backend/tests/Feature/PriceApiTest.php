<?php

namespace Tests\Feature;

use App\Models\CashMutation;
use App\Models\PortfolioPosition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PriceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_manually_upsert_single_and_multiple_prices(): void
    {
        $headers = $this->authHeaders();

        $this->withHeaders($headers)->postJson('/api/prices/manual', [
            'stock_code' => 'BBCA',
            'price' => 9500,
            'price_date' => '2026-03-21',
            'source' => 'MANUAL',
        ])->assertOk()
            ->assertJsonPath('upserted', 1);

        $this->withHeaders($headers)->postJson('/api/prices/manual', [
            'rows' => [
                [
                    'stock_code' => 'TLKM',
                    'price' => 3100,
                    'price_date' => '2026-03-21',
                    'source' => 'BULK',
                ],
                [
                    'stock_code' => 'ASII',
                    'price' => 5200,
                    'price_date' => '2026-03-21',
                    'source' => 'BULK',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('upserted', 2);

        $this->assertDatabaseHas('stock_prices', [
            'stock_code' => 'BBCA',
            'price_date' => '2026-03-21',
        ]);
        $this->assertDatabaseCount('stock_prices', 3);
    }

    public function test_it_can_sync_active_prices_from_custom_endpoint(): void
    {
        config(['investment.spreadsheet.default_url' => 'https://example.com/prices.csv']);
        config(['investment.spreadsheet.auto_sync_source' => 'SPREADSHEET_AUTO']);

        $user = User::factory()->create();
        $portfolio = $this->createPortfolio($user);
        $headers = $this->authHeaders($user);

        PortfolioPosition::query()->create([
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'BBCA',
            'total_shares' => 100,
            'average_price' => '9000.00000000',
            'invested_amount' => '900000.0000',
            'realized_pnl' => '0.0000',
            'dividend_income' => '0.0000',
        ]);

        Http::fake([
            'https://example.com/prices.csv' => Http::response(
                "stock_code,price,price_date\nBBCA,9325.0000,2026-03-21\nTLKM,4010.0000,2026-03-21\n",
                200
            ),
        ]);

        $this->withHeaders($headers)->postJson('/api/prices/sync-active')
            ->assertOk()
            ->assertJsonPath('synced', 1);

        $this->assertDatabaseHas('stock_prices', [
            'stock_code' => 'BBCA',
            'source' => 'SPREADSHEET_AUTO',
        ]);
    }
}
