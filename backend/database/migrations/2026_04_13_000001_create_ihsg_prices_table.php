<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ihsg_prices', function (Blueprint $table): void {
            $table->id();
            $table->decimal('close', 20, 4);
            $table->date('price_date');
            $table->string('source', 30)->default('CUSTOM_API');
            $table->timestamps();

            $table->unique('price_date');
            $table->index('price_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ihsg_prices');
    }
};
