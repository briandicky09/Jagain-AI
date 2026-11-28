<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $notifications = [];
        $unreadNotificationsCount = 0;

        if ($user) {
            try {
                if (Schema::hasTable('notifications')) {
                    $unreadNotificationsCount = $user->unreadNotifications()->count();
                    $notifications = $user->notifications()
                        ->latest()
                        ->limit(10)
                        ->get()
                        ->map(fn ($notification) => [
                            'id' => $notification->id,
                            'event_type' => $notification->data['event_type'] ?? 'INFO',
                            'title' => $notification->data['title'] ?? 'Pemberitahuan Sistem',
                            'message' => $notification->data['message'] ?? '',
                            'url' => $notification->data['url'] ?? '/dashboard',
                            'tracking_code' => $notification->data['tracking_code'] ?? null,
                            'tone' => $notification->data['tone'] ?? 'info',
                            'read_at' => $notification->read_at?->toIso8601String(),
                            'created_at_human' => $notification->created_at?->locale('id')->diffForHumans() ?? '',
                        ])
                        ->values()
                        ->all();
                }
            } catch (\Throwable) {
                $notifications = [];
                $unreadNotificationsCount = 0;
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'role_label' => $user->role->label(),
                    'phone' => $user->phone,
                    'is_admin' => $user->isAdmin(),
                    'is_agency' => $user->isAgency(),
                    'is_community' => $user->isCommunity(),
                    'agency' => $user->currentAgency() ? [
                        'id' => $user->currentAgency()->id,
                        'name' => $user->currentAgency()->name,
                        'code' => $user->currentAgency()->code,
                        'jurisdiction' => $user->currentAgency()->jurisdiction,
                    ] : null,
                ] : null,
                'notifications' => $notifications,
                'unread_notifications_count' => $unreadNotificationsCount,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'info' => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
