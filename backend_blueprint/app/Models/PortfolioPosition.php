<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PortfolioPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'portfolio_id',
        'stock_code',
        'total_shares',
        'average_price',
        'invested_amount',
        'realized_pnl',
        'dividend_income',
    ];

    protected $casts = [
        'average_price' => 'decimal:8',
        'invested_amount' => 'decimal:4',
        'realized_pnl' => 'decimal:4',
        'dividend_income' => 'decimal:4',
    ];
}
