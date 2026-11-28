<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'nasa_firms' => [
        'map_key' => (string) env('NASA_FIRMS_MAP_KEY', ''),
        'base_url' => (string) env('NASA_FIRMS_BASE_URL', 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'),
        'source' => (string) env('NASA_FIRMS_SOURCE', 'VIIRS_SNPP_NRT'),
        'bbox' => (string) env('NASA_FIRMS_BBOX', '108.5,-4.5,119.5,4.5'),
        'day_range' => (int) env('NASA_FIRMS_DAY_RANGE', 2),
    ],

    'jagain' => [
        'mail_notifications_enabled' => (bool) env('JAGAIN_MAIL_NOTIFICATIONS', false),
    ],

];
