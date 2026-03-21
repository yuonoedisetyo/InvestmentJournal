<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    protected function resolveUserId(Request $request): int
    {
        if (! $request->user()) {
            abort(401, 'Unauthenticated.');
        }

        return (int) $request->user()->id;
    }
}
