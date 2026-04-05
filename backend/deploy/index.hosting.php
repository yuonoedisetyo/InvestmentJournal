<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = '/home/insitei1/investment_repo/backend/storage/framework/maintenance.php')) {
    require $maintenance;
}

require '/home/insitei1/investment_repo/backend/vendor/autoload.php';

$app = require_once '/home/insitei1/investment_repo/backend/bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
