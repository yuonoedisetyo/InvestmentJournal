<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->string('stock_code', 20);
            $table->enum('type', ['BUY', 'SELL']);
            $table->unsignedInteger('lot');
            $table->decimal('price', 20, 4);
            $table->decimal('fee', 20, 4)->default(0);
            $table->decimal('gross_amount', 20, 4);
            $table->decimal('net_amount', 20, 4);
            $table->date('transaction_date');
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['portfolio_id', 'stock_code']);
            $table->index('transaction_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};
