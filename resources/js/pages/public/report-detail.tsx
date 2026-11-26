import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import KarhutlaMap from '@/components/karhutla-map';
import StatusBadge from '@/components/status-badge';
import FireConditionBadge from '@/components/fire-condition-badge';
import BorderGlow from '@/components/react-bits/BorderGlow';
import { PrivacyProtectionBadge } from '@/components/ai/privacy-protection-badge';
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Building,
    Clock,
    Shield,
    Copy,
    Check,
    AlertTriangle,
} from 'lucide-react';

interface ReportDetailProps {
    report: {
        id: number;
        tracking_code: string;
        title: string;
        description: string;
        category?: { id: number; name: string; slug: string } | null;
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
        is_simulated: boolean;
        created_at?: string | null;
        updated_at?: string | null;
        evidence: Array<{
            id: number;
            file_path: string;
            caption?: string | null;
            media_type: string;
        }>;
        status_history: Array<{
            id: number;
            from_status?: string | null;
            to_status: string;
            reason?: string | null;
            note?: string | null;
            created_at?: string | null;
        }>;
        active_agency?: {
            id: number;
            name: string;
            jurisdiction: string;
        } | null;
        privacy_protection?: {
            sanitized: boolean;
            redaction_applied: boolean;
            detector_version: string;
            processed_at?: string | null;
        };
    };
}

export default function ReportDetailPage({ report }: ReportDetailProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(report.tracking_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-white font-sans text-neutral-900 antialiased selection:bg-[#10e57a] selection:text-black">
            <Head title={`Laporan ${report.tracking_code} — JAGAIN`} />
            <Navbar />

            {/* Breadcrumb Header Strip */}
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 pt-28 pb-4 font-sans sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <Link
                        href="/peta"
                        className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 transition-colors hover:text-black"
                    >
                        <ArrowLeft className="size-3.5" />
                        <span>Kembali ke Peta Sebaran</span>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-medium text-neutral-400">
                            KODE LACAK:
                        </span>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-800 shadow-xs">
                            <span>{report.tracking_code}</span>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="cursor-pointer p-0.5 text-emerald-600 transition-colors hover:text-black"
                                title="Salin Kode Lacak"
                            >
                                {copied ? (
                                    <Check className="size-3.5 text-emerald-700" />
                                ) : (
                                    <Copy className="size-3.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
                    {/* Left 8 Cols: Dossier Information */}
                    <div className="space-y-8 lg:col-span-8">
                        {/* Title & Metadata */}
                        <div className="space-y-4 border-b border-neutral-200 pb-6">
                            <div className="flex flex-wrap items-center gap-2 font-sans">
                                <StatusBadge
                                    status={report.report_status}
                                    label={report.status_label}
                                />
                                {report.category && (
                                    <span className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                                        {report.category.name}
                                    </span>
                                )}
                                {report.is_simulated && (
                                    <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 font-mono text-[10px] font-bold text-red-800">
                                        DATA SIMULASI
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl leading-tight font-extrabold text-neutral-950 sm:text-3xl lg:text-4xl">
                                {report.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-5 pt-1 font-sans text-xs text-neutral-500">
                                <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                                    <MapPin className="size-3.5 text-emerald-600" />
                                    <span>
                                        {report.regency_city}, {report.province}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="size-3.5 text-neutral-400" />
                                    <span>
                                        Dilaporkan:{' '}
                                        {report.reported_occurrence_at
                                            ? new Date(
                                                  report.reported_occurrence_at,
                                              ).toLocaleString('id-ID', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : 'Terkini'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dual Status: Kondisi Kebakaran Aktual with React Bits <BorderGlow /> */}
                        <BorderGlow
                            edgeSensitivity={30}
                            glowColor="38 90 60"
                            backgroundColor="#fffdf5"
                            borderRadius={28}
                            glowRadius={36}
                            glowIntensity={1.1}
                            coneSpread={26}
                            animated={false}
                            colors={['#f59e0b', '#ef4444', '#f97316']}
                            fillOpacity={0.12}
                            className="w-full border border-amber-300 bg-amber-50/70 shadow-sm"
                        >
                            <div className="space-y-4 p-7">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                                    <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-amber-900 uppercase">
                                        <AlertTriangle className="size-4 text-amber-700" />
                                        <span>
                                            Observasi Kondisi Kebakaran Aktual
                                            Lapangan
                                        </span>
                                    </div>
                                    <span className="font-mono text-xs font-medium text-amber-700">
                                        Pemeriksaan Regu
                                    </span>
                                </div>

                                <div>
                                    <FireConditionBadge
                                        condition={report.fire_condition}
                                        source={report.fire_condition_source}
                                        observedAt={
                                            report.fire_condition_observed_at
                                        }
                                    />
                                </div>

                                <p className="pt-1 font-sans text-xs leading-relaxed text-neutral-700 sm:text-sm">
                                    <strong className="font-bold text-neutral-950">
                                        Catatan Integritas:
                                    </strong>{' '}
                                    Kondisi kebakaran di atas diverifikasi
                                    langsung oleh petugas regu darat. Laporan
                                    yang berstatus administratif "Selesai" tetap
                                    memuat bukti pemadaman dingin sebelum
                                    kondisi lahan dinyatakan tuntas aman.
                                </p>
                            </div>
                        </BorderGlow>

                        {/* Uraian Kejadian & Patok Lokasi */}
                        <div className="space-y-4">
                            <h2 className="border-b border-neutral-200 pb-2 font-sans text-xs font-bold tracking-wider text-neutral-900 uppercase">
                                Uraian Kejadian & Kronologi Warga
                            </h2>
                            <p className="font-sans text-sm leading-relaxed whitespace-pre-line text-neutral-700 sm:text-base">
                                {report.description}
                            </p>

                            <div className="space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-xs">
                                <strong className="block font-sans font-bold text-neutral-900">
                                    Petunjuk Patok Lokasi Lapangan:
                                </strong>
                                <span className="block text-xs leading-relaxed text-neutral-500">
                                    {report.location_description ||
                                        'Tidak ada petunjuk patok tambahan yang dicatat.'}
                                </span>
                            </div>
                        </div>

                        {/* Evidence Photos */}
                        {report.evidence.length > 0 && (
                            <div className="space-y-4 border-t border-neutral-200 pt-4">
                                <h2 className="font-sans text-xs font-bold tracking-wider text-neutral-900 uppercase">
                                    Dokumentasi Bukti Lapangan (
                                    {report.evidence.length})
                                </h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {report.evidence.map((ev) => (
                                        <div
                                            key={ev.id}
                                            className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
                                        >
                                            <img
                                                src={ev.file_path}
                                                loading="lazy"
                                                alt={
                                                    ev.caption ||
                                                    'Bukti karhutla'
                                                }
                                                className="h-52 w-full object-cover"
                                            />
                                            {ev.caption && (
                                                <div className="border-t border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                                                    {ev.caption}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chronological Audit Trail Timeline */}
                        <div className="space-y-4 border-t border-neutral-200 pt-4">
                            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                                <h2 className="flex items-center gap-2 font-sans text-xs font-bold tracking-wider text-neutral-900 uppercase">
                                    <Clock className="size-4 text-emerald-600" />
                                    <span>
                                        Jejak Audit & Perjalanan Status Laporan
                                    </span>
                                </h2>
                                <span className="font-mono text-xs text-neutral-500">
                                    Rantai Audit Permanen
                                </span>
                            </div>

                            {report.status_history.length === 0 ? (
                                <p className="text-sm text-neutral-400">
                                    Belum ada riwayat status tercatat.
                                </p>
                            ) : (
                                <div className="divide-y divide-neutral-100 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
                                    {report.status_history.map((hist) => (
                                        <div
                                            key={hist.id}
                                            className="space-y-2 p-6 text-xs"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 font-sans">
                                                <StatusBadge
                                                    status={hist.to_status}
                                                    size="sm"
                                                />
                                                <span className="font-mono text-xs text-neutral-400">
                                                    {hist.created_at
                                                        ? new Date(
                                                              hist.created_at,
                                                          ).toLocaleString(
                                                              'id-ID',
                                                              {
                                                                  day: '2-digit',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              },
                                                          )
                                                        : ''}
                                                </span>
                                            </div>
                                            {hist.note && (
                                                <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 font-sans text-xs leading-relaxed text-neutral-700">
                                                    {hist.note}
                                                </p>
                                            )}
                                            {hist.reason && (
                                                <p className="font-sans text-xs text-neutral-500">
                                                    <strong className="text-neutral-900">
                                                        Alasan Keputusan:
                                                    </strong>{' '}
                                                    <span>{hist.reason}</span>
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 4 Cols: Agency Assignment & Map Coordinates */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* Assigned Agency */}
                        <div className="space-y-4 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
                            <h3 className="flex items-center gap-2 font-sans text-xs font-bold tracking-wider text-neutral-900 uppercase">
                                <Building className="size-4 text-emerald-600" />
                                <span>Instansi Penanganan Lapangan</span>
                            </h3>

                            {report.active_agency ? (
                                <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                                    <div className="text-sm font-bold text-neutral-900">
                                        {report.active_agency.name}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        Wilayah Kewenangan:{' '}
                                        {report.active_agency.jurisdiction}
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 font-mono text-[11px] font-semibold text-emerald-700">
                                        Penugasan resmi terbit dari
                                        administrator JAGAIN.
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
                                    Laporan berada dalam antrean peninjauan
                                    verifikator sebelum penugasan diterbitkan ke
                                    instansi operasional.
                                </div>
                            )}
                        </div>

                        {/* Location Coordinates & Map */}
                        <div className="space-y-4 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
                            <h3 className="flex items-center gap-2 font-sans text-xs font-bold tracking-wider text-neutral-900 uppercase">
                                <MapPin className="size-4 text-emerald-600" />
                                <span>Titik Koordinat Geospasial</span>
                            </h3>

                            <div className="space-y-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs">
                                <div>
                                    Lintang:{' '}
                                    <strong className="text-neutral-900">
                                        {report.latitude}
                                    </strong>
                                </div>
                                <div>
                                    Bujur:{' '}
                                    <strong className="text-neutral-900">
                                        {report.longitude}
                                    </strong>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-neutral-200">
                                <KarhutlaMap
                                    reports={[report]}
                                    height="240px"
                                    showLegend={false}
                                    showFloatingLegend={false}
                                />
                            </div>
                        </div>

                        {/* Privacy Shield Mandate */}
                        <div className="space-y-3 rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                                <Shield className="size-4 text-emerald-700" />
                                <span>Perlindungan Privasi Pelapor</span>
                            </div>
                            <p className="font-sans text-xs leading-relaxed text-neutral-600">
                                Sesuai protokol transparansi JAGAIN, data
                                pribadi warga pelapor disaring dan tidak
                                dipublikasikan ke umum demi keselamatan pelapor
                                di lapangan.
                            </p>
                            <PrivacyProtectionBadge
                                mode="public"
                                sanitized={
                                    report.privacy_protection?.sanitized ?? true
                                }
                                redactionApplied={
                                    report.privacy_protection
                                        ?.redaction_applied ?? false
                                }
                                detectorVersion={
                                    report.privacy_protection?.detector_version
                                }
                            />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
