<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('portfolios', function (Blueprint $table): void {
            $table->date('performance_cutoff_date')->nullable()->after('initial_capital');
        });
    }

    public function down(): void
    {
        Schema::table('portfolios', function (Blueprint $table): void {
            $table->dropColumn('performance_cutoff_date');
        });
    }
};
