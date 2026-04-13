<?php

return [
    'spreadsheet' => [
        'default_url' => env('PRICE_SPREADSHEET_URL'),
        'auto_sync_time' => env('PRICE_SPREADSHEET_SYNC_TIME', '18:00'),
        'auto_sync_timezone' => env('PRICE_SPREADSHEET_SYNC_TIMEZONE', env('APP_TIMEZONE', 'Asia/Jakarta')),
        'auto_sync_source' => env('PRICE_SPREADSHEET_SYNC_SOURCE', 'SPREADSHEET_AUTO'),
    ],
    'ihsg' => [
        'source_url' => env('IHSG_SOURCE_URL'),
        'source_path' => env('IHSG_SOURCE_PATH'),
        'auto_sync_time' => env('IHSG_SYNC_TIME', '18:15'),
        'auto_sync_timezone' => env('IHSG_SYNC_TIMEZONE', env('APP_TIMEZONE', 'Asia/Jakarta')),
        'auto_sync_source' => env('IHSG_SYNC_SOURCE', 'IHSG_AUTO'),
    ],
];
