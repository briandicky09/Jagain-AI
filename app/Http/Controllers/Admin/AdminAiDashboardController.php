<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAnalysis;
use App\Models\AiDuplicateCandidate;
use App\Models\AiEvaluationRun;
use App\Models\AiPrivacyRecord;
use App\Services\Ai\AiServiceClient;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiDashboardController extends Controller
{
    public function __construct(
        protected readonly AiServiceClient $aiClient,
        protected readonly AuditLogService $auditLogService,
    ) {}

    public function index(): Response
    {
        $health = $this->aiClient->health();

        $latestBenchmarkPath = base_path('ai-service/evaluation/reports/latest_benchmark.json');
        $latestBenchmarkFile = null;
        if (is_file($latestBenchmarkPath)) {
            $decoded = json_decode((string) file_get_contents($latestBenchmarkPath), true);
            if (is_array($decoded)) {
                $latestBenchmarkFile = $decoded;
            }
        }

        $evaluationRuns = AiEvaluationRun::query()
            ->with('triggeredBy:id,name')
            ->latest('executed_at')
            ->limit(10)
            ->get();

        $latestRun = $evaluationRuns->first();

        $stats = [
            'total_analyses' => AiAnalysis::count(),
            'completed_analyses' => AiAnalysis::where('analysis_status', 'COMPLETED')->count(),
            'failed_analyses' => AiAnalysis::where('analysis_status', 'FAILED')->count(),
            'avg_duration_ms' => AiAnalysis::where('analysis_status', 'COMPLETED')->avg('processing_duration_ms'),
            'total_duplicate_candidates' => AiDuplicateCandidate::count(),
            'confirmed_duplicates' => AiDuplicateCandidate::where('admin_decision', 'CONFIRMED_DUPLICATE')->count(),
            'privacy_sanitized_reports' => AiPrivacyRecord::where('redaction_applied', true)->count(),
            'total_privacy_checks' => AiPrivacyRecord::count(),
        ];

        return Inertia::render('admin/ai/dashboard', [
            'serviceHealth' => $health,
            'stats' => $stats,
            'latestRun' => $latestRun,
            'latestBenchmarkFile' => $latestBenchmarkFile,
            'evaluationRuns' => $evaluationRuns,
        ]);
    }

    public function evaluate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'split' => ['nullable', 'string', 'in:all,dev,test'],
        ]);

        $split = $validated['split'] ?? 'test';

        try {
            $res = $this->aiClient->runEvaluation([
                'modules' => ['triage', 'deduplication', 'privacy', 'vision'],
                'split' => $split,
            ]);

            $modules = is_array($res['modules'] ?? null) ? $res['modules'] : [];
            $totalSize = 0;
            foreach ($modules as $mod) {
                if (is_array($mod) && isset($mod['dataset_size'])) {
                    $totalSize += (int) $mod['dataset_size'];
                }
            }

            $run = AiEvaluationRun::create([
                'run_uuid' => (string) $res['run_uuid'],
                'module' => 'ALL',
                'dataset_name' => (string) ($res['dataset_name'] ?? 'JAGAIN AI Benchmark'),
                'dataset_version' => (string) ($res['dataset_version'] ?? '1.0.0'),
                'dataset_size' => $totalSize,
                'is_simulated_dataset' => (bool) ($res['is_simulated_dataset'] ?? true),
                'model_manifest' => is_array($res['model_manifest'] ?? null) ? $res['model_manifest'] : [],
                'metrics' => $modules,
                'hardware_info' => is_array($res['hardware_info'] ?? null) ? $res['hardware_info'] : [],
                'notes' => isset($res['notes']) && is_array($res['notes']) ? implode(' ', $res['notes']) : null,
                'triggered_by_user_id' => $request->user()->id,
                'executed_at' => now(),
            ]);

            $this->auditLogService->log(
                actor: $request->user(),
                action: 'AI_EVALUATION_EXECUTED',
                entityType: 'AiEvaluationRun',
                entityId: $run->id,
                before: null,
                after: [
                    'run_uuid' => $run->run_uuid,
                    'split' => $split,
                    'dataset_size' => $run->dataset_size,
                ],
                reason: 'Menjalankan pipeline evaluasi model AI JAGAIN',
            );

            return back()->with('success', 'Evaluasi benchmark AI selesai dijalankan dan hasil pengukuran disimpan.');
        } catch (\Throwable $e) {
            Log::warning('AI evaluation execution failed', [
                'exception' => $e::class,
            ]);

            return back()->with('error', 'Gagal menjalankan evaluasi AI karena layanan AI tidak tersedia atau mengembalikan kesalahan.');
        }
    }
}
