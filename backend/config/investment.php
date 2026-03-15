<?php

return [
    'price_provider' => env('PRICE_PROVIDER', 'alpha_vantage'),

    'alpha_vantage' => [
        'key' => env('ALPHA_VANTAGE_API_KEY'),
        'base_url' => env('ALPHA_VANTAGE_BASE_URL', 'https://www.alphavantage.co/query'),
        // For IDX stocks, common suffix is .JK (example: BBCA.JK)
        'symbol_suffix' => env('ALPHA_VANTAGE_SYMBOL_SUFFIX', '.JK'),
        // Free tier is rate limited, so keep a delay between symbol requests.
        'request_interval_ms' => (int) env('ALPHA_VANTAGE_REQUEST_INTERVAL_MS', 12000),
        // Free tier default: 25 requests/day.
        'daily_request_limit' => (int) env('ALPHA_VANTAGE_DAILY_REQUEST_LIMIT', 25),
    ],

    // Optional legacy provider:
    // Endpoint should return: {"data":[{"stock_code":"BBCA","price":"9325.0000","price_date":"2026-02-28","source":"CUSTOM_API"}]}
    'price_sync_endpoint' => env('PRICE_SYNC_ENDPOINT'),

    'spreadsheet' => [
        'default_url' => env('PRICE_SPREADSHEET_URL'),
        'auto_sync_time' => env('PRICE_SPREADSHEET_SYNC_TIME', '18:00'),
        'auto_sync_timezone' => env('PRICE_SPREADSHEET_SYNC_TIMEZONE', env('APP_TIMEZONE', 'Asia/Jakarta')),
        'auto_sync_source' => env('PRICE_SPREADSHEET_SYNC_SOURCE', 'SPREADSHEET_AUTO'),
    ],
];
