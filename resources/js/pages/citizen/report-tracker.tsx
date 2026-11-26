import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import StatusBadge from '@/components/status-badge';
import FireConditionBadge from '@/components/fire-condition-badge';
import KarhutlaMap from '@/components/karhutla-map';
import { getOperationalUpdateTypeLabel } from '@/lib/ai-terminology';
import {
    AlertCircle,
    ArrowLeft,
    Building,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Lock,
    MapPin,
    Send,
} from 'lucide-react';

interface ReportTrackerProps {
    report: {
        id: number;
        tracking_code: string;
        title: string;
        description: string;
        category?: { name: string } | null;
        latitude: number;
        longitude: number;
        province: string;
        regency_city: string;
        location_description: string;
        reported_occurrence_at?: string | null;
        report_status: string;
        status_label: string;
        fire_condition: string;
        fire_condition_label: string;
        fire_condition_source?: string | null;
        fire_condition_observed_at?: string | null;
        information_requested?: string | null;
        close_reason?: string | null;
        created_at?: string | null;
        evidence: Array<{
            id: number;
            file_path: string;
            caption?: string | null;
        }>;
        status_history: Array<{
            id: number;
            from_status?: string | null;
            to_status: string;
            reason?: string | null;
            note?: string | null;
            created_at?: string | null;
        }>;
        assignments: Array<{
            id: number;
            agency_name: string;
            jurisdiction: string;
            status: string;
            status_label: string;
            assigned_at: string;
            operational_updates: Array<{
                id: number;
                update_type: string;
                note: string;
                fire_condition_observed?: string | null;
                created_at?: string | null;
            }>;
        }>;
    };
}

function getProgressStage(status: string): number {
    switch (status) {
        case 'SUBMITTED':
            return 1;
        case 'UNDER_REVIEW':
        case 'NEEDS_INFORMATION':
        case 'VERIFIED':
            return 2;
        case 'DISPATCHED':
        case 'RESOLUTION_REVIEW':
            return 3;
        case 'RESOLVED_VERIFIED':
        case 'CLOSED_WITH_REASON':
            return 4;
        default:
            return 1;
    }
}

export default function ReportTracker({ report }: ReportTrackerProps) {
    const [copied, setCopied] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        supplementary_info: '',
    });

    const currentStage = getProgressStage(report.report_status);
    const stages = [
        { step: 1, label: 'Laporan Terkirim' },
        { step: 2, label: 'Peninjauan Admin' },
        { step: 3, label: 'Penanganan OPD' },
        { step: 4, label: 'Selesai / Ditutup' },
    ];

    const handleCopyCode = () => {
        navigator.clipboard?.writeText(report.tracking_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendInfo = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/laporan-saya/${report.tracking_code}/tambah-informasi`, {
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F8FAF9] dark:bg-[#0D120F] min-h-screen text-[#171C19] dark:text-[#F3F7F4] font-sans overflow-x-hidden w-full max-w-full">
            <Head title={`Pelacakan Laporan ${report.tracking_code} — JAGAIN`} />

            <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Navigation Bar */}
                <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <Link
                        href="/laporan-saya"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#216B49] hover:text-[#174B35] dark:text-[#10e57a] transition-colors"
                    >
                        <ArrowLeft className="size-4 shrink-0" />
                        <span>Kembali ke Daftar Laporan Saya</span>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[#68716B] dark:text-neutral-400">Kode Lacak Warga:</span>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E8F1EB] dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold text-[#174B35] dark:text-emerald-300">
                            <span>{report.tracking_code}</span>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                aria-label="Salin Kode Lacak"
                                className="p-0.5 text-[#216B49] hover:text-[#171C19] dark:text-emerald-300 transition-colors cursor-pointer"
                                title="Salin Kode Lacak"
                            >
                                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Citizen 4-Stage Progress Stepper */}
                <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#68716B] dark:text-neutral-400 mb-4">
                        Tahapan Penanganan Laporan Anda
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {stages.map((item) => {
                            const reached = currentStage >= item.step;
                            return (
                                <div
                                    key={item.step}
                                    className={`rounded-xl border p-3 text-xs transition-colors ${reached
                                        ? 'border-emerald-200 bg-[#E8F1EB]/70 text-[#174B35] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                        : 'border-[#DDE3DE] bg-[#F8FAF9] text-[#68716B] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 font-bold">
                                        <span
                                            className={`size-5 rounded-full text-[11px] font-mono flex items-center justify-center shrink-0 ${reached
                                                ? 'bg-[#216B49] text-white'
                                                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                                }`}
                                        >
                                            {reached ? <CheckCircle2 className="size-3.5" /> : item.step}
                                        </span>
                                        <span>{item.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Header Card */}
                <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={report.report_status} label={report.status_label} />
                        {report.category && (
                            <span className="text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-[#343B36] dark:text-neutral-300 px-2.5 py-1 rounded-lg border border-[#DDE3DE] dark:border-neutral-700">
                                {report.category.name}
                            </span>
                        )}
                    </div>

                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#171C19] dark:text-white leading-tight">
                        {report.title}
                    </h1>

                    <p className="text-sm text-[#343B36] dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                        {report.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-5 text-xs text-[#68716B] dark:text-neutral-400 pt-3 border-t border-[#DDE3DE] dark:border-neutral-800">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-[#216B49] dark:text-[#10e57a]" />
                            <span className="font-semibold text-[#171C19] dark:text-white">
                                {report.regency_city}, {report.province}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Clock className="size-3.5 text-[#68716B]" />
                            <span>
                                Dikirim: {report.created_at ? new Date(report.created_at).toLocaleString('id-ID') : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ACTION REQUIRED: If NEEDS_INFORMATION */}
                {report.report_status === 'NEEDS_INFORMATION' && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
                        <div className="flex items-start gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/70">
                            <div className="size-8 rounded-lg bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                                <AlertCircle className="size-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-sm text-[#171C19] dark:text-white">
                                    Petugas Membutuhkan Informasi Tambahan untuk Memverifikasi Laporan
                                </h2>
                                <p className="text-xs text-[#68716B] dark:text-neutral-300 mt-0.5">
                                    Lengkapi keterangan di bawah agar petugas pemeriksa dapat meneruskan laporan Anda ke instansi terkait. Data pribadi pada teks otomatis disaring jika dipublikasikan.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl text-xs text-[#171C19] dark:text-neutral-200 border border-amber-200 dark:border-neutral-800 space-y-1">
                            <strong className="block text-[#68716B] dark:text-neutral-400 text-[11px] font-mono uppercase tracking-wider">
                                Catatan Klarifikasi dari Admin:
                            </strong>
                            <p className="text-sm font-medium italic">
                                &ldquo;{report.information_requested}&rdquo;
                            </p>
                        </div>

                        <form onSubmit={handleSendInfo} className="space-y-4">
                            <div>
                                <label htmlFor="citizen-supp-info" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200 mb-1.5">
                                    Lengkapi Keterangan Tambahan:
                                </label>
                                <textarea
                                    id="citizen-supp-info"
                                    rows={3}
                                    value={data.supplementary_info}
                                    onChange={(e) => setData('supplementary_info', e.target.value)}
                                    placeholder="Tuliskan keterangan detail patok lokasi, akses jalan kendaraan pemadam, atau informasi tambahan yang diminta..."
                                    className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] dark:border-neutral-700 focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white leading-relaxed"
                                    required
                                />
                                {errors.supplementary_info && (
                                    <p className="text-xs text-red-600 mt-1">{errors.supplementary_info}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#216B49] hover:bg-[#174B35] text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Send className="size-3.5" />
                                <span>{processing ? 'Mengirim Data...' : 'Kirim Informasi Tambahan'}</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* Closed Reason Notice */}
                {report.report_status === 'CLOSED_WITH_REASON' && (
                    <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 space-y-2 shadow-xs">
                        <h3 className="font-bold text-sm text-[#171C19] dark:text-white">
                            Laporan Ditutup dengan Catatan Alasan
                        </h3>
                        <p className="text-xs text-[#68716B] dark:text-neutral-400 leading-relaxed">
                            Alasan: {report.close_reason || 'Laporan telah ditutup sesuai tinjauan administratif.'}
                        </p>
                    </div>
                )}

                {/* Ground Fire Condition & Assigned Agency Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 space-y-3 shadow-xs">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#171C19] dark:text-white">
                            Kondisi Lapangan Terkini
                        </div>
                        <FireConditionBadge
                            condition={report.fire_condition}
                            source={report.fire_condition_source}
                            observedAt={report.fire_condition_observed_at}
                        />
                        <p className="text-xs text-[#68716B] dark:text-neutral-400 pt-2 border-t border-[#DDE3DE] dark:border-neutral-800 leading-relaxed">
                            Status kondisi api dicatat terpisah dan hanya dapat dikonfirmasi oleh petugas lapangan berwenang.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 space-y-3 shadow-xs">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#171C19] dark:text-white">
                            Instansi Penugasan
                        </div>
                        {report.assignments.length > 0 ? (
                            <div className="bg-[#E8F1EB]/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                                <div className="font-bold text-sm text-[#174B35] dark:text-emerald-200">
                                    {report.assignments[0].agency_name}
                                </div>
                                <div className="text-xs text-[#343B36] dark:text-neutral-300">
                                    Wilayah: {report.assignments[0].jurisdiction}
                                </div>
                                <div className="text-[11px] font-mono text-[#174B35] dark:text-emerald-300 pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800/70">
                                    Status Tugas: {report.assignments[0].status_label}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#F8FAF9] dark:bg-neutral-900 p-4 rounded-xl border border-[#DDE3DE] dark:border-neutral-800 text-xs text-[#68716B] dark:text-neutral-400 leading-relaxed">
                                Laporan sedang dalam tahap pemeriksaan administratif admin sebelum ditugaskan ke OPD.
                            </div>
                        )}
                    </div>
                </div>

                {/* Chronology & Operational Updates */}
                <div className="bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DDE3DE] dark:border-neutral-800">
                        <h2 className="text-xs font-bold text-[#171C19] dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="size-4 text-[#216B49] dark:text-[#10e57a]" />
                            <span>Kronologi Perjalanan Laporan & Respon OPD</span>
                        </h2>
                        <span className="text-[11px] text-[#68716B] dark:text-neutral-400 font-mono">Riwayat Resmi</span>
                    </div>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE3DE] dark:before:bg-neutral-800">
                        {report.status_history.map((hist) => (
                            <div key={hist.id} className="relative">
                                <span className="absolute -left-6 top-1.5 size-3.5 rounded-full bg-[#216B49] border-2 border-white dark:border-[#141A16]" />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <StatusBadge status={hist.to_status} size="sm" />
                                        <span className="text-[11px] font-mono text-[#68716B] dark:text-neutral-400">
                                            {hist.created_at ? new Date(hist.created_at).toLocaleString('id-ID') : ''}
                                        </span>
                                    </div>
                                    {hist.note && (
                                        <p className="text-xs text-[#343B36] dark:text-neutral-300 bg-[#F8FAF9] dark:bg-neutral-900 p-3 rounded-xl border border-[#DDE3DE] dark:border-neutral-800 mt-1.5 leading-relaxed">
                                            {hist.note}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {report.assignments.some((a) => a.operational_updates.length > 0) && (
                        <div className="mt-8 pt-6 border-t border-[#DDE3DE] dark:border-neutral-800 space-y-4">
                            <h3 className="text-xs font-bold text-[#171C19] dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Building className="size-4 text-[#216B49] dark:text-[#10e57a]" />
                                <span>Catatan Progres Tindak Lanjut dari Petugas Lapangan</span>
                            </h3>
                            <div className="space-y-3">
                                {report.assignments.map((assignment) =>
                                    assignment.operational_updates.map((update) => (
                                        <div
                                            key={update.id}
                                            className="bg-[#E8F1EB]/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 text-xs space-y-1.5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#174B35] dark:text-emerald-300 font-bold">
                                                <span>Tindakan: {getOperationalUpdateTypeLabel(update.update_type)}</span>
                                                <span className="font-mono text-[#68716B] dark:text-neutral-400">
                                                    {update.created_at ? new Date(update.created_at).toLocaleString('id-ID') : ''}
                                                </span>
                                            </div>
                                            <p className="text-[#171C19] dark:text-neutral-200 text-xs leading-relaxed">
                                                {update.note}
                                            </p>
                                        </div>
                                    )),
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Privacy Shield Notice & Location Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-[#E8F1EB]/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#174B35] dark:text-emerald-300 uppercase tracking-wider">
                            <Lock className="size-4" />
                            <span>Perlindungan Data Pribadi Pelapor</span>
                        </div>
                        <p className="text-xs text-[#343B36] dark:text-neutral-300 leading-relaxed">
                            Nama dan nomor kontak Anda hanya dapat dilihat oleh petugas berwenang. Pada peta dan halaman publik, detail identitas serta data teknis tersembunyi pada foto otomatis dibersihkan.
                        </p>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-[#141A16] border border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xs">
                        <h3 className="text-xs font-bold text-[#171C19] dark:text-white uppercase tracking-wider">
                            Peta Posisi Kejadian Terlapor
                        </h3>
                        <div className="border border-[#DDE3DE] dark:border-neutral-800 rounded-xl overflow-hidden">
                            <KarhutlaMap
                                reports={[
                                    {
                                        id: report.id,
                                        tracking_code: report.tracking_code,
                                        title: report.title,
                                        category: report.category,
                                        latitude: report.latitude,
                                        longitude: report.longitude,
                                        province: report.province,
                                        regency_city: report.regency_city,
                                        location_description: report.location_description,
                                        report_status: report.report_status,
                                        status_label: report.status_label,
                                    },
                                ]}
                                height="260px"
                                showLegend={false}
                                showFloatingLegend={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
