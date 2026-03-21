<?php

namespace Tests\Feature;

use App\Models\CashMutation;
use App\Models\PortfolioPosition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DividendApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_create_update_and_delete_manual_dividend(): void
    {
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

        $create = $this->withHeaders($headers)->postJson('/api/dividends/manual', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'bbca',
            'amount' => 75000,
            'pay_date' => '2026-03-21',
            'notes' => 'Manual dividend',
        ]);

        $dividendId = $create->json('dividend_id');

        $create->assertCreated();

        $this->assertDatabaseHas('cash_mutations', [
            'portfolio_id' => $portfolio->id,
            'type' => CashMutation::TYPE_DIVIDEND,
            'reference_id' => $dividendId,
        ]);

        $this->assertDatabaseHas('portfolio_positions', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'BBCA',
            'dividend_income' => '75000.0000',
        ]);

        $this->withHeaders($headers)->patchJson("/api/dividends/{$dividendId}", [
            'amount' => 50000,
            'notes' => 'Updated dividend',
        ])->assertOk();

        $this->assertDatabaseHas('portfolio_positions', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'BBCA',
            'dividend_income' => '50000.0000',
        ]);

        $this->withHeaders($headers)->deleteJson("/api/dividends/{$dividendId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('dividends', [
            'id' => $dividendId,
        ]);
    }
}
