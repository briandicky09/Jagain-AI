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
import {
    AI_ANALYSIS_STATUS_LABELS,
    AI_CONFIDENCE_TYPE_LABELS,
    AI_REVIEW_DECISION_LABELS,
    AI_SEVERITY_LABELS,
    AI_SEVERITY_SHORT_LABELS,
    formatAiErrorMessage,
    formatPercentScore,
    formatWibDateTime,
    getAiCategoryLabel,
    getAiFireIndicatorLabel,
    getAiImageQualityLabel,
    getAiMissingInfoLabel,
    getAiVerificationFlagLabel,
    getAiVisionAdapterLabel,
} from '@/lib/ai-terminology';
import type { AiAnalysisRecord, AiSeverityRecommendation } from '@/types/ai';

interface AiAnalysisPanelProps {
    reportId: number;
    analyses: AiAnalysisRecord[];
}

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

    return (
        <section
            aria-label="Panel Hasil Analisis AI"
            className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6"
        >
            <div className="flex flex-col justify-between gap-3 border-b border-border-neutral pb-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft-green text-primary-green">
                        <Bot className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold tracking-tight text-dark-neutral">
                            Hasil Analisis AI (Rekomendasi Awal)
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-neutral">
                            AI hanya memberikan perkiraan awal untuk membantu
                            pemeriksaan. Keputusan verifikasi, penolakan,
                            penugasan, dan status resmi laporan tetap dilakukan
                            oleh administrator.
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
                            <span>Riwayat Analisis ({analyses.length})</span>
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
                                ? 'Sedang Menganalisis...'
                                : latest
                                    ? 'Analisis Ulang'
                                    : 'Jalankan Analisis AI'}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {!latest && (
                <div className="mt-4 rounded-xl border border-dashed border-border-neutral bg-pale-green/40 p-6 text-center">
                    <p className="text-xs font-semibold text-dark-neutral">
                        Belum ada hasil analisis AI untuk laporan ini.
                    </p>
                    <p className="mt-1 text-xs text-gray-neutral">
                        Klik &ldquo;Jalankan Analisis AI&rdquo; untuk meringkas
                        isi laporan, memeriksa foto bukti, dan mencari laporan
                        lain yang mirip.
                    </p>
                </div>
            )}

            {/* Failed / Degraded State */}
            {latest && latest.analysis_status === 'FAILED' && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold">
                            <AlertTriangle className="size-4 shrink-0" />
                            <span>Analisis AI Belum Berhasil</span>
                        </div>
                        <button
                            type="button"
                            disabled={running}
                            onClick={triggerAnalysis}
                            className="rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                            Coba Lagi
                        </button>
                    </div>
                    <p className="mt-1.5">
                        {formatAiErrorMessage(
                            latest.error_code,
                            latest.error_message,
                        )}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-800">
                        Dicatat pada {formatWibDateTime(latest.created_at)}. Anda
                        tetap dapat memeriksa dan memverifikasi laporan secara
                        manual.
                    </p>
                </div>
            )}

            {/* Completed Structured Result */}
            {latest && latest.analysis_status !== 'FAILED' && structured && (
                <div className="mt-4 space-y-4">
                    {/* Explicit 4-layer separation reminder */}
                    <div className="rounded-xl border border-border-neutral bg-pale-green/40 px-3.5 py-2.5 text-[11px] text-dark-neutral">
                        <span className="font-semibold text-forest-green">
                            Catatan Kewenangan:
                        </span>{' '}
                        Hasil analisis AI hanya membantu pemeriksaan awal dan
                        tidak otomatis mengubah{' '}
                        <strong>Status Resmi Laporan</strong>,{' '}
                        <strong>Kondisi Api di Lapangan</strong>, maupun{' '}
                        <strong>Keputusan Verifikasi Admin</strong>.
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
                                        Tingkat Keyakinan AI Rendah / Keterangan
                                        Belum Lengkap
                                    </div>
                                    <p className="mt-0.5 text-[11px]">
                                        Keterangan atau foto pada laporan masih
                                        terbatas sehingga perkiraan AI belum cukup
                                        kuat. Pemeriksaan langsung oleh petugas
                                        wajib dilakukan sebelum menentukan tindakan.
                                    </p>
                                </div>
                            </div>
                        )}

                    {/* Top Metadata & Severity Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-neutral bg-pale-green/50 p-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${severityStyles[
                                    latest.severity_recommendation
                                ] ?? severityStyles.UNKNOWN
                                    }`}
                            >
                                <ShieldAlert className="size-3.5" />
                                <span>
                                    {AI_SEVERITY_LABELS[
                                        latest.severity_recommendation
                                    ] ?? latest.severity_recommendation}
                                </span>
                            </span>

                            <span className="rounded-lg border border-border-neutral bg-white px-2.5 py-1 text-[11px] font-medium text-dark-neutral">
                                Pengelompokan Laporan:{' '}
                                <strong>
                                    {getAiCategoryLabel(
                                        structured.incident_category,
                                    )}
                                </strong>
                            </span>

                            {latest.requires_human_review && (
                                <span className="rounded-lg border border-leaf-green/40 bg-soft-green px-2.5 py-1 text-[11px] font-semibold text-forest-green">
                                    Perlu Pemeriksaan Admin
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-neutral">
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatWibDateTime(latest.created_at)}
                            </span>
                            {latest.processing_duration_ms !== null && (
                                <span className="tabular-nums">
                                    Waktu proses:{' '}
                                    {Math.round(latest.processing_duration_ms)}{' '}
                                    ms
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-border-neutral bg-white p-3.5">
                        <div className="text-xs font-bold text-dark-neutral">
                            Ringkasan Hasil Analisis AI
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-dark-neutral">
                            {structured.summary}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-border-neutral/70 bg-pale-green/35 px-3 py-2 text-xs text-dark-neutral">
                            <span>
                                Tingkat Keyakinan AI:{' '}
                                <strong className="text-forest-green">
                                    {formatPercentScore(latest.confidence_score)}
                                </strong>
                            </span>
                            <span className="text-gray-neutral">&bull;</span>
                            <span className="text-[11px] text-gray-neutral">
                                Dihitung{' '}
                                {AI_CONFIDENCE_TYPE_LABELS[
                                    latest.confidence_type
                                ] ?? 'berdasarkan petunjuk laporan'}
                            </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-neutral">
                            {structured.confidence_explanation} Angka ini hanya
                            menunjukkan kelengkapan petunjuk awal dan bukan
                            jaminan kebenaran kejadian.
                        </p>
                        <div className="mt-1.5 font-mono text-[10px] text-gray-neutral">
                            Sistem: {latest.model_name} ({latest.model_version})
                        </div>
                    </div>

                    {/* Rationale & Flags */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-border-neutral bg-pale-green/30 p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-dark-neutral">
                                <FileText className="size-3.5 text-primary-green" />
                                <span>Analisis Teks &amp; Alasan Perkiraan</span>
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
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {structured.text_analysis.fire_indicators.map(
                                            (ind) => (
                                                <span
                                                    key={ind}
                                                    className="rounded-md border border-border-neutral bg-white px-2 py-0.5 text-[11px] font-medium text-dark-neutral"
                                                >
                                                    {getAiFireIndicatorLabel(ind)}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                )}

                            {structured.text_analysis.missing_information
                                .length > 0 && (
                                <div className="mt-2.5 text-[11px] text-amber-800">
                                    <span className="font-semibold">
                                        Keterangan yang masih kurang:
                                    </span>{' '}
                                    {structured.text_analysis.missing_information
                                        .map(getAiMissingInfoLabel)
                                        .join(', ')}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-border-neutral bg-pale-green/30 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-dark-neutral">
                                    <Eye className="size-3.5 text-primary-green" />
                                    <span>Analisis Foto Bukti</span>
                                </div>
                                <span className="rounded-md border border-border-neutral bg-white px-2 py-0.5 text-[11px] font-medium text-gray-neutral">
                                    {getAiVisionAdapterLabel(
                                        structured.image_analysis
                                            .adapter_status,
                                    )}
                                </span>
                            </div>

                            <p className="mt-2 text-xs leading-relaxed text-dark-neutral">
                                {structured.image_analysis.observation_note}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                <span className="rounded-md border border-border-neutral bg-white px-2 py-0.5">
                                    Kualitas Foto:{' '}
                                    <strong>
                                        {getAiImageQualityLabel(
                                            structured.image_analysis
                                                .image_quality,
                                        )}
                                    </strong>
                                </span>
                                {structured.image_analysis.smoke_detected && (
                                    <span className="rounded-md border border-leaf-green/40 bg-soft-green px-2 py-0.5 text-forest-green">
                                        Asap terlihat di foto
                                    </span>
                                )}
                                {structured.image_analysis.flame_detected && (
                                    <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900">
                                        Api terlihat di foto
                                    </span>
                                )}
                                {structured.image_analysis
                                    .appears_unrelated && (
                                        <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-900">
                                            Foto tampak tidak terkait kebakaran
                                        </span>
                                    )}
                            </div>

                            <div className="mt-2.5 rounded-lg border border-border-neutral bg-white p-2 text-[11px] text-dark-neutral">
                                <span className="font-semibold">
                                    Kesesuaian Cerita &amp; Foto:
                                </span>{' '}
                                {structured.consistency.notes}
                            </div>

                            <p className="mt-1.5 text-[11px] text-gray-neutral">
                                {structured.image_analysis.limitations}
                            </p>
                        </div>
                    </div>

                    {/* Verification Flags */}
                    {structured.verification_flags.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                            <div className="text-[11px] font-semibold text-amber-950">
                                Catatan Pemeriksaan Tambahan untuk Admin:
                            </div>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-amber-900">
                                {structured.verification_flags.map((flag) => (
                                    <li key={flag}>
                                        {getAiVerificationFlagLabel(flag)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Human Review Controls */}
                    <div className="border-t border-border-neutral pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-dark-neutral">
                                Penilaian Admin terhadap Hasil Analisis AI
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={reviewForm.processing}
                                    onClick={() => submitReview('AGREED')}
                                    aria-label="Tandai rekomendasi AI sesuai"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-leaf-green/40 bg-soft-green px-3 py-1.5 text-xs font-semibold text-forest-green transition hover:bg-leaf-green/20"
                                >
                                    <ThumbsUp className="size-3.5" />
                                    <span>Rekomendasi AI Sesuai</span>
                                </button>
                                <button
                                    type="button"
                                    aria-label="Tolak atau koreksi perkiraan tingkat keparahan AI"
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
                                    <span>Tolak / Koreksi Tingkat Keparahan</span>
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
                                            <option value="LOW">Rendah</option>
                                            <option value="MEDIUM">
                                                Sedang
                                            </option>
                                            <option value="HIGH">Tinggi</option>
                                            <option value="CRITICAL">
                                                Kritis
                                            </option>
                                            <option value="UNKNOWN">
                                                Belum Dapat Ditentukan
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-dark-neutral">
                                            Alasan Koreksi / Penolakan *
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
                                            placeholder="Contoh: Foto tidak sesuai lokasi atau kondisi lapangan berbeda"
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
                                        Simpan Catatan Pemeriksaan
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
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CheckCircle2 className="size-3.5 text-primary-green" />
                                            <span className="font-semibold text-dark-neutral">
                                                {rev.reviewer?.name ?? 'Admin'}
                                            </span>
                                            <span className="rounded bg-white px-2 py-0.5 text-[11px] font-bold text-dark-neutral">
                                                {AI_REVIEW_DECISION_LABELS[
                                                    rev.decision
                                                ] ?? rev.decision}
                                            </span>
                                            {rev.overridden_severity && (
                                                <span className="text-[11px] font-medium text-amber-800">
                                                    Koreksi:{' '}
                                                    {AI_SEVERITY_SHORT_LABELS[
                                                        rev.overridden_severity
                                                    ] ??
                                                        rev.overridden_severity}
                                                </span>
                                            )}
                                            {rev.feedback && (
                                                <span className="text-gray-neutral">
                                                    &mdash; {rev.feedback}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-neutral">
                                            {formatWibDateTime(rev.created_at)}
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
                        Riwayat Analisis AI pada Laporan Ini
                    </div>
                    <div className="mt-2 divide-y divide-border-neutral rounded-xl border border-border-neutral bg-pale-green/20">
                        {analyses.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-semibold text-dark-neutral">
                                        #{item.id}
                                    </span>
                                    <span>
                                        {AI_ANALYSIS_STATUS_LABELS[
                                            item.analysis_status
                                        ] ?? item.analysis_status}
                                    </span>
                                    <span className="rounded bg-white px-2 py-0.5 text-[11px] text-dark-neutral">
                                        {AI_SEVERITY_SHORT_LABELS[
                                            item.severity_recommendation
                                        ] ?? item.severity_recommendation}
                                    </span>
                                    {item.confidence_score !== null && (
                                        <span className="text-[11px] text-gray-neutral">
                                            Keyakinan:{' '}
                                            {formatPercentScore(
                                                item.confidence_score,
                                            )}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-neutral">
                                    {formatWibDateTime(item.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
