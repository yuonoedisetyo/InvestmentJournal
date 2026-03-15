<?php

namespace App\Support;

use RuntimeException;

class DecimalMath
{
    public static function add(string $a, string $b, int $scale = 4): string
    {
        self::guardBcMath();
        return bcadd($a, $b, $scale);
    }

    public static function sub(string $a, string $b, int $scale = 4): string
    {
        self::guardBcMath();
        return bcsub($a, $b, $scale);
    }

    public static function mul(string $a, string $b, int $scale = 4): string
    {
        self::guardBcMath();
        return bcmul($a, $b, $scale);
    }

    public static function div(string $a, string $b, int $scale = 8): string
    {
        self::guardBcMath();
        if (bccomp($b, '0', $scale) === 0) {
            throw new RuntimeException('Division by zero in decimal math.');
        }

        return bcdiv($a, $b, $scale);
    }

    public static function cmp(string $a, string $b, int $scale = 4): int
    {
        self::guardBcMath();
        return bccomp($a, $b, $scale);
    }

    private static function guardBcMath(): void
    {
        if (! extension_loaded('bcmath')) {
            throw new RuntimeException('BCMath extension is required for financial precision.');
        }
    }
}
