<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'identity' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        $identity = trim($validated['identity']);
        $isEmail = filter_var($identity, FILTER_VALIDATE_EMAIL) !== false;

        $existingUser = User::query()
            ->when($isEmail, fn ($query) => $query->where('email', $identity))
            ->when(! $isEmail, fn ($query) => $query->where('phone', $identity))
            ->first();

        if ($existingUser) {
          throw ValidationException::withMessages([
              'identity' => ['Email / nohp sudah terdaftar.'],
          ]);
        }

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $isEmail ? Str::lower($identity) : null,
            'phone' => $isEmail ? null : $identity,
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Register berhasil.',
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identity' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $identity = trim($validated['identity']);
        $user = User::query()
            ->where('email', Str::lower($identity))
            ->orWhere('phone', $identity)
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'identity' => ['Email / nohp atau password tidak valid.'],
            ]);
        }

        $passwordMatches = Hash::check($validated['password'], $user->password)
            || hash_equals((string) $user->password, (string) $validated['password']);

        if (! $passwordMatches) {
            throw ValidationException::withMessages([
                'identity' => ['Email / nohp atau password tidak valid.'],
            ]);
        }

        if (! Hash::check($validated['password'], $user->password)) {
            $user->forceFill([
                'password' => Hash::make($validated['password']),
            ])->save();
        }

        $plainTextToken = Str::random(80);
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
        ])->save();

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $plainTextToken,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->serializeUser($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->forceFill(['api_token' => null])->save();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    private function serializeUser(?User $user): array
    {
        return [
            'id' => $user?->id,
            'name' => $user?->name,
            'email' => $user?->email,
            'phone' => $user?->phone,
            'identity' => $user?->email ?: $user?->phone,
        ];
    }
}
