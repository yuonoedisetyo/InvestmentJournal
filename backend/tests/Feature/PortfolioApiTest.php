<?php

namespace Tests\Feature;

use App\Models\CashMutation;
use App\Models\PortfolioPosition;
use App\Models\StockPrice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortfolioApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_portfolio_endpoints_require_authentication(): void
    {
        $this->getJson('/api/portfolios')->assertStatus(401);
        $this->postJson('/api/portfolios', ['name' => 'Nope'])->assertStatus(401);
    }

    public function test_it_can_create_list_activate_and_read_portfolio_summary_endpoints(): void
    {
        $user = User::factory()->create();
        $headers = $this->authHeaders($user);

        $first = $this->withHeaders($headers)->postJson('/api/portfolios', [
            'name' => 'Growth',
            'currency' => 'IDR',
            'initial_capital' => 1000000,
            'is_active' => true,
        ]);

        $second = $this->withHeaders($headers)->postJson('/api/portfolios', [
            'name' => 'Dividend',
            'currency' => 'IDR',
            'initial_capital' => 500000,
            'is_active' => false,
        ]);

        $first->assertCreated();
        $second->assertCreated();

        $firstId = $first->json('id');
        $secondId = $second->json('id');

        PortfolioPosition::query()->create([
            'portfolio_id' => $firstId,
            'stock_code' => 'BBCA',
            'total_shares' => 100,
            'average_price' => '9000.00000000',
            'invested_amount' => '900000.0000',
            'realized_pnl' => '10000.0000',
            'dividend_income' => '0.0000',
        ]);

        PortfolioPosition::query()->create([
            'portfolio_id' => $firstId,
            'stock_code' => 'TLKM',
            'total_shares' => 0,
            'average_price' => '3000.00000000',
            'invested_amount' => '0.0000',
            'realized_pnl' => '0.0000',
            'dividend_income' => '0.0000',
        ]);

        StockPrice::query()->create([
            'stock_code' => 'BBCA',
            'price' => '9500.0000',
            'price_date' => '2026-03-21',
            'source' => 'TEST',
        ]);

        CashMutation::query()->create([
            'user_id' => $user->id,
            'portfolio_id' => $firstId,
            'type' => CashMutation::TYPE_DEPOSIT,
            'amount' => '250000.0000',
            'description' => 'Seed topup',
            'created_at' => '2026-03-21 00:00:00',
            'updated_at' => now(),
        ]);

        $this->withHeaders($headers)->getJson('/api/portfolios')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'Growth');

        $this->withHeaders($headers)->patchJson("/api/portfolios/{$secondId}/activate")
            ->assertOk();

        $this->assertDatabaseHas('portfolios', [
            'id' => $firstId,
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('portfolios', [
            'id' => $secondId,
            'is_active' => true,
        ]);

        $this->withHeaders($headers)->getJson("/api/portfolios/{$firstId}/positions")
            ->assertOk()
            ->assertJsonPath('0.stock_code', 'BBCA')
            ->assertJsonPath('0.last_price', '9500.00000000')
            ->assertJsonCount(1);

        $this->withHeaders($headers)->getJson("/api/portfolios/{$firstId}/cash-balance")
            ->assertOk()
            ->assertJsonPath('cash_balance', '250000.0000');

        $this->withHeaders($headers)->getJson("/api/portfolios/{$firstId}/capital-summary")
            ->assertOk()
            ->assertJsonPath('cash_balance', '250000.0000')
            ->assertJsonPath('net_asset_value', '1200000.0000');

        $this->withHeaders($headers)->getJson("/api/portfolios/{$firstId}/performance")
            ->assertOk()
            ->assertJsonStructure([
                '*' => ['date', 'portfolio', 'ihsg', 'nav'],
            ]);
    }
}
