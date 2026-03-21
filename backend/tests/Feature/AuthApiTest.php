<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_register_with_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Yedi',
            'identity' => 'yedi@example.com',
            'password' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'yedi@example.com')
            ->assertJsonPath('user.identity', 'yedi@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'yedi@example.com',
            'phone' => null,
        ]);
    }

    public function test_it_can_register_with_phone(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Yedi Phone',
            'identity' => '08123456789',
            'password' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.phone', '08123456789')
            ->assertJsonPath('user.identity', '08123456789');

        $this->assertDatabaseHas('users', [
            'email' => null,
            'phone' => '08123456789',
        ]);
    }

    public function test_it_rejects_duplicate_identity_on_register(): void
    {
        User::factory()->create([
            'email' => 'dup@example.com',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Duplicate',
            'identity' => 'dup@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['identity']);
    }

    public function test_it_can_login_and_fetch_authenticated_user(): void
    {
        User::factory()->create([
            'name' => 'Auth User',
            'email' => 'auth@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $login = $this->postJson('/api/auth/login', [
            'identity' => 'auth@example.com',
            'password' => 'secret123',
        ]);

        $token = $login->json('token');

        $login->assertOk()
            ->assertJsonPath('user.email', 'auth@example.com');

        $me = $this->withHeaders([
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/auth/me');

        $me->assertOk()
            ->assertJsonPath('user.name', 'Auth User')
            ->assertJsonPath('user.identity', 'auth@example.com');
    }

    public function test_it_can_logout_and_invalidate_the_token(): void
    {
        $user = User::factory()->create([
            'email' => 'logout@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $login = $this->postJson('/api/auth/login', [
            'identity' => 'logout@example.com',
            'password' => 'secret123',
        ]);

        $token = $login->json('token');

        $this->withHeaders([
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logout berhasil.');

        $this->assertNull($user->fresh()->api_token);

        $this->withHeaders([
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/auth/me')
            ->assertStatus(401);
    }
}
