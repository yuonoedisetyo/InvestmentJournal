<?php

return [
    'spreadsheet' => [
        'default_url' => env('PRICE_SPREADSHEET_URL'),
        'auto_sync_time' => env('PRICE_SPREADSHEET_SYNC_TIME', '18:00'),
        'auto_sync_timezone' => env('PRICE_SPREADSHEET_SYNC_TIMEZONE', env('APP_TIMEZONE', 'Asia/Jakarta')),
        'auto_sync_source' => env('PRICE_SPREADSHEET_SYNC_SOURCE', 'SPREADSHEET_AUTO'),
    ],
];
