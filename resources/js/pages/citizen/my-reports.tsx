import { Head, Link, router } from '@inertiajs/react';
import StatusBadge from '@/components/status-badge';
import {
    PlusCircle,
    FileText,
    MapPin,
    Calendar,
    ArrowRight,
    AlertCircle,
    Building,
    Shield,
} from 'lucide-react';

interface ReportItem {
    id: number;
    tracking_code: string;
    title: string;
    description: string;
    province: string;
    regency_city: string;
    report_status: string;
    fire_condition: string;
    information_requested?: string | null;
    created_at: string;
    category?: { name: string } | null;
    latest_assignment?: { agency?: { name: string } } | null;
}

interface MyReportsProps {
    reports: {
        data: ReportItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        status?: string;
    };
}

const STATUS_FILTER_TABS = [
    { key: '', label: 'Semua' },
    { key: 'SUBMITTED', label: 'Baru Dikirim' },
    { key: 'VERIFIED', label: 'Terverifikasi' },
    { key: 'NEEDS_INFORMATION', label: 'Perlu Dilengkapi' },
    { key: 'DISPATCHED', label: 'Ditugaskan ke OPD' },
    { key: 'RESOLVED_VERIFIED', label: 'Selesai Terverifikasi' },
] as const;

export default function MyReports({ reports, filters }: MyReportsProps) {
    return (
        <div className="min-h-screen space-y-6 bg-[#F8FAF9] p-4 font-sans text-[#171C19] sm:p-6 lg:p-8 dark:bg-[#0D120F] dark:text-[#F3F7F4]">
            <Head title="Laporan Saya — JAGAIN" />

            {/* Header Bar */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#DDE3DE] pb-6 sm:flex-row sm:items-center dark:border-neutral-800">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#216B49] uppercase dark:text-[#10e57a]">
                        <Shield className="size-4" />
                        <span>Portal Warga Pelapor</span>
                    </div>
                    <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#171C19] sm:text-3xl dark:text-white">
                        <span>
                            Riwayat Laporan Karhutla Saya ({reports.total})
                        </span>
                    </h1>
                    <p className="text-xs text-[#68716B] sm:text-sm dark:text-neutral-400">
                        Pantau perjalanan verifikasi dan respon instansi atas
                        laporan yang telah Anda kirimkan.
                    </p>
                </div>

                <Link
                    href="/lapor"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#216B49] px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(33,107,73,0.3)] transition-all hover:bg-[#174B35] active:scale-95 sm:text-sm"
                >
                    <PlusCircle className="size-4" />
                    <span>Kirim Laporan Baru</span>
                </Link>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {STATUS_FILTER_TABS.map((tab) => {
                    const isActive = tab.key === '' ? !filters.status : filters.status === tab.key;
                    const href = tab.key === '' || isActive
                        ? '/laporan-saya'
                        : `/laporan-saya?status=${tab.key}`;

                    return (
                        <Link
                            key={tab.key || 'all'}
                            href={href}
                            preserveScroll
                            className={`cursor-pointer rounded-xl border px-3.5 py-1.5 transition-all ${
                                isActive
                                    ? 'border-[#216B49] bg-[#216B49] text-white shadow-xs'
                                    : 'border-[#DDE3DE] bg-white text-[#343B36] hover:bg-[#E8F1EB] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* Reports List */}
            {reports.data.length === 0 ? (
                <div className="space-y-3 rounded-2xl border border-[#DDE3DE] bg-white p-12 text-center text-[#68716B] shadow-xs dark:border-neutral-800 dark:bg-[#141A16] dark:text-neutral-400">
                    <FileText className="mx-auto size-10 text-[#68716B] dark:text-neutral-500" />
                    <h2 className="text-base font-bold text-[#171C19] dark:text-white">
                        Belum ada laporan dalam kategori ini
                    </h2>
                    <p className="mx-auto max-w-sm text-xs text-[#68716B] dark:text-neutral-400">
                        Jika Anda melihat titik kebakaran di sekitar Anda,
                        kirimkan laporan lengkap dengan koordinat GPS.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/lapor"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#216B49] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#174B35]"
                        >
                            <PlusCircle className="size-4" />
                            <span>Buat Laporan Baru</span>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="divide-y divide-[#DDE3DE] overflow-hidden rounded-2xl border border-[#DDE3DE] bg-white shadow-xs dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#141A16]">
                    {reports.data.map((report) => (
                        <div
                            key={report.id}
                            className="flex flex-col justify-between gap-4 p-6 transition-colors hover:bg-[#F3F7F4]/60 md:flex-row md:items-center dark:hover:bg-neutral-900/50"
                        >
                            <div className="min-w-0 flex-1 space-y-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg border border-emerald-200 bg-[#E8F1EB] px-2.5 py-1 font-mono text-xs font-bold text-[#174B35] dark:border-emerald-800/40 dark:bg-emerald-950/70 dark:text-emerald-300">
                                        {report.tracking_code}
                                    </span>
                                    <StatusBadge
                                        status={report.report_status}
                                        size="sm"
                                    />
                                    {report.category && (
                                        <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-[#68716B] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                                            {report.category.name}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-base font-bold text-[#171C19] transition-colors hover:text-[#216B49] dark:text-white dark:hover:text-[#10e57a]">
                                        <Link
                                            href={`/laporan-saya/${report.tracking_code}`}
                                        >
                                            {report.title}
                                        </Link>
                                    </h2>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#68716B] dark:text-neutral-400">
                                        {report.description}
                                    </p>
                                </div>

                                {report.report_status ===
                                    'NEEDS_INFORMATION' && (
                                    <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-[#E8F1EB] p-3 text-xs text-[#174B35] dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#216B49] dark:text-[#10e57a]" />
                                        <div>
                                            <strong className="font-bold">
                                                Petugas Membutuhkan Informasi
                                                Tambahan:
                                            </strong>{' '}
                                            Buka detail laporan untuk melengkapi
                                            klarifikasi.
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-[#68716B] dark:text-neutral-400">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="size-3.5 text-[#216B49] dark:text-[#10e57a]" />
                                        <span>
                                            {report.regency_city},{' '}
                                            {report.province}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                        <Calendar className="size-3.5 text-[#68716B]" />
                                        <span>
                                            {new Date(
                                                report.created_at,
                                            ).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    {report.latest_assignment?.agency && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#174B35] dark:text-emerald-300">
                                            <Building className="size-3.5" />
                                            <span>
                                                Ditugaskan:{' '}
                                                {
                                                    report.latest_assignment
                                                        .agency.name
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-end">
                                <Link
                                    href={`/laporan-saya/${report.tracking_code}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8F1EB] px-4 py-2 text-xs font-bold text-[#216B49] shadow-2xs transition-all hover:bg-[#216B49] hover:text-white dark:bg-emerald-950/60 dark:text-[#10e57a] dark:hover:bg-[#10e57a] dark:hover:text-black"
                                >
                                    <span>Lacak Progres</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {reports.last_page > 1 && (
                <nav
                    aria-label="Navigasi halaman laporan"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2"
                >
                    <span className="font-mono text-xs text-[#68716B] dark:text-neutral-400">
                        Halaman {reports.current_page} dari {reports.last_page}{' '}
                        ({reports.total} laporan)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {reports.links.map((link, idx) => {
                            const labelText = link.label
                                .replace('&laquo; Previous', 'Sebelumnya')
                                .replace('Next &raquo;', 'Berikutnya')
                                .replace(/&laquo;|&raquo;/g, '')
                                .trim();
                            return (
                                <button
                                    key={`${labelText}-${idx}`}
                                    type="button"
                                    disabled={!link.url || link.active}
                                    onClick={() =>
                                        link.url &&
                                        router.visit(link.url, {
                                            preserveScroll: true,
                                        })
                                    }
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        link.active
                                            ? 'border-[#216B49] bg-[#216B49] text-white'
                                            : link.url
                                              ? 'cursor-pointer border-[#DDE3DE] bg-white text-[#343B36] hover:bg-[#E8F1EB] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                                              : 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/40'
                                    }`}
                                >
                                    {labelText}
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}
        </div>
    );
}
