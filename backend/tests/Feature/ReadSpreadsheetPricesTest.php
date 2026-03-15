<?php

namespace Tests\Feature;

use App\Models\StockPrice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReadSpreadsheetPricesTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_422_when_spreadsheet_url_is_missing(): void
    {
        config(['investment.spreadsheet.default_url' => null]);

        $response = $this->postJson('/api/prices/read-spreadsheet', []);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Spreadsheet URL is required.');
    }

    public function test_it_returns_422_when_spreadsheet_url_is_explicitly_empty(): void
    {
        config(['investment.spreadsheet.default_url' => 'https://example.com/default.csv']);

        $response = $this->postJson('/api/prices/read-spreadsheet', [
            'spreadsheet_url' => '',
            'upsert' => true,
            'source' => 'SPREADSHEET',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Spreadsheet URL must not be empty.');
    }

    public function test_it_reads_spreadsheet_rows_without_upsert(): void
    {
        Http::fake([
            'https://example.com/prices.csv' => Http::response(
                "stock_code,price,price_date\nBBCA,9325.5,2026-03-11\nTLKM,4010,\n",
                200
            ),
        ]);

        $response = $this->postJson('/api/prices/read-spreadsheet', [
            'spreadsheet_url' => 'https://example.com/prices.csv',
            'upsert' => false,
            'source' => 'SPREADSHEET_TEST',
        ]);

        $response->assertOk()
            ->assertJsonPath('parsed', 2)
            ->assertJsonPath('upserted', 0);

        $this->assertDatabaseCount('stock_prices', 0);
    }

    public function test_it_can_upsert_rows_from_spreadsheet(): void
    {
        Http::fake([
            'https://example.com/prices.csv' => Http::response(
                "kode_emiten,harga,tanggal\nBBCA,9400.25,2026-03-11\nTLKM,4025.75,2026-03-11\n",
                200
            ),
        ]);

        $response = $this->postJson('/api/prices/read-spreadsheet', [
            'spreadsheet_url' => 'https://example.com/prices.csv',
            'upsert' => true,
            'source' => 'SPREADSHEET_TEST',
        ]);

        $response->assertOk()
            ->assertJsonPath('parsed', 2)
            ->assertJsonPath('upserted', 2);

        $this->assertTrue(StockPrice::query()
            ->where('stock_code', 'BBCA')
            ->whereDate('price_date', '2026-03-11')
            ->where('source', 'SPREADSHEET_TEST')
            ->exists());
        $this->assertTrue(StockPrice::query()
            ->where('stock_code', 'TLKM')
            ->whereDate('price_date', '2026-03-11')
            ->where('source', 'SPREADSHEET_TEST')
            ->exists());

        $this->assertSame(2, StockPrice::query()->count());
    }

    public function test_it_handles_connection_exception_without_500(): void
    {
        Http::fake(function () {
            throw new \RuntimeException('Connection failed');
        });

        $response = $this->postJson('/api/prices/read-spreadsheet', [
            'spreadsheet_url' => 'https://example.com/prices.csv',
            'upsert' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('parsed', 0)
            ->assertJsonPath('upserted', 0);

        $this->assertDatabaseCount('stock_prices', 0);
    }

    public function test_it_upserts_existing_same_date_row_without_unique_error(): void
    {
        StockPrice::query()->create([
            'stock_code' => 'SMDR',
            'price' => '300.0000',
            'price_date' => '2026-03-10 00:00:00',
            'source' => 'OLD',
        ]);

        Http::fake([
            'https://example.com/prices.csv' => Http::response(
                "stock_code,price,price_date\nSMDR,362.00,2026-03-10\n",
                200
            ),
        ]);

        $response = $this->postJson('/api/prices/read-spreadsheet', [
            'spreadsheet_url' => 'https://example.com/prices.csv',
            'upsert' => true,
            'source' => 'SPREADSHEET',
        ]);

        $response->assertOk()
            ->assertJsonPath('upserted', 1);

        $this->assertSame(1, StockPrice::query()->where('stock_code', 'SMDR')->count());
    }
}
