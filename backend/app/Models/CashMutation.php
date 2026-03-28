<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class CashMutation extends Model
{
    use HasFactory;

    public const TYPE_DEPOSIT = 'DEPOSIT';
    public const TYPE_WITHDRAW = 'WITHDRAW';
    public const TYPE_DIVIDEND = 'DIVIDEND';
    public const TYPE_FEE = 'FEE';
    public const TYPE_ADJUSTMENT = 'ADJUSTMENT';

    protected $fillable = [
        'user_id',
        'portfolio_id',
        'type',
        'amount',
        'reference_id',
        'description',
        'created_at',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    public $timestamps = false;

    public function setCreatedAtAttribute($value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['created_at'] = $value;
            return;
        }

        $this->attributes['created_at'] = Carbon::parse($value)->format('Y-m-d H:i:s');
    }
}
