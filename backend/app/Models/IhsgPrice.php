<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IhsgPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'close',
        'price_date',
        'source',
    ];

    protected $casts = [
        'close' => 'decimal:4',
        'price_date' => 'date',
    ];
}
