<?php

$appEnv = getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? 'production');
$isDebug = $appEnv !== 'production'
    && filter_var(getenv('APP_DEBUG') ?: ($_ENV['APP_DEBUG'] ?? 'false'), FILTER_VALIDATE_BOOLEAN);

ini_set('display_errors', $isDebug ? '1' : '0');
ini_set('display_startup_errors', $isDebug ? '1' : '0');
ini_set('log_errors', '1');
ini_set('unserialize_callback_func', 'spl_autoload_call');
error_reporting($isDebug ? E_ALL : (E_ALL & ~E_DEPRECATED & ~E_STRICT));

// Trust HTTPS proxy headers from Vercel edge network
if ((isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
    || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)) {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}

if (empty(getenv('APP_URL')) && isset($_SERVER['HTTP_HOST']) && preg_match('/^[a-zA-Z0-9.-]+(:\d{1,5})?$/', $_SERVER['HTTP_HOST']) === 1) {
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $appUrl = "{$scheme}://{$_SERVER['HTTP_HOST']}";
    putenv("APP_URL={$appUrl}");
    $_ENV['APP_URL'] = $appUrl;
    $_SERVER['APP_URL'] = $appUrl;
}

// 1. Redirect all writable storage paths to /tmp (Vercel has read-only filesystem)
$_ENV['LARAVEL_STORAGE_PATH'] = '/tmp/storage';
$_SERVER['LARAVEL_STORAGE_PATH'] = '/tmp/storage';
$_ENV['APP_PACKAGES_CACHE'] = '/tmp/packages.php';
$_SERVER['APP_PACKAGES_CACHE'] = '/tmp/packages.php';
$_ENV['APP_SERVICES_CACHE'] = '/tmp/services.php';
$_SERVER['APP_SERVICES_CACHE'] = '/tmp/services.php';
$_ENV['APP_CONFIG_CACHE'] = '/tmp/config.php';
$_SERVER['APP_CONFIG_CACHE'] = '/tmp/config.php';
$_ENV['APP_ROUTES_CACHE'] = '/tmp/routes.php';
$_SERVER['APP_ROUTES_CACHE'] = '/tmp/routes.php';
$_ENV['APP_EVENTS_CACHE'] = '/tmp/events.php';
$_SERVER['APP_EVENTS_CACHE'] = '/tmp/events.php';
$_ENV['VIEW_COMPILED_PATH'] = '/tmp/storage/framework/views';
$_SERVER['VIEW_COMPILED_PATH'] = '/tmp/storage/framework/views';

// 2. Prepare writable directories in /tmp
$tmpDirs = [
    '/tmp/storage',
    '/tmp/storage/app',
    '/tmp/storage/app/public',
    '/tmp/storage/framework',
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/framework/cache',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/logs',
];

foreach ($tmpDirs as $dir) {
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// 3. Delegate to public/index.php with exception catching
try {
    require __DIR__.'/../public/index.php';
} catch (Throwable $e) {
    error_log(sprintf('[JAGAIN Serverless Error] %s in %s:%d', $e::class, basename($e->getFile()), $e->getLine()));
    http_response_code(500);
    header('Content-Type: text/html');
    if ($isDebug) {
        echo '<h1>Laravel Serverless Error</h1>';
        echo '<p><strong>Message:</strong> '.htmlspecialchars($e->getMessage()).'</p>';
        echo '<p><strong>File:</strong> '.htmlspecialchars($e->getFile()).':'.$e->getLine().'</p>';
        echo '<pre>'.htmlspecialchars($e->getTraceAsString()).'</pre>';
    } else {
        echo '<h1>Internal Server Error</h1>';
        echo '<p>Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.</p>';
    }
}
