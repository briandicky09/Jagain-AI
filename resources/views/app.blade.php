<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">

        {{-- Upgrade insecure requests to HTTPS only in production (Vercel) --}}
        @production
            <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
        @endproduction

        {{-- Mobile Web App & PWA Capabilities for iOS & Android --}}
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="JAGAIN">
        <meta name="theme-color" content="#216B49" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#101512" media="(prefers-color-scheme: dark)">
        <meta name="format-detection" content="telephone=no">

        {{-- Script to apply light/dark theme preference --}}
        <script>
            (function() {
                try {
                    const appearance = localStorage.getItem('appearance') || 'light';
                    const isDark = appearance === 'dark';

                    if (isDark) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.style.colorScheme = 'dark';
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.documentElement.style.colorScheme = 'light';
                    }
                } catch (e) {}
            })();
        </script>

        {{-- Inline style to set the HTML background color to clean white, prevent horizontal overflow & hide scrollbar --}}
        <style>
            :root {
                --sat: env(safe-area-inset-top, 0px);
                --sab: env(safe-area-inset-bottom, 0px);
                --sal: env(safe-area-inset-left, 0px);
                --sar: env(safe-area-inset-right, 0px);
            }

            html {
                scroll-behavior: smooth;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            html, body {
                background-color: #f8faf9;
                overflow-x: hidden;
                max-width: 100vw;
                width: 100%;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
                -webkit-overflow-scrolling: touch;
            }

            html::-webkit-scrollbar,
            body::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }

            html.dark, html.dark body {
                background-color: #0d120f;
            }

            #jagain-initial-loader {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                background-color: #f8faf9;
                color: #174b35;
                font-family: 'Poppins', system-ui, sans-serif;
            }

            html.dark #jagain-initial-loader {
                background-color: #0d120f;
                color: #10e57a;
            }

            .jagain-loader-ring {
                width: 34px;
                height: 34px;
                border-radius: 9999px;
                border: 3px solid rgba(33, 107, 73, 0.2);
                border-top-color: #216b49;
                animation: jagainSpin 0.8s linear infinite;
            }

            html.dark .jagain-loader-ring {
                border-color: rgba(16, 229, 122, 0.2);
                border-top-color: #10e57a;
            }

            @keyframes jagainSpin {
                to { transform: rotate(360deg); }
            }

            @media (prefers-reduced-motion: reduce) {
                .jagain-loader-ring {
                    animation: none;
                }
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/manifest.webmanifest">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'JAGAIN') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <div id="jagain-initial-loader" aria-hidden="true">
            <div class="jagain-loader-ring"></div>
            <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;">JAGAIN AI</div>
        </div>
        <x-inertia::app />
        <script>
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
            }
        </script>
    </body>
</html>
