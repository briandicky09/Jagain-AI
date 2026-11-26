<?php

return [
    'enabled' => (bool) env('AI_SERVICE_ENABLED', true),
    'base_url' => rtrim((string) env('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/'),
    'service_secret' => (string) env('AI_SERVICE_SECRET', ''),
    'timeout_seconds' => (int) env('AI_SERVICE_TIMEOUT', 15),
    'connect_timeout_seconds' => (int) env('AI_SERVICE_CONNECT_TIMEOUT', 3),
    'retry_times' => (int) env('AI_SERVICE_RETRIES', 1),
    'retry_sleep_ms' => (int) env('AI_SERVICE_RETRY_SLEEP_MS', 200),
    'auto_analyze_on_submit' => (bool) env('AI_AUTO_ANALYZE_ON_SUBMIT', false),
    'duplicate_window_hours' => (int) env('AI_DUPLICATE_WINDOW_HOURS', 72),
    'duplicate_radius_km' => (float) env('AI_DUPLICATE_RADIUS_KM', 25.0),
    'max_image_bytes' => (int) env('AI_MAX_IMAGE_BYTES', 5242880),
];
