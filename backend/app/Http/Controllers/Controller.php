<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function resolveUserId(Request $request): int
    {
        if ($request->user()) {
            return (int) $request->user()->id;
        }

        $user = User::query()->firstOrCreate(
            ['email' => 'dev@local.test'],
            [
                'name' => 'Dev User',
                'password' => 'password',
            ]
        );

        return (int) $user->id;
    }
}
