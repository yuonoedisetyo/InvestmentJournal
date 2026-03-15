<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dividend extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'portfolio_id',
        'stock_code',
        'amount',
        'ex_date',
        'pay_date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'ex_date' => 'date',
        'pay_date' => 'date',
    ];
}
