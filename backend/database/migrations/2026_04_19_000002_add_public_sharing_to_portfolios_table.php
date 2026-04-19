<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('portfolios', function (Blueprint $table): void {
            $table->boolean('is_public')->default(false)->after('performance_cutoff_date');
            $table->string('share_token', 64)->nullable()->unique()->after('is_public');
        });
    }

    public function down(): void
    {
        Schema::table('portfolios', function (Blueprint $table): void {
            $table->dropUnique(['share_token']);
            $table->dropColumn(['is_public', 'share_token']);
        });
    }
};
