<?php

namespace Tests\Unit;

use App\Support\DecimalMath;
use RuntimeException;
use PHPUnit\Framework\TestCase;

class DecimalMathTest extends TestCase
{
    public function test_it_can_add_subtract_multiply_and_compare_decimal_values(): void
    {
        $this->assertSame('3.5800', DecimalMath::add('1.2300', '2.3500', 4));
        $this->assertSame('8.4200', DecimalMath::sub('10.0000', '1.5800', 4));
        $this->assertSame('6.1500', DecimalMath::mul('2.4600', '2.5000', 4));
        $this->assertSame(1, DecimalMath::cmp('2.0000', '1.9999', 4));
    }

    public function test_it_can_divide_decimal_values(): void
    {
        $this->assertSame('3.33333333', DecimalMath::div('10', '3', 8));
    }

    public function test_it_throws_for_division_by_zero(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Division by zero in decimal math.');

        DecimalMath::div('10', '0', 8);
    }
}
