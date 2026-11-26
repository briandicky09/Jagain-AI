import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bot,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    History,
    RefreshCw,
    ShieldAlert,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiAnalysisRecord, AiSeverityRecommendation } from '@/types/ai';

interface AiAnalysisPanelProps {
    reportId: number;
    analyses: AiAnalysisRecord[];
}

const severityLabels: Record<AiSeverityRecommendation, string> = {
    CRITICAL: 'Kritis (Rekomendasi AI)',
    HIGH: 'Tinggi (Rekomendasi AI)',
    MEDIUM: 'Sedang (Rekomendasi AI)',
    LOW: 'Rendah (Rekomendasi AI)',
    UNKNOWN: 'Belum Dapat Ditentukan',
};

const severityStyles: Record<AiSeverityRecommendation, string> = {
    CRITICAL: 'border-rose-300 bg-rose-50 text-rose-900',
    HIGH: 'border-amber-300 bg-amber-50 text-amber-900',
    MEDIUM: 'border-leaf-green/40 bg-soft-green text-forest-green',
    LOW: 'border-border-neutral bg-pale-green text-dark-neutral',
    UNKNOWN: 'border-border-neutral bg-zinc-100 text-dark-neutral',
};

export function AiAnalysisPanel({ reportId, analyses }: AiAnalysisPanelProps) {
    const [running, setRunning] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [reviewDecision, setReviewDecision] = useState<
        'AGREED' | 'DISAGREED' | null
    >(null);

    const latest = analyses[0] ?? null;
    const structured = latest?.structured_result ?? null;

    const reviewForm = useForm({
        decision: 'AGREED',
        overridden_severity: '',
        feedback: '',
    });

    const triggerAnalysis = () => {
        setRunning(true);
        router.post(
            `/admin/reports/${reportId}/ai/analyze`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setRunning(false),
            },
        );
    };

    const submitReview = (decision: 'AGREED' | 'DISAGREED') => {
        if (!latest) return;
        reviewForm.transform((data) => ({
            ...data,
            decision,
        }));
        reviewForm.post(
            `/admin/reports/${reportId}/ai/analyses/${latest.id}/review`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReviewDecision(null);
                    reviewForm.reset();
                },
            },
        );
    };

    const formatDate = (iso?: string | null) => {
        if (!iso) return '-';
        try {
            return (
                new Intl.DateTimeFormat('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(new Date(iso)) + ' WIB'
            );
        } catch {
            return iso;
        }
    };

    return (
        <section
            aria-label="Panel Analisis Asisten AI"
            className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6"
        >
            <div className="flex flex-col justify-between gap-3 border-b border-border-neutral pb-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft-green text-primary-green">
                        <Bot className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold tracking-tight text-dark-neutral">
                            Analisis Multimodal AI (Alat Bantu Triase)
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-neutral">
                            Rekomendasi AI tidak bersifat final dan tidak
                            mengubah status resmi laporan.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {analyses.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setShowHistory((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border-neutral bg-white px-3 py-2 text-xs font-semibold text-dark-neutral transition hover:bg-pale-green"
                        >
                            <History className="size-3.5 text-primary-green" />
                            <span>Riwayat ({analyses.length})</span>
                        </button>
                    )}

                    <Button
                        type="button"
                        disabled={running}
                        onClick={triggerAnalysis}
                        className="rounded-xl bg-primary-green px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-forest-green"
                    >
                        <RefreshCw
                            className={`mr-1.5 size-3.5 ${running ? 'animate-spin' : ''}`}
                        />
                        <span>
                            {running
                                ? 'Menganalisis...'
                                : latest
                                  ? 'Jalankan Ulang AI'
                                  : 'Jalankan Analisis AI'}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {!latest && (
                <div className="mt-4 rounded-xl border border-dashed border-border-neutral bg-pale-green/40 p-6 text-center">
                    <p className="text-xs font-semibold text-dark-neutral">
                        Belum ada analisis AI yang tercatat untuk laporan ini.
                    </p>
                    <p className="mt-1 text-xs text-gray-neutral">
                        Klik "Jalankan Analisis AI" untuk mengekstrak ringkasan
                        teks, memeriksa bukti foto, dan mencari potensi
                        duplikat.
                    </p>
                </div>
            )}

            {/* Failed / Degraded State */}
            {latest && latest.analysis_status === 'FAILED' && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>
                            Analisis AI Gagal ({latest.error_code ?? 'AI_ERROR'}
                            )
                        </span>
                    </div>
                    <p className="mt-1">
                        {latest.error_message ?? 'Layanan AI tidak merespons.'}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-800">
                        Dicatat pada {formatDate(latest.created_at)}. Anda tetap
                        dapat memverifikasi laporan secara manual.
                    </p>
                </div>
            )}

            {/* Completed Structured Result */}
            {latest && latest.analysis_status !== 'FAILED' && structured && (
                <div className="mt-4 space-y-4">
                    {/* Explicit 4-layer separation reminder */}
                    <div className="rounded-xl border border-border-neutral bg-pale-green/40 px-3.5 py-2.5 text-[11px] text-dark-neutral">
                        <span className="font-semibold text-forest-green">
                            Pemisahan Kewenangan:
                        </span>{' '}
                        <strong>Rekomendasi AI</strong> hanya membantu triase
                        dan terpisah dari{' '}
                        <strong>Status Administratif Laporan</strong>,{' '}
                        <strong>Kondisi Api Aktual Lapangan</strong>, serta{' '}
                        <strong>Keputusan Verifikasi Manusia</strong>.
                    </div>

                    {/* Low-confidence / Uncertainty Warning */}
                    {((latest.confidence_score !== null &&
                        latest.confidence_score < 0.65) ||
                        latest.severity_recommendation === 'UNKNOWN') && (
                        <div
                            role="status"
                            className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900"
                        >
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                            <div>
                                <div className="font-bold">
                                    Tingkat Keyakinan Rendah / Informasi Tidak
                                    Lengkap
                                </div>
                                <p className="mt-0.5 text-[11px]">
                                    Hasil analisis memiliki ketidakpastian
                                    tinggi. Pemeriksaan manual langsung oleh
                                    admin wajib dilakukan sebelum verifikasi
                                    atau penugasan.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Top Metadata & Severity Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-neutral bg-pale-green/50 p-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                                    severityStyles[
                                        latest.severity_recommendation
                                    ] ?? severityStyles.UNKNOWN
                                }`}
                            >
                                <ShieldAlert className="size-3.5" />
                                <span>
                                    {severityLabels[
                                        latest.severity_recommendation
                                    ] ?? latest.severity_recommendation}
                                </span>
                            </span>

                            <span className="rounded-lg border border-border-neutral bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-dark-neutral">
                                Kategori AI: {structured.incident_category}
                            </span>

                            {latest.requires_human_review && (
                                <span className="rounded-lg border border-leaf-green/40 bg-soft-green px-2.5 py-1 text-[11px] font-semibold text-forest-green">
                                    Wajib Verifikasi Admin
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-neutral">
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatDate(latest.created_at)}
                            </span>
                            {latest.processing_duration_ms !== null && (
                                <span className="font-mono">
                                    {Math.round(latest.processing_duration_ms)}{' '}
                                    ms
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-border-neutral bg-white p-3.5">
                        <div className="text-xs font-bold text-dark-neutral">
                            Ringkasan AI
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-dark-neutral">
                            {structured.summary}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-neutral">
                            <span className="font-mono">
                                Model: {latest.model_name} (
                                {latest.model_version})
                            </span>
                            <span>&bull;</span>
                            <span>
                                Skor ({latest.confidence_type}):{' '}
                                <strong className="text-dark-neutral">
                                    {latest.confidence_score !== null
                                        ? `${Math.round(latest.confidence_score * 100)}%`
                                        : '-'}
                                </strong>
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-neutral">
                            {structured.confidence_explanation}
                        </p>
                    </div>

                    {/* Rationale & Flags */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-border-neutral bg-pale-green/30 p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-dark-neutral">
                                <FileText className="size-3.5 text-primary-green" />
                                <span>Observasi Teks & Alasan Rekomendasi</span>
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-dark-neutral">
                                {structured.severity_rationale.map(
                                    (reason, idx) => (
                                        <li key={idx}>{reason}</li>
                                    ),
                                )}
                            </ul>

                            {structured.text_analysis.fire_indicators.length >
                                0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1">
                                    {structured.text_analysis.fire_indicators.map(
                                        (ind) => (
                                            <span
                                                key={ind}
                                                className="rounded-md border border-border-neutral bg-white px-2 py-0.5 font-mono text-[10px] text-dark-neutral"
                                            >
                                                {ind}
                                            </span>
                                        ),
                                    )}
                                </div>
                            )}

                            {structured.text_analysis.missing_information
                                .length > 0 && (
                                <div className="mt-2.5 text-[11px] text-amber-800">
                                    <span className="font-semibold">
                                        Informasi belum lengkap:
                                    </span>{' '}
                                    {structured.text_analysis.missing_information.join(
                                        ', ',
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-border-neutral bg-pale-green/30 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-dark-neutral">
                                    <Eye className="size-3.5 text-primary-green" />
                                    <span>Observasi Visual Bukti</span>
                                </div>
                                <span className="rounded-md border border-border-neutral bg-white px-2 py-0.5 font-mono text-[10px] text-gray-neutral">
                                    {structured.image_analysis.adapter_status}
                                </span>
                            </div>

                            <p className="mt-2 text-xs leading-relaxed text-dark-neutral">
                                {structured.image_analysis.observation_note}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                <span className="rounded-md border border-border-neutral bg-white px-2 py-0.5">
                                    Kualitas:{' '}
                                    <strong>
                                        {
                                            structured.image_analysis
                                                .image_quality
                                        }
                                    </strong>
                                </span>
                                {structured.image_analysis.smoke_detected && (
                                    <span className="rounded-md border border-leaf-green/40 bg-soft-green px-2 py-0.5 text-forest-green">
                                        Asap terdeteksi
                                    </span>
                                )}
                                {structured.image_analysis.flame_detected && (
                                    <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900">
                                        Api terdeteksi
                                    </span>
                                )}
                                {structured.image_analysis
                                    .appears_unrelated && (
                                    <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-900">
                                        Tampak tidak terkait
                                    </span>
                                )}
                            </div>

                            <div className="mt-2.5 rounded-lg border border-border-neutral bg-white p-2 text-[11px] text-dark-neutral">
                                <span className="font-semibold">
                                    Konsistensi Teks-Foto:
                                </span>{' '}
                                {structured.consistency.notes}
                            </div>

                            <p className="mt-1.5 text-[10px] text-gray-neutral">
                                {structured.image_analysis.limitations}
                            </p>
                        </div>
                    </div>

                    {/* Verification Flags */}
                    {structured.verification_flags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-gray-neutral">
                                Flag Verifikasi:
                            </span>
                            {structured.verification_flags.map((flag) => (
                                <span
                                    key={flag}
                                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-900"
                                >
                                    {flag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Human Review Controls */}
                    <div className="border-t border-border-neutral pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-dark-neutral">
                                Tinjauan Manusia atas Analisis AI
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={reviewForm.processing}
                                    onClick={() => submitReview('AGREED')}
                                    aria-label="Tandai analisis AI sesuai"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-leaf-green/40 bg-soft-green px-3 py-1.5 text-xs font-semibold text-forest-green transition hover:bg-leaf-green/20"
                                >
                                    <ThumbsUp className="size-3.5" />
                                    <span>Tandai Sesuai (Reviewed)</span>
                                </button>
                                <button
                                    type="button"
                                    aria-label="Catat ketidaksetujuan atau koreksi tingkat keparahan AI"
                                    onClick={() =>
                                        setReviewDecision((curr) =>
                                            curr === 'DISAGREED'
                                                ? null
                                                : 'DISAGREED',
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                                >
                                    <ThumbsDown className="size-3.5" />
                                    <span>Tolak / Koreksi Keparahan</span>
                                </button>
                            </div>
                        </div>

                        {reviewDecision === 'DISAGREED' && (
                            <div className="mt-3 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-neutral">
                                            Tingkat Keparahan Menurut Admin
                                            (Opsional)
                                        </label>
                                        <select
                                            value={
                                                reviewForm.data
                                                    .overridden_severity
                                            }
                                            onChange={(e) =>
                                                reviewForm.setData(
                                                    'overridden_severity',
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full rounded-xl border border-border-neutral bg-white px-2.5 py-1.5 text-xs text-dark-neutral"
                                        >
                                            <option value="">
                                                -- Pilih Koreksi --
                                            </option>
                                            <option value="LOW">LOW</option>
                                            <option value="MEDIUM">
                                                MEDIUM
                                            </option>
                                            <option value="HIGH">HIGH</option>
                                            <option value="CRITICAL">
                                                CRITICAL
                                            </option>
                                            <option value="UNKNOWN">
                                                UNKNOWN
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-neutral">
                                            Alasan Ketidaksetujuan *
                                        </label>
                                        <input
                                            type="text"
                                            value={reviewForm.data.feedback}
                                            onChange={(e) =>
                                                reviewForm.setData(
                                                    'feedback',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Misal: Foto tidak relevan atau konteks lapangan berbeda"
                                            className="mt-1 w-full rounded-xl border border-border-neutral bg-white px-2.5 py-1.5 text-xs text-dark-neutral"
                                        />
                                    </div>
                                </div>
                                {reviewForm.errors.feedback && (
                                    <p className="text-xs text-rose-700">
                                        {reviewForm.errors.feedback}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision(null)}
                                        className="rounded-xl border border-border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-dark-neutral"
                                    >
                                        Batal
                                    </button>
                                    <Button
                                        type="button"
                                        disabled={
                                            reviewForm.processing ||
                                            !reviewForm.data.feedback.trim()
                                        }
                                        onClick={() =>
                                            submitReview('DISAGREED')
                                        }
                                        className="rounded-xl bg-primary-green px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-green"
                                    >
                                        Simpan Catatan Review
                                    </Button>
                                </div>
                            </div>
                        )}

                        {latest.reviews && latest.reviews.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {latest.reviews.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-neutral bg-pale-green/30 px-3 py-2 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="size-3.5 text-primary-green" />
                                            <span className="font-semibold text-dark-neutral">
                                                {rev.reviewer?.name ?? 'Admin'}
                                            </span>
                                            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold">
                                                {rev.decision}
                                            </span>
                                            {rev.overridden_severity && (
                                                <span className="font-mono text-[11px] text-amber-800">
                                                    Koreksi:{' '}
                                                    {rev.overridden_severity}
                                                </span>
                                            )}
                                            {rev.feedback && (
                                                <span className="text-gray-neutral">
                                                    &mdash; {rev.feedback}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-neutral">
                                            {formatDate(rev.created_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Multi-version analysis history */}
            {showHistory && analyses.length > 1 && (
                <div className="mt-4 border-t border-border-neutral pt-4">
                    <div className="text-xs font-bold text-dark-neutral">
                        Riwayat Versi Analisis AI
                    </div>
                    <div className="mt-2 divide-y divide-border-neutral rounded-xl border border-border-neutral bg-pale-green/20">
                        {analyses.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-dark-neutral">
                                        #{item.id}
                                    </span>
                                    <span>{item.analysis_status}</span>
                                    <span className="font-mono text-[11px] text-gray-neutral">
                                        {item.severity_recommendation}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-neutral">
                                        {item.model_version}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-neutral">
                                    {formatDate(item.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
