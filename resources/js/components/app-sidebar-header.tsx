import { Link, router, usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { Bell, CheckCheck, ChevronsUpDown } from 'lucide-react';
import type { BreadcrumbItem as BreadcrumbItemType, User } from '@/types';

interface HeaderNotificationItem {
    id: string;
    event_type: string;
    title: string;
    message: string;
    url: string;
    tracking_code?: string | null;
    tone: string;
    read_at?: string | null;
    created_at_human: string;
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props as {
        auth?: {
            user?: User;
            notifications?: HeaderNotificationItem[];
            unread_notifications_count?: number;
        };
    };
    const getInitials = useInitials();
    const notifications = auth?.notifications ?? [];
    const unreadCount = auth?.unread_notifications_count ?? 0;

    const handleNotificationClick = (item: HeaderNotificationItem) => {
        if (!item.read_at) {
            router.post(`/notifications/${item.id}/read`, {}, {
                preserveScroll: true,
                onSuccess: () => router.visit(item.url),
            });
            return;
        }
        router.visit(item.url);
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 dark:bg-[#101512] gap-2 sm:gap-3 pt-[env(safe-area-inset-top,0px)]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <SidebarTrigger className="-ml-1 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg p-1.5 transition-colors shrink-0" />

                {breadcrumbs && breadcrumbs.length > 0 ? (
                    <div className="min-w-0 max-w-[140px] sm:max-w-none overflow-hidden truncate">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm tracking-tight text-[#171C19] dark:text-white">
                            JAGAIN
                        </span>
                        <span className="hidden sm:inline-block text-[10px] font-bold text-[#216B49] bg-[#E8F1EB] dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            Kalimantan
                        </span>
                    </div>
                )}
            </div>

            {/* Top Right: Profil dan Notifikasi Saja */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Notifikasi Bell with Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            title="Pemberitahuan Sistem"
                            aria-label="Pemberitahuan Sistem"
                            className="size-9 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors shadow-2xs relative cursor-pointer focus:outline-none"
                        >
                            <Bell className="size-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden shadow-xl" align="end">
                        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                    Pemberitahuan
                                </span>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                        {unreadCount} baru
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#216B49] hover:underline dark:text-emerald-400 cursor-pointer"
                                >
                                    <CheckCheck className="size-3.5" />
                                    <span>Tandai semua dibaca</span>
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                            {notifications.length === 0 ? (
                                <div className="p-5 text-center text-neutral-500 dark:text-neutral-400">
                                    Belum ada pemberitahuan baru.
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(item)}
                                        className={`w-full text-left p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 block transition-colors cursor-pointer ${
                                            !item.read_at ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <span
                                                className={`size-2 rounded-full mt-1.5 shrink-0 ${
                                                    item.read_at
                                                        ? 'bg-neutral-300 dark:bg-neutral-700'
                                                        : item.tone === 'warning'
                                                          ? 'bg-amber-500'
                                                          : 'bg-emerald-500'
                                                }`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <strong className="text-neutral-900 dark:text-white font-semibold text-xs leading-snug">
                                                        {item.title}
                                                    </strong>
                                                    <span className="text-[10px] text-neutral-400 shrink-0">
                                                        {item.created_at_human}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5 leading-snug">
                                                    {item.message}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Profil Pengguna Dropdown */}
                {auth?.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white pl-1.5 pr-2.5 py-1 text-xs font-bold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-all shadow-2xs cursor-pointer focus:outline-none"
                            >
                                <Avatar className="size-7 rounded-lg">
                                    <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                    <AvatarFallback className="rounded-lg bg-[#E8F1EB] text-[#216B49] text-xs font-bold dark:bg-emerald-950 dark:text-emerald-300">
                                        {getInitials(auth.user.name ?? '')}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden sm:inline-block max-w-[130px] truncate text-left">
                                    {auth.user.name}
                                </span>
                                <ChevronsUpDown className="size-3.5 text-neutral-400 shrink-0" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 min-w-[260px] rounded-xl p-1.5 shadow-xl" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
