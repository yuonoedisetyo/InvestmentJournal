<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_mutations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'FEE', 'ADJUSTMENT']);
            $table->decimal('amount', 20, 4);
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('description', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['portfolio_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_mutations');
    }
};
