<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Portfolio extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'currency',
        'initial_capital',
        'performance_cutoff_date',
        'is_public',
        'share_token',
        'is_active',
    ];

    protected $casts = [
        'initial_capital' => 'decimal:4',
        'performance_cutoff_date' => 'date',
        'is_public' => 'boolean',
        'is_active' => 'boolean',
    ];
}
