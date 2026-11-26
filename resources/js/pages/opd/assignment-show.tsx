import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import StatusBadge from '@/components/status-badge';
import FireConditionBadge from '@/components/fire-condition-badge';
import KarhutlaMap from '@/components/karhutla-map';
import OperationalGanttTimeline from '@/components/operational-gantt-timeline';
import {
    ArrowLeft,
    Building,
    CheckCircle2,
    XCircle,
    Clock,
    MapPin,
    Upload,
    Send,
    Shield,
    FileText,
    AlertCircle,
} from 'lucide-react';

interface AssignmentShowProps {
    assignment: {
        id: number;
        assignment_status: string;
        assigned_at: string;
        notes?: string | null;
        decline_reason?: string | null;
        agency: {
            id: number;
            name: string;
            code?: string | null;
            jurisdiction: string;
        };
        report: {
            id: number;
            tracking_code: string;
            title: string;
            description: string;
            latitude: number;
            longitude: number;
            province?: string | null;
            regency_city?: string | null;
            location_description?: string | null;
            reported_occurrence_at?: string | null;
            report_status: string;
            fire_condition: string;
            fire_condition_source?: string | null;
            fire_condition_observed_at?: string | null;
            category?: { name: string } | null;
            evidence: Array<{
                id: number;
                file_path: string;
                caption?: string | null;
            }>;
        };
        operational_updates: Array<{
            id: number;
            update_type: string;
            note: string;
            fire_condition_observed?: string | null;
            evidence_path?: string | null;
            created_at: string;
            created_by_user: { name: string };
        }>;
    };
    fireConditionOptions: Array<{ value: string; label: string }>;
}

export default function OpdAssignmentShow({
    assignment,
    fireConditionOptions,
}: AssignmentShowProps) {
    const { report } = assignment;
    const isAssigned = assignment.assignment_status === 'ASSIGNED';
    const isHandling = ['RECEIVED_BY_AGENCY', 'IN_PROGRESS'].includes(
        assignment.assignment_status,
    );

    // Form 1: Respond to assignment
    const responseForm = useForm({
        response_type: 'ACCEPT',
        decline_reason: '',
    });

    // Form 2: Operational progress update
    const progressForm = useForm({
        update_type: 'CONTAINMENT',
        note: '',
        fire_condition_observed: '',
        evidence_file: null as File | null,
    });

    // Form 3: Submit for review
    const reviewForm = useForm({
        summary: '',
    });

    const handleRespond = (e: React.FormEvent) => {
        e.preventDefault();
        responseForm.post(`/opd/tugas/${assignment.id}/respon`, {
            preserveScroll: true,
        });
    };

    const handleUpdateProgress = (e: React.FormEvent) => {
        e.preventDefault();
        progressForm.post(`/opd/tugas/${assignment.id}/progres`, {
            preserveScroll: true,
            onSuccess: () => progressForm.reset('note', 'evidence_file'),
        });
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        reviewForm.post(`/opd/tugas/${assignment.id}/ajukan-review`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="min-h-screen space-y-6 bg-[#F8FAF9] p-4 text-[#171C19] sm:p-6 lg:p-8 dark:bg-[#0D120F] dark:text-[#F3F7F4]">
            <Head
                title={`Tugas ${report.tracking_code} — ${assignment.agency.name}`}
            />

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DDE3DE] bg-white p-4 shadow-xs sm:px-6 dark:border-neutral-800 dark:bg-[#141A16]">
                <Link
                    href="/opd/tugas"
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-[#216B49] transition-colors hover:text-[#174B35] dark:text-[#10e57a]"
                >
                    <ArrowLeft className="size-4" />
                    <span>Kembali ke Daftar Tugas OPD</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="font-sans text-xs text-[#68716B] dark:text-neutral-400">
                        Kode Laporan:
                    </span>
                    <span className="rounded-md border border-emerald-200 bg-[#E8F1EB] px-2.5 py-1 font-mono text-xs font-bold text-[#174B35] dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {report.tracking_code}
                    </span>
                </div>
            </div>

            <div className="space-y-6">
                {/* Header Card */}
                <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <StatusBadge
                                status={assignment.assignment_status}
                            />
                            {report.category && (
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 font-sans text-xs font-medium text-neutral-800">
                                    {report.category.name}
                                </span>
                            )}
                        </div>
                        <span className="font-mono text-xs text-neutral-500">
                            Ditugaskan:{' '}
                            {new Date(assignment.assigned_at).toLocaleString(
                                'id-ID',
                            )}
                        </span>
                    </div>

                    <h1 className="text-2xl leading-snug font-bold tracking-tight text-neutral-900 sm:text-3xl">
                        {report.title}
                    </h1>

                    <p className="font-sans text-sm leading-relaxed whitespace-pre-line text-neutral-700">
                        {report.description}
                    </p>

                    <div className="space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
                        <div className="font-sans font-semibold text-neutral-900">
                            Petunjuk Lokasi Khusus:
                        </div>
                        <div className="font-sans text-neutral-600">
                            {report.location_description ||
                                'Tidak ada catatan tambahan'}
                        </div>
                        <div className="pt-1 font-mono text-[11px] text-neutral-500">
                            {[report.regency_city, report.province]
                                .filter(Boolean)
                                .join(', ') || 'Wilayah Terdata Lapangan'}{' '}
                            (Koordinat: {report.latitude}, {report.longitude})
                        </div>
                    </div>

                    {assignment.notes && (
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 font-sans text-xs text-neutral-900">
                            <strong className="mb-0.5 block font-semibold text-amber-950">
                                Instruksi Khusus dari Administrator:
                            </strong>
                            <p className="leading-relaxed text-amber-900">
                                {assignment.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* ACTION 1: Terima / Tolak Penugasan (Only if ASSIGNED) */}
                {isAssigned && (
                    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 shadow-xs">
                        <div className="border-b border-neutral-200 pb-3">
                            <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-wider text-neutral-900 uppercase">
                                <Building className="size-4 text-neutral-700" />
                                Konfirmasi Respon Penugasan Lapangan
                            </h2>
                            <p className="mt-1 font-sans text-xs text-neutral-500">
                                Instansi {assignment.agency.name} wajib
                                mengonfirmasi penerimaan tugas sebelum melakukan
                                tindakan operasional di lapangan.
                            </p>
                        </div>

                        <form onSubmit={handleRespond} className="space-y-4">
                            <div className="flex items-center gap-6 font-sans text-xs">
                                <label className="flex cursor-pointer items-center gap-2 font-medium text-neutral-900">
                                    <input
                                        type="radio"
                                        name="response_type"
                                        value="ACCEPT"
                                        checked={
                                            responseForm.data.response_type ===
                                            'ACCEPT'
                                        }
                                        onChange={() =>
                                            responseForm.setData(
                                                'response_type',
                                                'ACCEPT',
                                            )
                                        }
                                        className="text-neutral-900 focus:ring-neutral-900"
                                    />
                                    <span>
                                        Terima Penugasan & Luncurkan Regu
                                    </span>
                                </label>

                                <label className="flex cursor-pointer items-center gap-2 font-medium text-neutral-900">
                                    <input
                                        type="radio"
                                        name="response_type"
                                        value="DECLINE"
                                        checked={
                                            responseForm.data.response_type ===
                                            'DECLINE'
                                        }
                                        onChange={() =>
                                            responseForm.setData(
                                                'response_type',
                                                'DECLINE',
                                            )
                                        }
                                        className="text-neutral-900 focus:ring-neutral-900"
                                    />
                                    <span>Tolak Penugasan (Wajib Alasan)</span>
                                </label>
                            </div>

                            {responseForm.data.response_type === 'DECLINE' && (
                                <div className="space-y-1">
                                    <label className="block font-sans text-xs font-medium text-neutral-900">
                                        Alasan Penolakan Penugasan (Wajib):
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={responseForm.data.decline_reason}
                                        onChange={(e) =>
                                            responseForm.setData(
                                                'decline_reason',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Contoh: Lokasi berada di luar batas wilayah kewenangan administratif kami, atau seluruh regu sedang terkonsentrasi di kebakaran status darurat..."
                                        className="w-full rounded-xl border border-neutral-200 bg-white p-3 font-sans text-xs focus:border-neutral-900 focus:outline-none"
                                        required
                                    />
                                    {responseForm.errors.decline_reason && (
                                        <p className="mt-1 text-[11px] text-red-600">
                                            {responseForm.errors.decline_reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={responseForm.processing}
                                className={`rounded-lg px-5 py-2.5 font-sans text-xs font-medium transition-colors ${
                                    responseForm.data.response_type === 'ACCEPT'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                }`}
                            >
                                {responseForm.processing
                                    ? 'Memproses...'
                                    : responseForm.data.response_type ===
                                        'ACCEPT'
                                      ? 'Konfirmasi Terima Tugas'
                                      : 'Kirim Penolakan Penugasan'}
                            </button>
                        </form>
                    </div>
                )}

                {/* If DECLINED */}
                {assignment.assignment_status === 'DECLINED_BY_AGENCY' && (
                    <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-5 text-xs">
                        <div className="font-sans font-medium text-red-700">
                            Penugasan Ditolak oleh Instansi
                        </div>
                        <p className="font-sans text-neutral-600">
                            Alasan: {assignment.decline_reason}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left 2 Cols: Progress Updates and Review Form */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* ACTION 2: Tambah Progres Operasional Lapangan (If handling) */}
                        {isHandling && (
                            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
                                <div className="border-b border-neutral-200 pb-3">
                                    <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-wider text-neutral-900 uppercase">
                                        <Clock className="size-4 text-neutral-700" />
                                        Catat Perkembangan Operasional Lapangan
                                    </h2>
                                    <p className="mt-1 font-sans text-xs text-neutral-500">
                                        Catatan ini akan otomatis masuk ke
                                        kronologi pelacakan publik secara
                                        transparan.
                                    </p>
                                </div>

                                <form
                                    onSubmit={handleUpdateProgress}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block font-sans text-xs font-medium text-neutral-900">
                                                Jenis Tindakan Operasional:
                                            </label>
                                            <select
                                                value={
                                                    progressForm.data
                                                        .update_type
                                                }
                                                onChange={(e) =>
                                                    progressForm.setData(
                                                        'update_type',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 font-sans text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                                            >
                                                <option value="PATROL">
                                                    Patroli Pengecekan Lokasi
                                                    (Ground Check)
                                                </option>
                                                <option value="CONTAINMENT">
                                                    Penyekatan / Pembuatan Sekat
                                                    Bakar
                                                </option>
                                                <option value="EXTINGUISHING">
                                                    Pemadaman Aktif (Water
                                                    Bombing / Darat)
                                                </option>
                                                <option value="STATUS_CHECK">
                                                    Pendinginan (Mopping Up) /
                                                    Pantau Asap
                                                </option>
                                                <option value="GENERAL_UPDATE">
                                                    Pembaruan Lapangan Umum
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block font-sans text-xs font-medium text-neutral-900">
                                                Hasil Observasi Fisik Api
                                                (Ground Check):
                                            </label>
                                            <select
                                                value={
                                                    progressForm.data
                                                        .fire_condition_observed
                                                }
                                                onChange={(e) =>
                                                    progressForm.setData(
                                                        'fire_condition_observed',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 font-sans text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                                            >
                                                <option value="">
                                                    — Tidak Ada Perubahan
                                                    Kondisi —
                                                </option>
                                                {fireConditionOptions.map(
                                                    (f) => (
                                                        <option
                                                            key={f.value}
                                                            value={f.value}
                                                        >
                                                            {f.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-sans text-xs font-medium text-neutral-900">
                                            Catatan Progres Lapangan (Wajib):
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={progressForm.data.note}
                                            onChange={(e) =>
                                                progressForm.setData(
                                                    'note',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Contoh: Regu 2 tiba di koordinat. Sumber air parit primer mencukupi, sedang dilakukan penyemprotan sekat bakar sepanjang 200 meter..."
                                            className="w-full rounded-xl border border-neutral-200 bg-white p-3 font-sans text-xs focus:border-neutral-900 focus:outline-none"
                                            required
                                        />
                                        {progressForm.errors.note && (
                                            <p className="mt-1 text-[11px] text-red-600">
                                                {progressForm.errors.note}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="opd-evidence-file"
                                            className="mb-1.5 block font-sans text-xs font-medium text-neutral-900"
                                        >
                                            Unggah Foto Bukti Penanganan
                                            (Opsional, JPG/PNG/WEBP Maks 5 MB):
                                        </label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label
                                                htmlFor="opd-evidence-file"
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#DDE3DE] bg-[#F8FAF9] px-4 py-2 text-xs font-semibold text-[#174B35] transition-colors hover:bg-[#E8F1EB]"
                                            >
                                                <Upload className="size-3.5" />
                                                <span>
                                                    {progressForm.data
                                                        .evidence_file
                                                        ? 'Ganti Foto Bukti'
                                                        : 'Pilih Foto Bukti'}
                                                </span>
                                            </label>
                                            <input
                                                id="opd-evidence-file"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files?.[0];
                                                    if (file)
                                                        progressForm.setData(
                                                            'evidence_file',
                                                            file,
                                                        );
                                                }}
                                                className="sr-only"
                                            />
                                            {progressForm.data
                                                .evidence_file && (
                                                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-[#E8F1EB]/70 px-3 py-1.5 text-xs text-[#174B35]">
                                                    <span className="max-w-[200px] truncate font-medium">
                                                        {
                                                            progressForm.data
                                                                .evidence_file
                                                                .name
                                                        }
                                                    </span>
                                                    <span className="font-mono text-[11px]">
                                                        (
                                                        {(
                                                            progressForm.data
                                                                .evidence_file
                                                                .size / 1024
                                                        ).toFixed(0)}{' '}
                                                        KB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            progressForm.setData(
                                                                'evidence_file',
                                                                null,
                                                            )
                                                        }
                                                        className="cursor-pointer font-bold text-red-700 hover:text-red-900"
                                                        aria-label="Hapus foto bukti"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {progressForm.errors.evidence_file && (
                                            <p className="mt-1 text-[11px] text-red-600">
                                                {
                                                    progressForm.errors
                                                        .evidence_file
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={progressForm.processing}
                                        className="cursor-pointer rounded-lg bg-[#216B49] px-5 py-2.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-[#174B35] disabled:opacity-50"
                                    >
                                        {progressForm.processing
                                            ? 'Menyimpan...'
                                            : 'Simpan Catatan Progres'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ACTION 3: Ajukan Penyelesaian untuk Review Admin (If IN_PROGRESS) */}
                        {assignment.assignment_status === 'IN_PROGRESS' && (
                            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
                                <div className="border-b border-neutral-200 pb-3">
                                    <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-wider text-neutral-900 uppercase">
                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                        Ajukan Penyelesaian Penanganan ke
                                        Administrator
                                    </h2>
                                    <p className="mt-1 font-sans text-xs text-neutral-500">
                                        Gunakan setelah pemadaman tuntas atau
                                        api telah terkendali sepenuhnya di
                                        lapangan.
                                    </p>
                                </div>

                                <form
                                    onSubmit={handleSubmitReview}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="mb-1 block font-sans text-xs font-medium text-neutral-900">
                                            Ringkasan Hasil Penanganan &
                                            Verifikasi Akhir:
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={reviewForm.data.summary}
                                            onChange={(e) =>
                                                reviewForm.setData(
                                                    'summary',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Jelaskan luas area yang berhasil dipadamkan/disekat, status bara di bawah permukaan tanah gambut, dan hasil pengecekan akhir regu sebelum ditarik kembali..."
                                            className="w-full rounded-xl border border-neutral-200 bg-white p-3 font-sans text-xs focus:border-neutral-900 focus:outline-none"
                                            required
                                        />
                                        {reviewForm.errors.summary && (
                                            <p className="mt-1 text-[11px] text-red-600">
                                                {reviewForm.errors.summary}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={reviewForm.processing}
                                        className="flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 font-sans text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                                    >
                                        <Send className="size-3.5" />
                                        <span>
                                            {reviewForm.processing
                                                ? 'Mengajukan...'
                                                : 'Ajukan Review Penyelesaian ke Admin'}
                                        </span>
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Visualisasi Linimasa & Gantt Chart Jadwal Penanganan */}
                        <OperationalGanttTimeline
                            assignedAt={assignment.assigned_at}
                            status={assignment.assignment_status}
                            updates={assignment.operational_updates}
                            completedAt={
                                assignment.assignment_status === 'COMPLETED'
                                    ? new Date().toISOString()
                                    : null
                            }
                            title={`Linimasa & Jadwal Penanganan (${assignment.agency.name})`}
                        />

                        {/* Riwayat Catatan Progres Tindak Lanjut */}
                        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
                            <h3 className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                                <Clock className="size-4 text-neutral-700" />
                                Riwayat Catatan Tindak Lanjut Instansi (
                                {assignment.operational_updates.length})
                            </h3>

                            {assignment.operational_updates.length === 0 ? (
                                <p className="py-4 font-sans text-xs text-neutral-500">
                                    Belum ada catatan progres operasional.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {assignment.operational_updates.map(
                                        (update) => (
                                            <div
                                                key={update.id}
                                                className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs"
                                            >
                                                <div className="flex items-center justify-between font-sans text-[11px] font-medium text-neutral-900">
                                                    <span>
                                                        Tindakan:{' '}
                                                        {update.update_type}
                                                    </span>
                                                    <span className="font-mono text-neutral-500">
                                                        {new Date(
                                                            update.created_at,
                                                        ).toLocaleString(
                                                            'id-ID',
                                                        )}{' '}
                                                        • Oleh:{' '}
                                                        {
                                                            update
                                                                .created_by_user
                                                                .name
                                                        }
                                                    </span>
                                                </div>

                                                <p className="font-sans text-sm leading-relaxed whitespace-pre-line text-neutral-800">
                                                    {update.note}
                                                </p>

                                                {update.fire_condition_observed && (
                                                    <div className="font-sans text-[11px] text-neutral-700">
                                                        Kondisi Api
                                                        Terobservasi:{' '}
                                                        <span className="font-medium text-neutral-900">
                                                            {
                                                                update.fire_condition_observed
                                                            }
                                                        </span>
                                                    </div>
                                                )}

                                                {update.evidence_path && (
                                                    <div className="pt-2">
                                                        <img
                                                            src={
                                                                update.evidence_path
                                                            }
                                                            loading="lazy"
                                                            alt="Bukti operasional"
                                                            className="size-32 rounded-lg border border-neutral-200 object-cover"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1 Col: Location Map & Coordinates */}
                    <div className="space-y-6">
                        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
                            <h3 className="flex items-center gap-1.5 font-sans text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                                <MapPin className="size-4 text-neutral-700" />
                                Lokasi Kejadian Lapangan
                            </h3>
                            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 font-mono text-xs text-neutral-900">
                                <div>Lat: {report.latitude}</div>
                                <div>Lng: {report.longitude}</div>
                            </div>
                            <KarhutlaMap
                                reports={[
                                    {
                                        id: report.id,
                                        tracking_code: report.tracking_code,
                                        title: report.title,
                                        latitude: report.latitude,
                                        longitude: report.longitude,
                                        province: report.province ?? '',
                                        regency_city: report.regency_city ?? '',
                                        location_description:
                                            report.location_description ?? '',
                                        report_status: report.report_status,
                                        status_label: report.report_status,
                                    },
                                ]}
                                height="260px"
                            />
                        </div>

                        {/* Safety Notice */}
                        <div className="space-y-2 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 text-xs text-neutral-900">
                            <div className="flex items-center gap-1.5 font-sans font-semibold text-amber-950">
                                <Shield className="size-4 text-amber-800" />
                                Standar Operasional Keselamatan Petugas
                            </div>
                            <p className="font-sans leading-relaxed text-amber-900">
                                Pastikan seluruh personil regu pemadam
                                dilengkapi APD lengkap (masker respirator, helm,
                                sepatu boots tahan api, dan kacamata pelindung).
                                Selalu siapkan jalur evakuasi darurat sebelum
                                memulai pemadaman di area gambut.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
