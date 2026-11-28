<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\User;
use App\Services\Ai\ReportAiOrchestrator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class AnalyzeReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    /** @var array<int, int> */
    public array $backoff = [10, 30];

    public int $timeout = 60;

    public function __construct(
        public readonly int $reportId,
        public readonly ?int $actorUserId = null,
    ) {}

    public function handle(ReportAiOrchestrator $orchestrator): void
    {
        $report = Report::find($this->reportId);
        if (! $report) {
            return;
        }

        $actor = $this->actorUserId ? User::find($this->actorUserId) : null;
        $orchestrator->analyzeReport($report, $actor);
    }

    public function failed(Throwable $e): void
    {
        Log::warning('AnalyzeReportJob failed', [
            'report_id' => $this->reportId,
            'exception' => $e::class,
            'message' => mb_substr($e->getMessage(), 0, 200),
        ]);
    }
}
