import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    LayoutDashboard,
    Flame,
    FileText,
    Map,
    Building2,
    Bot,
    ClipboardList,
    Plus,
    Menu,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { User } from '@/types/auth';

export function MobileBottomNav() {
    const { auth } = usePage().props as { auth?: { user?: User } };
    const { isCurrentUrl } = useCurrentUrl();
    const { setOpenMobile } = useSidebar();
    const user = auth?.user;
    const isAdmin = user?.role === 'ADMIN' || user?.is_admin;
    const isAgency = user?.role === 'AGENCY' || user?.is_agency;

    return (
        <nav
            aria-label="Navigasi Bawah Mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.07)] backdrop-blur-xl select-none md:hidden dark:border-neutral-800/80 dark:bg-[#101512]/95"
        >
            <div className="mx-auto flex h-13 max-w-lg items-center justify-around">
                {isAdmin ? (
                    <>
                        <Link
                            href="/admin/dashboard"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/admin/dashboard')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <LayoutDashboard className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Kendali
                            </span>
                        </Link>

                        <Link
                            href="/admin/reports"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/admin/reports')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <Flame className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Laporan
                            </span>
                        </Link>

                        <Link
                            href="/admin/agencies"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/admin/agencies')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <Building2 className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Instansi
                            </span>
                        </Link>

                        <Link
                            href="/admin/ai-intelligence"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/admin/ai-intelligence')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <Bot className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                AI
                            </span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setOpenMobile(true)}
                            className="flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center py-1 text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400"
                        >
                            <Menu className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Menu
                            </span>
                        </button>
                    </>
                ) : isAgency ? (
                    <>
                        <Link
                            href="/opd/dashboard"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/opd/dashboard')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <LayoutGrid className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Dasbor
                            </span>
                        </Link>

                        <Link
                            href="/opd/tugas"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/opd/tugas')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <ClipboardList className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Tugas
                            </span>
                        </Link>

                        <Link
                            href="/opd/map"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/opd/map')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <Map className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Peta
                            </span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setOpenMobile(true)}
                            className="flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center py-1 text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400"
                        >
                            <Menu className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Menu
                            </span>
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            href="/dashboard"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/dashboard')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <LayoutGrid className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Dasbor
                            </span>
                        </Link>

                        <Link
                            href="/laporan-saya"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/laporan-saya')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <FileText className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Laporan
                            </span>
                        </Link>

                        {/* Raised Center CTA for Rapid Fire Reporting on Mobile */}
                        <div className="flex shrink-0 flex-col items-center justify-center px-2">
                            <Link
                                href="/lapor"
                                prefetch
                                className="-mt-4 flex size-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-tr from-[#174B35] to-[#216B49] text-white shadow-lg shadow-[#216B49]/35 transition-transform active:scale-95 dark:border-[#101512]"
                                aria-label="Kirim Laporan Karhutla Baru"
                            >
                                <Plus className="size-5 stroke-[2.5]" />
                            </Link>
                            <span className="mt-0.5 text-[10px] font-bold text-[#174B35] dark:text-emerald-400">
                                Lapor
                            </span>
                        </div>

                        <Link
                            href="/peta"
                            prefetch
                            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-colors ${
                                isCurrentUrl('/peta')
                                    ? 'font-bold text-[#216B49] dark:text-emerald-400'
                                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            <Map className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Peta
                            </span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setOpenMobile(true)}
                            className="flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center py-1 text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400"
                            aria-label="Buka menu lengkap"
                        >
                            <Menu className="size-4.5" />
                            <span className="mt-0.5 text-[10px] tracking-tight">
                                Menu
                            </span>
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
