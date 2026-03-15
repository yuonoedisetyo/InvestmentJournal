<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portfolio_positions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->string('stock_code', 20);
            $table->unsignedBigInteger('total_shares')->default(0);
            $table->decimal('average_price', 20, 8)->default(0);
            $table->decimal('invested_amount', 20, 4)->default(0);
            $table->decimal('realized_pnl', 20, 4)->default(0);
            $table->decimal('dividend_income', 20, 4)->default(0);
            $table->timestamps();

            $table->unique(['portfolio_id', 'stock_code']);
            $table->index(['portfolio_id', 'total_shares']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_positions');
    }
};
