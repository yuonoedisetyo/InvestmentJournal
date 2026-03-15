<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_code',
        'price',
        'price_date',
        'source',
    ];

    protected $casts = [
        'price' => 'decimal:4',
        'price_date' => 'date',
    ];
}
