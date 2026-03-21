<?php

namespace Tests\Feature;

use App\Models\CashMutation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_topup_withdraw_update_and_delete_cash_mutations(): void
    {
        $user = User::factory()->create();
        $portfolio = $this->createPortfolio($user);
        $headers = $this->authHeaders($user);

        $topup = $this->withHeaders($headers)->postJson('/api/cash/topup', [
            'portfolio_id' => $portfolio->id,
            'amount' => 500000,
            'transaction_date' => '2026-03-21',
            'notes' => 'Initial topup',
        ]);

        $topupId = $topup->json('cash_mutation_id');

        $topup->assertCreated()
            ->assertJsonPath('cash_balance', '500000.0000');

        $withdraw = $this->withHeaders($headers)->postJson('/api/cash/withdraw', [
            'portfolio_id' => $portfolio->id,
            'amount' => 150000,
            'transaction_date' => '2026-03-21',
            'notes' => 'Withdraw',
        ]);

        $withdrawId = $withdraw->json('cash_mutation_id');

        $withdraw->assertCreated()
            ->assertJsonPath('cash_balance', '350000.0000');

        $this->withHeaders($headers)->patchJson("/api/cash/mutations/{$withdrawId}", [
            'amount' => 120000,
            'notes' => 'Updated withdraw',
        ])->assertOk()
            ->assertJsonPath('cash_balance', '380000.0000');

        $this->withHeaders($headers)->deleteJson("/api/cash/mutations/{$topupId}")
            ->assertStatus(422);

        $this->withHeaders($headers)->deleteJson("/api/cash/mutations/{$withdrawId}")
            ->assertOk()
            ->assertJsonPath('cash_balance', '500000.0000');

        $this->assertDatabaseHas('cash_mutations', [
            'id' => $topupId,
        ]);
        $this->assertDatabaseMissing('cash_mutations', [
            'id' => $withdrawId,
        ]);
    }

    public function test_it_rejects_withdraw_when_balance_is_insufficient(): void
    {
        $user = User::factory()->create();
        $portfolio = $this->createPortfolio($user);
        $headers = $this->authHeaders($user);

        CashMutation::query()->create([
            'user_id' => $user->id,
            'portfolio_id' => $portfolio->id,
            'type' => CashMutation::TYPE_DEPOSIT,
            'amount' => '100000.0000',
            'description' => 'Seed',
            'created_at' => '2026-03-21 00:00:00',
            'updated_at' => now(),
        ]);

        $this->withHeaders($headers)->postJson('/api/cash/withdraw', [
            'portfolio_id' => $portfolio->id,
            'amount' => 150000,
            'transaction_date' => '2026-03-21',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Saldo cash tidak cukup untuk withdraw.');
    }
}
