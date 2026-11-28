<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeReportJob;
use App\Models\AiAnalysis;
use App\Models\AiDuplicateCandidate;
use App\Models\AiDuplicateDecision;
use App\Models\AiReviewHistory;
use App\Models\Report;
use App\Services\Ai\ReportAiOrchestrator;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAiReportController extends Controller
{
    public function __construct(
        protected readonly ReportAiOrchestrator $orchestrator,
        protected readonly AuditLogService $auditLogService,
    ) {}

    public function analyze(Request $request, Report $report): RedirectResponse
    {
        if (config('ai.async_manual_analyze') || $request->boolean('async')) {
            AnalyzeReportJob::dispatch($report->id, $request->user()?->id);

            return back()->with('info', 'Permintaan analisis AI telah dimasukkan ke antrean latar belakang.');
        }

        $analysis = $this->orchestrator->analyzeReport($report, $request->user());

        if ($analysis->analysis_status === 'COMPLETED') {
            return back()->with('success', 'Analisis AI selesai dijalankan. Keputusan verifikasi tetap berada pada Administrator.');
        }

        return back()->with('error', 'Layanan AI sedang tidak tersedia atau mengembalikan kegagalan. Data laporan inti tetap aman.');
    }

    public function review(Request $request, Report $report, AiAnalysis $analysis): RedirectResponse
    {
        if ($analysis->report_id !== $report->id) {
            abort(404);
        }

        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:AGREED,DISAGREED,NEEDS_RECHECK'],
            'overridden_severity' => ['nullable', 'string', 'in:LOW,MEDIUM,HIGH,CRITICAL,UNKNOWN'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        if (($validated['decision'] === 'DISAGREED' || ! blank($validated['overridden_severity'] ?? null))
            && blank($validated['feedback'] ?? null)) {
            return back()->withErrors([
                'feedback' => 'Catatan alasan wajib diisi saat menolak rekomendasi atau mengubah tingkat keparahan AI.',
            ]);
        }

        $user = $request->user();

        DB::transaction(function () use ($analysis, $report, $user, $validated): void {
            $review = AiReviewHistory::create([
                'ai_analysis_id' => $analysis->id,
                'report_id' => $report->id,
                'reviewer_user_id' => $user->id,
                'decision' => $validated['decision'],
                'overridden_severity' => $validated['overridden_severity'] ?? null,
                'feedback' => $validated['feedback'] ?? null,
            ]);

            $this->auditLogService->log(
                actor: $user,
                action: 'AI_ANALYSIS_REVIEWED',
                entityType: 'AiReviewHistory',
                entityId: $review->id,
                before: null,
                after: [
                    'report_id' => $report->id,
                    'ai_analysis_id' => $analysis->id,
                    'decision' => $validated['decision'],
                    'overridden_severity' => $validated['overridden_severity'] ?? null,
                ],
                reason: $validated['feedback'] ?? "Admin menandai hasil AI sebagai {$validated['decision']}",
            );
        });

        return back()->with('success', 'Catatan pemeriksaan Anda terhadap hasil analisis AI telah disimpan.');
    }

    public function decideDuplicate(
        Request $request,
        Report $report,
        AiDuplicateCandidate $candidate,
    ): RedirectResponse {
        if ($candidate->source_report_id !== $report->id) {
            abort(404);
        }

        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:CONFIRMED_DUPLICATE,REJECTED'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($candidate, $report, $user, $validated): void {
            $beforeDecision = $candidate->admin_decision;

            $candidate->update([
                'admin_decision' => $validated['decision'],
                'decided_by_user_id' => $user->id,
                'decision_reason' => $validated['reason'],
                'decided_at' => now(),
            ]);

            AiDuplicateDecision::create([
                'ai_duplicate_candidate_id' => $candidate->id,
                'decided_by_user_id' => $user->id,
                'decision' => $validated['decision'],
                'reason' => $validated['reason'],
            ]);

            $this->auditLogService->log(
                actor: $user,
                action: 'AI_DUPLICATE_DECISION',
                entityType: 'AiDuplicateCandidate',
                entityId: $candidate->id,
                before: ['admin_decision' => $beforeDecision],
                after: [
                    'source_report_id' => $report->id,
                    'candidate_report_id' => $candidate->candidate_report_id,
                    'admin_decision' => $validated['decision'],
                ],
                reason: $validated['reason'],
            );
        });

        return back()->with('success', 'Keputusan terkait laporan serupa telah disimpan tanpa menghapus laporan asli.');
    }
}
