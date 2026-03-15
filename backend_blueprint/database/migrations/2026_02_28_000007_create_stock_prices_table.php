<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_prices', function (Blueprint $table): void {
            $table->id();
            $table->string('stock_code', 20);
            $table->decimal('price', 20, 4);
            $table->date('price_date');
            $table->string('source', 30)->default('CUSTOM_API');
            $table->timestamps();

            $table->unique(['stock_code', 'price_date']);
            $table->index(['stock_code', 'price_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_prices');
    }
};
