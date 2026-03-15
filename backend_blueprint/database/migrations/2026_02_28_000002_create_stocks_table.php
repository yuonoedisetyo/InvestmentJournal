<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table): void {
            $table->string('stock_code', 20)->primary();
            $table->string('stock_name', 150);
            $table->string('sector', 100)->nullable();
            $table->string('exchange', 20)->default('IDX');
            $table->string('currency', 10)->default('IDR');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
