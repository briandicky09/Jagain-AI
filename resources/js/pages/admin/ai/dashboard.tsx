import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    BarChart3,
    Bot,
    CheckCircle2,
    Cpu,
    Play,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AI_MODEL_MODULE_LABELS,
    AI_MODEL_STATUS_LABELS,
    formatWibDateTime,
} from '@/lib/ai-terminology';

interface DashboardProps {
    serviceHealth: {
        status: string;
        service?: string;
        environment?: string;
        models?: Record<
            string,
            {
                name: string;
                backend: string;
                status: string;
                is_pretrained_ml: boolean;
                details?: string | null;
            }
        >;
        telemetry?: {
            pid?: number;
            uptime_seconds?: number;
            total_inferences?: number;
            total_errors?: number;
            error_rate?: number;
            avg_latency_ms?: number | null;
            p95_latency_ms?: number | null;
            memory_rss_mb?: number | null;
            last_successful_inference_at?: string | null;
        };
    };
    stats: {
        total_analyses: number;
        completed_analyses: number;
        failed_analyses: number;
        avg_duration_ms: number | null;
        total_duplicate_candidates: number;
        confirmed_duplicates: number;
        privacy_sanitized_reports: number;
        total_privacy_checks: number;
    };
    latestRun: {
        id: number;
        run_uuid: string;
        dataset_name: string;
        dataset_version: string;
        dataset_size: number;
        is_simulated_dataset: boolean;
        metrics: Record<string, any>;
        hardware_info: Record<string, any> | null;
        executed_at: string;
    } | null;
    latestBenchmarkFile: {
        run_uuid: string;
        executed_at: string;
        dataset_name: string;
        dataset_version: string;
        is_simulated_dataset: boolean;
        split: string;
        model_manifest: Record<string, any>;
        hardware_info: Record<string, any>;
        modules: Record<string, any>;
        notes: string[];
    } | null;
    evaluationRuns: Array<{
        id: number;
        run_uuid: string;
        dataset_name: string;
        dataset_size: number;
        is_simulated_dataset: boolean;
        executed_at: string;
        triggered_by?: { id: number; name: string } | null;
    }>;
}

export default function AiIntelligenceDashboard({
    serviceHealth,
    stats,
    latestRun,
    latestBenchmarkFile,
    evaluationRuns,
}: DashboardProps) {
    const page = usePage();
    const flash = (page.props as any).flash;
    const [runningEval, setRunningEval] = useState(false);

    const activeMetrics =
        latestRun?.metrics ?? latestBenchmarkFile?.modules ?? null;
    const activeMeta = latestRun
        ? {
              datasetName: latestRun.dataset_name,
              datasetVersion: latestRun.dataset_version,
              isSimulated: latestRun.is_simulated_dataset,
              executedAt: latestRun.executed_at,
          }
        : latestBenchmarkFile
          ? {
                datasetName: latestBenchmarkFile.dataset_name,
                datasetVersion: latestBenchmarkFile.dataset_version,
                isSimulated: latestBenchmarkFile.is_simulated_dataset,
                executedAt: latestBenchmarkFile.executed_at,
            }
          : null;

    const handleRunEvaluation = () => {
        setRunningEval(true);
        router.post(
            '/admin/ai-intelligence/evaluate',
            { split: 'test' },
            {
                preserveScroll: true,
                onFinish: () => setRunningEval(false),
            },
        );
    };

    const formatPct = (val?: number | null) =>
        typeof val === 'number' ? `${(val * 100).toFixed(1)}%` : 'Belum diukur';

    const formatMs = (val?: number | null) =>
        typeof val === 'number' ? `${val.toFixed(1)} ms` : 'Belum diukur';

    return (
        <>
            <Head title="Kinerja & Evaluasi AI — Admin JAGAIN" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {flash?.success && (
                    <div
                        role="status"
                        className="flex items-center gap-3 rounded-2xl border border-leaf-green/30 bg-soft-green/70 p-4 text-sm text-forest-green"
                    >
                        <CheckCircle2 className="size-5 shrink-0 text-primary-green" />
                        <span className="font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                    >
                        <AlertCircle className="size-5 shrink-0" />
                        <span className="font-medium">{flash.error}</span>
                    </div>
                )}

                <header className="flex flex-col justify-between gap-4 rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary-green">
                            <Bot className="size-4" />
                            <span>PEMANTAUAN &amp; EVALUASI KINERJA AI</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-dark-neutral sm:text-2xl">
                            Kinerja &amp; Evaluasi Sistem AI
                        </h1>
                        <p className="text-xs text-gray-neutral">
                            Menampilkan kesiapan layanan AI dan hasil pengujian
                            nyata pada data uji. Setiap metrik teknis disertai
                            penjelasan singkat dalam bahasa Indonesia.
                        </p>
                    </div>

                    <Button
                        type="button"
                        disabled={runningEval}
                        onClick={handleRunEvaluation}
                        className="rounded-xl bg-primary-green px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-forest-green"
                    >
                        <Play className="mr-1.5 size-3.5" />
                        <span>
                            {runningEval
                                ? 'Sedang Menjalankan Uji Evaluasi...'
                                : 'Jalankan Uji Evaluasi AI'}
                        </span>
                    </Button>
                </header>

                {/* Service Health & Telemetry */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-neutral">
                            <span>Status Layanan AI</span>
                            <Activity className="size-4 text-primary-green" />
                        </div>
                        <div className="mt-2 text-lg font-bold text-dark-neutral">
                            {serviceHealth.status === 'ok'
                                ? 'Aktif & Normal'
                                : 'Sedang Tidak Aktif'}
                        </div>
                        <p className="mt-1 text-xs text-gray-neutral">
                            {serviceHealth.status === 'ok'
                                ? 'Layanan analisis AI siap menerima permintaan'
                                : 'Layanan AI offline — perlindungan privasi dasar tetap aktif di Laravel'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-neutral">
                            <span>Status Analisis Laporan</span>
                            <Bot className="size-4 text-primary-green" />
                        </div>
                        <div className="mt-2 text-lg font-bold text-dark-neutral">
                            {stats.completed_analyses} / {stats.total_analyses}{' '}
                            selesai
                        </div>
                        <p className="mt-1 text-xs text-gray-neutral">
                            Gagal: {stats.failed_analyses} &bull; Rata-rata
                            waktu: {formatMs(stats.avg_duration_ms)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-neutral">
                            <span>Deteksi Laporan Serupa</span>
                            <BarChart3 className="size-4 text-primary-green" />
                        </div>
                        <div className="mt-2 text-lg font-bold text-dark-neutral">
                            {stats.total_duplicate_candidates} terdeteksi
                        </div>
                        <p className="mt-1 text-xs text-gray-neutral">
                            Dikonfirmasi Admin: {stats.confirmed_duplicates}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-neutral">
                            <span>Perlindungan Data Pribadi</span>
                            <ShieldCheck className="size-4 text-primary-green" />
                        </div>
                        <div className="mt-2 text-lg font-bold text-dark-neutral">
                            {stats.privacy_sanitized_reports} /{' '}
                            {stats.total_privacy_checks}
                        </div>
                        <p className="mt-1 text-xs text-gray-neutral">
                            Laporan terdeteksi &amp; disamarkan data pribadinya
                        </p>
                    </div>
                </div>

                {/* Model Status Cards */}
                {serviceHealth.models && (
                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-dark-neutral">
                            <Cpu className="size-4 text-primary-green" />
                            <span>Status Modul AI Aktif</span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {Object.entries(serviceHealth.models).map(
                                ([key, model]) => (
                                    <div
                                        key={key}
                                        className="rounded-xl border border-border-neutral bg-pale-green/30 p-3.5 text-xs"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-forest-green">
                                                {AI_MODEL_MODULE_LABELS[key] ??
                                                    key.toUpperCase()}
                                            </span>
                                            <span className="rounded border border-border-neutral bg-white px-2 py-0.5 text-[11px] font-medium text-dark-neutral">
                                                {AI_MODEL_STATUS_LABELS[
                                                    model.status
                                                ] ?? model.status}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 font-mono text-[11px] font-semibold break-all text-dark-neutral">
                                            {model.name}
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-neutral">
                                            {model.details}
                                        </p>
                                    </div>
                                ),
                            )}
                        </div>

                        {serviceHealth.telemetry && (
                            <div className="mt-4 grid gap-2.5 border-t border-border-neutral pt-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
                                <div className="rounded-lg border border-border-neutral bg-pale-green/20 px-3 py-2">
                                    <div className="text-[11px] text-gray-neutral">
                                        Lama Layanan Aktif
                                    </div>
                                    <div className="font-mono font-bold text-dark-neutral">
                                        {serviceHealth.telemetry
                                            .uptime_seconds ?? 0}{' '}
                                        detik
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border-neutral bg-pale-green/20 px-3 py-2">
                                    <div className="text-[11px] text-gray-neutral">
                                        Total Analisis AI / Gagal
                                    </div>
                                    <div className="font-mono font-bold text-dark-neutral">
                                        {serviceHealth.telemetry
                                            .total_inferences ?? 0}{' '}
                                        /{' '}
                                        {(
                                            (serviceHealth.telemetry
                                                .error_rate ?? 0) * 100
                                        ).toFixed(1)}
                                        %
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border-neutral bg-pale-green/20 px-3 py-2">
                                    <div className="text-[11px] text-gray-neutral">
                                        Kecepatan (Rata-rata / P95)
                                    </div>
                                    <div className="font-mono font-bold text-dark-neutral">
                                        {formatMs(
                                            serviceHealth.telemetry
                                                .avg_latency_ms,
                                        )}{' '}
                                        /{' '}
                                        {formatMs(
                                            serviceHealth.telemetry
                                                .p95_latency_ms,
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border-neutral bg-pale-green/20 px-3 py-2">
                                    <div className="text-[11px] text-gray-neutral">
                                        Penggunaan Memori (RSS)
                                    </div>
                                    <div className="font-mono font-bold text-dark-neutral">
                                        {typeof serviceHealth.telemetry
                                            .memory_rss_mb === 'number'
                                            ? `${serviceHealth.telemetry.memory_rss_mb.toFixed(1)} MB`
                                            : 'Belum diukur'}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border-neutral bg-pale-green/20 px-3 py-2">
                                    <div className="text-[11px] text-gray-neutral">
                                        Analisis Sukses Terakhir
                                    </div>
                                    <div
                                        className="truncate font-mono text-[11px] font-semibold text-dark-neutral"
                                        title={
                                            serviceHealth.telemetry
                                                .last_successful_inference_at ??
                                            undefined
                                        }
                                    >
                                        {serviceHealth.telemetry
                                            .last_successful_inference_at
                                            ? `${new Date(
                                                  serviceHealth.telemetry
                                                      .last_successful_inference_at,
                                              ).toLocaleTimeString('id-ID', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  second: '2-digit',
                                              })} WIB`
                                            : 'Belum ada'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Evaluation Metrics */}
                <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-neutral pb-3.5">
                        <div>
                            <h2 className="text-base font-bold text-dark-neutral">
                                Hasil Pengujian Kinerja AI
                            </h2>
                            {activeMeta ? (
                                <p className="mt-0.5 text-xs text-gray-neutral">
                                    {activeMeta.datasetName} (v
                                    {activeMeta.datasetVersion}) &bull;{' '}
                                    {activeMeta.isSimulated
                                        ? 'Dataset Uji Terkurasi'
                                        : 'Dataset Operasional'}{' '}
                                    &bull; Dijalankan:{' '}
                                    {formatWibDateTime(activeMeta.executedAt)}
                                </p>
                            ) : (
                                <p className="mt-0.5 text-xs text-gray-neutral">
                                    Belum ada pengujian kinerja AI yang
                                    dijalankan. Klik &ldquo;Jalankan Uji
                                    Evaluasi AI&rdquo; di atas untuk mengukur.
                                </p>
                            )}
                        </div>
                    </div>

                    {!activeMetrics ? (
                        <div className="mt-4 rounded-xl border border-dashed border-border-neutral bg-pale-green/40 p-6 text-center text-xs text-gray-neutral">
                            Belum Ada Data. Sistem hanya menampilkan angka hasil
                            pengujian nyata setelah uji evaluasi dijalankan.
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {/* Triage */}
                            <div className="rounded-xl border border-border-neutral bg-pale-green/25 p-4 text-xs">
                                <div className="font-bold text-dark-neutral">
                                    1. Perkiraan Tingkat Keparahan &amp;
                                    Pengelompokan Laporan
                                </div>
                                {activeMetrics.triage?.measured ? (
                                    <div className="mt-2 space-y-1.5">
                                        <div>
                                            Jumlah data uji:{' '}
                                            <strong>
                                                {
                                                    activeMetrics.triage
                                                        .dataset_size
                                                }
                                            </strong>{' '}
                                            kasus
                                        </div>
                                        <div>
                                            Ketepatan Hasil AI (Macro
                                            Precision):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.triage
                                                        .precision,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Kemampuan Menemukan Laporan (Macro
                                            Recall):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.triage.recall,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Skor Gabungan Ketepatan &amp;
                                            Cakupan (Macro F1-Score):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.triage
                                                        .f1_score,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Kecepatan Analisis (Latensi Median /
                                            P95):{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.triage.latency
                                                        ?.median_ms,
                                                )}
                                            </strong>{' '}
                                            /{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.triage.latency
                                                        ?.p95_ms,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-gray-neutral">
                                        Belum diukur
                                    </p>
                                )}
                            </div>

                            {/* Deduplication */}
                            <div className="rounded-xl border border-border-neutral bg-pale-green/25 p-4 text-xs">
                                <div className="font-bold text-dark-neutral">
                                    2. Deteksi Laporan Serupa (Kemiripan Teks
                                    &amp; Lokasi)
                                </div>
                                {activeMetrics.deduplication?.measured ? (
                                    <div className="mt-2 space-y-1.5">
                                        <div>
                                            Jumlah data uji:{' '}
                                            <strong>
                                                {
                                                    activeMetrics.deduplication
                                                        .dataset_size
                                                }
                                            </strong>{' '}
                                            pasangan laporan
                                        </div>
                                        <div>
                                            Model:{' '}
                                            <span className="font-mono">
                                                {
                                                    activeMetrics.deduplication
                                                        .model_name
                                                }
                                            </span>
                                        </div>
                                        <div>
                                            Ketepatan Hasil AI (Precision@1):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.deduplication
                                                        .precision_at_1,
                                                )}
                                            </strong>{' '}
                                            &bull; Kemampuan Menemukan Laporan
                                            (Recall@1):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.deduplication
                                                        .recall_at_1,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            F1-Score:{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.deduplication
                                                        .f1_score,
                                                )}
                                            </strong>{' '}
                                            &bull; Hasil Terdeteksi Keliru
                                            (FPR):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.deduplication
                                                        .false_positive_rate,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Kecepatan Analisis (Latensi Median /
                                            P95):{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.deduplication
                                                        .latency?.median_ms,
                                                )}
                                            </strong>{' '}
                                            /{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.deduplication
                                                        .latency?.p95_ms,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-gray-neutral">
                                        Belum diukur
                                    </p>
                                )}
                            </div>

                            {/* Privacy */}
                            <div className="rounded-xl border border-border-neutral bg-pale-green/25 p-4 text-xs">
                                <div className="font-bold text-dark-neutral">
                                    3. Perlindungan &amp; Penyensoran Data
                                    Pribadi (PII)
                                </div>
                                {activeMetrics.privacy?.measured ? (
                                    <div className="mt-2 space-y-1.5">
                                        <div>
                                            Jumlah data uji:{' '}
                                            <strong>
                                                {
                                                    activeMetrics.privacy
                                                        .dataset_size
                                                }
                                            </strong>{' '}
                                            kasus
                                        </div>
                                        <div>
                                            Ketepatan Hasil AI (Precision):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.privacy
                                                        .precision,
                                                )}
                                            </strong>{' '}
                                            &bull; Kemampuan Menemukan Data
                                            Pribadi (Recall):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.privacy
                                                        .recall,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            F1-Score:{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.privacy
                                                        .f1_score,
                                                )}
                                            </strong>{' '}
                                            &bull; Kelengkapan Penyensoran:{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.privacy
                                                        .redaction_completeness,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Hasil Terdeteksi Keliru (False
                                            Positive Rate):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.privacy
                                                        .false_positive_rate,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-gray-neutral">
                                        Belum diukur
                                    </p>
                                )}
                            </div>

                            {/* Vision */}
                            <div className="rounded-xl border border-border-neutral bg-pale-green/25 p-4 text-xs">
                                <div className="font-bold text-dark-neutral">
                                    4. Analisis Foto Bukti (CLIP Zero-Shot)
                                </div>
                                {activeMetrics.vision?.measured ? (
                                    <div className="mt-2 space-y-1.5">
                                        <div>
                                            Jumlah data uji:{' '}
                                            <strong>
                                                {
                                                    activeMetrics.vision
                                                        .dataset_size
                                                }
                                            </strong>{' '}
                                            gambar sintetis
                                        </div>
                                        <div>
                                            Model:{' '}
                                            <span className="font-mono">
                                                {
                                                    activeMetrics.vision
                                                        .model_name
                                                }
                                            </span>
                                        </div>
                                        <div>
                                            Ketepatan Hasil AI (Macro
                                            Precision):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.vision
                                                        .precision,
                                                )}
                                            </strong>{' '}
                                            &bull; Kemampuan Menemukan Laporan
                                            (Recall):{' '}
                                            <strong>
                                                {formatPct(
                                                    activeMetrics.vision.recall,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            Kecepatan Analisis (Latensi Median /
                                            P95):{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.vision.latency
                                                        ?.median_ms,
                                                )}
                                            </strong>{' '}
                                            /{' '}
                                            <strong>
                                                {formatMs(
                                                    activeMetrics.vision.latency
                                                        ?.p95_ms,
                                                )}
                                            </strong>
                                        </div>
                                        <p className="text-[11px] text-gray-neutral">
                                            {activeMetrics.vision.note}
                                        </p>
                                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                                            Status Pengujian Foto Lapangan Asli:
                                            Belum Diukur (saat ini baru diuji
                                            pada gambar contoh sintetis; masih
                                            membutuhkan dataset foto kebakaran
                                            asli yang berlisensi).
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-gray-neutral">
                                        {activeMetrics.vision?.reason ??
                                            'Belum diukur'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Evaluation History */}
                {evaluationRuns.length > 0 && (
                    <div className="rounded-2xl border border-border-neutral bg-white p-5 shadow-xs sm:p-6">
                        <h3 className="text-sm font-bold text-dark-neutral">
                            Riwayat Pengujian Kinerja AI
                        </h3>
                        <div className="mt-3 divide-y divide-border-neutral rounded-xl border border-border-neutral">
                            {evaluationRuns.map((run) => (
                                <div
                                    key={run.id}
                                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs"
                                >
                                    <div>
                                        <span className="font-mono font-semibold text-dark-neutral">
                                            {run.run_uuid.slice(0, 8)}
                                        </span>
                                        <span className="ml-2 text-dark-neutral">
                                            {run.dataset_name}
                                        </span>
                                        <span className="ml-2 text-gray-neutral">
                                            ({run.dataset_size} kasus)
                                        </span>
                                    </div>
                                    <div className="text-gray-neutral">
                                        {run.triggered_by?.name ?? 'Sistem'}{' '}
                                        &bull;{' '}
                                        {formatWibDateTime(run.executed_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
