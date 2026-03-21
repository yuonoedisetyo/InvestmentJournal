<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_buy_sell_update_delete_and_list_transactions(): void
    {
        $user = User::factory()->create();
        $portfolio = $this->createPortfolio($user);
        $headers = $this->authHeaders($user);

        $buy = $this->withHeaders($headers)->postJson('/api/transactions/buy', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'bbca',
            'lot' => 2,
            'price' => 9000,
            'fee' => 1000,
            'transaction_date' => '2026-03-21',
            'notes' => 'First buy',
        ]);

        $buyId = $buy->json('transaction_id');

        $buy->assertCreated()
            ->assertJsonPath('position.stock_code', 'BBCA')
            ->assertJsonPath('position.total_shares', 200);

        $sell = $this->withHeaders($headers)->postJson('/api/transactions/sell', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'BBCA',
            'lot' => 1,
            'price' => 9500,
            'fee' => 500,
            'transaction_date' => '2026-03-22',
            'notes' => 'Partial sell',
        ]);

        $sellId = $sell->json('transaction_id');

        $sell->assertCreated()
            ->assertJsonPath('position.total_shares', 100);

        $this->withHeaders($headers)->patchJson("/api/transactions/{$buyId}", [
            'lot' => 3,
            'price' => 8800,
            'fee' => 1200,
            'notes' => 'Updated buy',
        ])->assertOk()
            ->assertJsonPath('position.total_shares', 200);

        $this->withHeaders($headers)->getJson('/api/transactions?portfolio_id='.$portfolio->id)
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.entry_type', 'STOCK');

        $this->withHeaders($headers)->deleteJson("/api/transactions/{$sellId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('stock_transactions', [
            'id' => $sellId,
        ]);
    }

    public function test_it_rejects_sell_when_quantity_exceeds_position(): void
    {
        $user = User::factory()->create();
        $portfolio = $this->createPortfolio($user);
        $headers = $this->authHeaders($user);

        $this->withHeaders($headers)->postJson('/api/transactions/buy', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'TLKM',
            'lot' => 1,
            'price' => 3000,
            'fee' => 0,
            'transaction_date' => '2026-03-21',
        ])->assertCreated();

        $this->withHeaders($headers)->postJson('/api/transactions/sell', [
            'portfolio_id' => $portfolio->id,
            'stock_code' => 'TLKM',
            'lot' => 2,
            'price' => 3200,
            'fee' => 0,
            'transaction_date' => '2026-03-22',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Sell quantity exceeds available shares.');
    }
}
