<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dividends', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->string('stock_code', 20);
            $table->decimal('amount', 20, 4);
            $table->date('ex_date')->nullable();
            $table->date('pay_date');
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['portfolio_id', 'pay_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dividends');
    }
};
