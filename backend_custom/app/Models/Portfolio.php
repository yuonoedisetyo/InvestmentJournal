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
        'is_active',
    ];

    protected $casts = [
        'initial_capital' => 'decimal:4',
        'is_active' => 'boolean',
    ];
}
