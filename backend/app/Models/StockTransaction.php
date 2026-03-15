<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'portfolio_id',
        'stock_code',
        'type',
        'lot',
        'price',
        'fee',
        'gross_amount',
        'net_amount',
        'transaction_date',
        'notes',
    ];

    protected $casts = [
        'price' => 'decimal:4',
        'fee' => 'decimal:4',
        'gross_amount' => 'decimal:4',
        'net_amount' => 'decimal:4',
        'transaction_date' => 'date',
    ];
}
