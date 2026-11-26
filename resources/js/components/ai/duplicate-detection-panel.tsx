import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Check, CopyCheck, MapPin, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AI_DUPLICATE_ADMIN_DECISION_LABELS,
    AI_DUPLICATE_RECOMMENDATION_LABELS,
    formatPercentScore,
} from '@/lib/ai-terminology';
import { show as reportShow } from '@/routes/admin/reports';
import type {
    AiDuplicateCandidateRecord,
    AiDuplicateRecommendation,
} from '@/types/ai';

interface DuplicateDetectionPanelProps {
    reportId: number;
    candidates: AiDuplicateCandidateRecord[];
}

const recStyles: Record<AiDuplicateRecommendation, string> = {
    LIKELY_DUPLICATE: 'border-amber-300 bg-amber-50 text-amber-900',
    POSSIBLE_DUPLICATE: 'border-leaf-green/40 bg-soft-green text-forest-green',
    UNRELATED: 'border-border-neutral bg-zinc-100 text-gray-neutral',
    INSUFFICIENT_INFORMATION:
        'border-border-neutral bg-pale-green text-dark-neutral',
};

export function DuplicateDetectionPanel({
    reportId,
    candidates,
}: DuplicateDetectionPanelProps) {
    const [activeCandidateId, setActiveCandidateId] = useState<number | null>(
        null,
    );
    const [pendingDecision, setPendingDecision] = useState<
        'CONFIRMED_DUPLICATE' | 'REJECTED'
    >('CONFIRMED_DUPLICATE');

    const decisionForm = useForm({
        decision: 'CONFIRMED_DUPLICATE',
        reason: '',
    });

    const openDecisionModal = (
        candidateId: number,
        decision: 'CONFIRMED_DUPLICATE' | 'REJECTED',
    ) => {
        setActiveCandidateId(candidateId);
        setPendingDecision(decision);
        decisionForm.setData({ decision, reason: '' });
    };

    const submitDecision = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCandidateId) return;
        decisionForm.post(
            `/admin/reports/${reportId}/ai/duplicates/${activeCandidateId}/decision`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveCandidateId(null);
                    decisionForm.reset();
                },
            },
        );
    };

    return (
        <section
            aria-label="Panel Deteksi Laporan Serupa"
            className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6"
        >
            <div className="flex items-start gap-2.5 border-b border-border-neutral pb-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft-green text-primary-green">
                    <CopyCheck className="size-5" />
                </div>
                <div>
                    <h2 className="text-base font-bold tracking-tight text-dark-neutral">
                        Deteksi Laporan Serupa
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-neutral">
                        Menampilkan laporan lain yang memiliki kemiripan cerita,
                        lokasi berdekatan, waktu kejadian hampir sama, atau
                        kategori yang sama. Laporan asli tidak pernah digabung
                        atau dihapus otomatis.
                    </p>
                </div>
            </div>

            {candidates.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border-neutral bg-pale-green/40 p-5 text-center text-xs text-gray-neutral">
                    Belum ditemukan laporan lain yang mirip dari hasil analisis
                    AI terbaru.
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {candidates.map((cand) => {
                        const target = cand.candidate_report;
                        return (
                            <div
                                key={cand.id}
                                className="rounded-xl border border-border-neutral bg-pale-green/25 p-4"
                            >
                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                                                    recStyles[
                                                        cand.recommendation
                                                    ] ?? recStyles.UNRELATED
                                                }`}
                                            >
                                                {AI_DUPLICATE_RECOMMENDATION_LABELS[
                                                    cand.recommendation
                                                ] ?? cand.recommendation}
                                            </span>
                                            <span className="text-xs font-bold text-forest-green">
                                                Tingkat Kemiripan Gabungan:{' '}
                                                {formatPercentScore(
                                                    cand.duplicate_probability,
                                                )}
                                            </span>
                                            <span className="rounded border border-border-neutral bg-white px-2 py-0.5 text-[11px] font-medium text-dark-neutral">
                                                Status:{' '}
                                                {AI_DUPLICATE_ADMIN_DECISION_LABELS[
                                                    cand.admin_decision
                                                ] ?? cand.admin_decision}
                                            </span>
                                        </div>

                                        <div className="text-sm font-bold text-dark-neutral">
                                            {target ? (
                                                <Link
                                                    href={
                                                        reportShow(target.id)
                                                            .url
                                                    }
                                                    className="hover:text-primary-green hover:underline"
                                                >
                                                    #{target.id}{' '}
                                                    {target.tracking_code
                                                        ? `(${target.tracking_code})`
                                                        : ''}{' '}
                                                    &mdash; {target.title}
                                                </Link>
                                            ) : (
                                                <span>
                                                    Laporan #
                                                    {cand.candidate_report_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openDecisionModal(
                                                    cand.id,
                                                    'CONFIRMED_DUPLICATE',
                                                )
                                            }
                                            className="inline-flex items-center gap-1 rounded-xl border border-leaf-green/40 bg-soft-green px-2.5 py-1.5 text-xs font-semibold text-forest-green hover:bg-leaf-green/20"
                                        >
                                            <Check className="size-3.5" />
                                            <span>Tandai Laporan Serupa</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openDecisionModal(
                                                    cand.id,
                                                    'REJECTED',
                                                )
                                            }
                                            className="inline-flex items-center gap-1 rounded-xl border border-border-neutral bg-white px-2.5 py-1.5 text-xs font-semibold text-dark-neutral hover:bg-zinc-100"
                                        >
                                            <X className="size-3.5" />
                                            <span>Bukan Laporan Serupa</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-gray-neutral">
                                    <span>
                                        Tingkat Kemiripan Teks:{' '}
                                        <strong className="text-dark-neutral">
                                            {formatPercentScore(
                                                cand.semantic_similarity,
                                            )}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="size-3 text-primary-green" />
                                        Jarak Lokasi:{' '}
                                        <strong className="text-dark-neutral">
                                            {cand.distance_meters >= 1000
                                                ? `${(cand.distance_meters / 1000).toFixed(2)} km`
                                                : `${Math.round(cand.distance_meters)} m`}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="size-3 text-primary-green" />
                                        Selisih Waktu:{' '}
                                        <strong className="text-dark-neutral">
                                            {Math.round(
                                                cand.time_difference_minutes,
                                            )}{' '}
                                            menit
                                        </strong>
                                    </span>
                                </div>

                                {cand.explanation && (
                                    <p className="mt-1.5 text-xs text-dark-neutral">
                                        {cand.explanation}
                                    </p>
                                )}

                                {cand.decision_reason && (
                                    <div className="mt-2 rounded-lg border border-border-neutral bg-white p-2 text-xs text-dark-neutral">
                                        <span className="font-semibold">
                                            Alasan Keputusan Admin:
                                        </span>{' '}
                                        {cand.decision_reason}
                                    </div>
                                )}

                                {activeCandidateId === cand.id && (
                                    <form
                                        onSubmit={submitDecision}
                                        className="mt-3 space-y-2 rounded-xl border border-border-neutral bg-white p-3"
                                    >
                                        <label className="block text-xs font-semibold text-dark-neutral">
                                            Alasan Keputusan (
                                            {pendingDecision ===
                                            'CONFIRMED_DUPLICATE'
                                                ? 'Tandai sebagai Laporan Serupa'
                                                : 'Bukan Laporan Serupa'}
                                            ) *
                                        </label>
                                        <input
                                            type="text"
                                            value={decisionForm.data.reason}
                                            onChange={(e) =>
                                                decisionForm.setData(
                                                    'reason',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Catat alasan keputusan Anda untuk riwayat pemeriksaan..."
                                            className="w-full rounded-xl border border-border-neutral px-3 py-1.5 text-xs text-dark-neutral"
                                        />
                                        {decisionForm.errors.reason && (
                                            <p className="text-xs text-rose-700">
                                                {decisionForm.errors.reason}
                                            </p>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveCandidateId(null)
                                                }
                                                className="rounded-xl border border-border-neutral px-3 py-1.5 text-xs font-semibold text-dark-neutral"
                                            >
                                                Batal
                                            </button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    decisionForm.processing ||
                                                    decisionForm.data.reason.trim()
                                                        .length < 5
                                                }
                                                className="rounded-xl bg-primary-green px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-green"
                                            >
                                                Simpan Keputusan
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
