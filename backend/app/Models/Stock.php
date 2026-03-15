<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $primaryKey = 'stock_code';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'stock_code',
        'stock_name',
        'sector',
        'exchange',
        'currency',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
