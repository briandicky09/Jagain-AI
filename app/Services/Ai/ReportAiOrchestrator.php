<?php

namespace App\Services\Ai;

use App\Models\AiAnalysis;
use App\Models\AiDuplicateCandidate;
use App\Models\AiEmbedding;
use App\Models\AiPrivacyRecord;
use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReportAiOrchestrator
{
    public function __construct(
        protected readonly AiServiceClient $aiClient,
        protected readonly LocalPiiFallbackSanitizer $fallbackSanitizer,
        protected readonly ImageMetadataStripper $imageStripper,
        protected readonly AuditLogService $auditLogService,
    ) {}

    /**
     * Run full AI pipeline (Privacy Guardrail -> Multimodal Triage -> Deduplication)
     * without ever breaking core report submission or modifying official statuses.
     */
    public function analyzeReport(Report $report, ?User $actor = null): AiAnalysis
    {
        $requestId = (string) Str::uuid();
        $report->loadMissing(['category', 'evidence']);

        // 1. Privacy Guardrail (PII Detection & Redaction)
        $privacyRecord = $this->runPrivacyGuardrail($report, $requestId);

        $sanitizedTitle = $privacyRecord->sanitized_title ?? $report->title;
        $sanitizedDescription = $privacyRecord->sanitized_description ?? $report->description;
        $sanitizedLocation = $privacyRecord->sanitized_location_description ?? $report->location_description;

        // 2. Multimodal Triage (using ONLY sanitized text + safely bounded local image)
        $analysis = $this->runMultimodalTriage(
            report: $report,
            sanitizedTitle: $sanitizedTitle,
            sanitizedDescription: $sanitizedDescription,
            sanitizedLocation: $sanitizedLocation,
            actor: $actor,
            requestId: $requestId,
        );

        // 3. Semantic & Geospatial Deduplication (using ONLY sanitized text)
        $this->runDeduplication(
            report: $report,
            sanitizedTitle: $sanitizedTitle,
            sanitizedDescription: $sanitizedDescription,
            requestId: $requestId,
        );

        // 4. Audit log without PII
        try {
            $this->auditLogService->log(
                actor: $actor,
                action: 'AI_ANALYSIS_EXECUTED',
                entityType: 'AiAnalysis',
                entityId: $analysis->id,
                before: null,
                after: [
                    'report_id' => $report->id,
                    'analysis_status' => $analysis->analysis_status,
                    'severity_recommendation' => $analysis->severity_recommendation,
                    'model_version' => $analysis->model_version,
                    'pii_detected' => $privacyRecord->pii_detected,
                ],
                reason: 'Analisis kecerdasan artifisial dijalankan sebagai alat bantu verifikasi admin',
                requestId: $requestId,
            );
        } catch (\Throwable $e) {
            Log::warning('Failed writing AI audit log', ['exception' => $e::class, 'request_id' => $requestId]);
        }

        return $analysis;
    }

    public function runPrivacyGuardrail(Report $report, ?string $requestId = null): AiPrivacyRecord
    {
        $reqId = $requestId ?? (string) Str::uuid();

        try {
            $res = $this->aiClient->redactPii([
                'report_id' => (string) ($report->tracking_code ?? $report->id),
                'title' => (string) $report->title,
                'description' => (string) $report->description,
                'location_description' => $report->location_description,
            ], $reqId);

            return AiPrivacyRecord::updateOrCreate(
                ['report_id' => $report->id],
                [
                    'pii_detected' => (bool) ($res['pii_detected'] ?? false),
                    'redaction_applied' => (bool) ($res['redaction_applied'] ?? false),
                    'entity_counts' => is_array($res['entity_counts'] ?? null) ? $res['entity_counts'] : [],
                    'sanitized_title' => (string) ($res['sanitized_title'] ?? $report->title),
                    'sanitized_description' => (string) ($res['sanitized_description'] ?? $report->description),
                    'sanitized_location_description' => $res['sanitized_location_description'] ?? $report->location_description,
                    'detector_version' => (string) ($res['detector_version'] ?? 'ai-service'),
                    'request_id' => $reqId,
                    'processed_at' => now(),
                ]
            );
        } catch (\Throwable) {
            // Defense in depth: never let AI downtime leave PII unredacted
            $local = $this->fallbackSanitizer->sanitizeReportFields(
                (string) $report->title,
                (string) $report->description,
                $report->location_description,
            );

            return AiPrivacyRecord::updateOrCreate(
                ['report_id' => $report->id],
                [
                    'pii_detected' => $local['pii_detected'],
                    'redaction_applied' => $local['redaction_applied'],
                    'entity_counts' => $local['entity_counts'],
                    'sanitized_title' => $local['sanitized_title'],
                    'sanitized_description' => $local['sanitized_description'],
                    'sanitized_location_description' => $local['sanitized_location_description'],
                    'detector_version' => $local['detector_version'],
                    'request_id' => $reqId,
                    'processed_at' => now(),
                ]
            );
        }
    }

    protected function runMultimodalTriage(
        Report $report,
        string $sanitizedTitle,
        string $sanitizedDescription,
        ?string $sanitizedLocation,
        ?User $actor,
        string $requestId,
    ): AiAnalysis {
        $imageBase64 = null;
        $imageFilename = null;
        $hasImage = $report->evidence->isNotEmpty();

        if ($hasImage) {
            [$imageBase64, $imageFilename] = $this->encodeFirstEvidenceImage($report);
        }

        $categoryModel = $report->category()->first();
        $categoryLabel = $categoryModel !== null
            ? $categoryModel->name
            : $report->getRawOriginal('category');
        $categoryLabel = is_string($categoryLabel) ? $categoryLabel : null;

        $payload = [
            'report_id' => (string) ($report->tracking_code ?? $report->id),
            'title' => $sanitizedTitle,
            'description' => $sanitizedDescription,
            'category' => $categoryLabel,
            'location_description' => $sanitizedLocation,
            'additional_information' => $report->additional_information !== null
                ? $this->fallbackSanitizer->redactText($report->additional_information)
                : null,
            'latitude' => (float) $report->latitude,
            'longitude' => (float) $report->longitude,
            'reported_occurrence_at' => $report->reported_occurrence_at?->toIso8601String(),
            'has_evidence_image' => $hasImage,
            'image_base64' => $imageBase64,
            'image_filename' => $imageFilename,
        ];

        try {
            $res = $this->aiClient->analyzeTriage($payload, $requestId);

            return AiAnalysis::create([
                'report_id' => $report->id,
                'analysis_type' => 'MULTIMODAL_TRIAGE',
                'analysis_status' => 'COMPLETED',
                'schema_version' => (string) ($res['schema_version'] ?? '1.0'),
                'model_name' => (string) ($res['model_name'] ?? 'jagain-ai'),
                'model_version' => (string) ($res['model_version'] ?? '1.0.0'),
                'severity_recommendation' => (string) ($res['severity_recommendation'] ?? 'UNKNOWN'),
                'confidence_score' => isset($res['confidence']) ? (float) $res['confidence'] : null,
                'confidence_type' => (string) ($res['confidence_type'] ?? 'RULE_BASED'),
                'requires_human_review' => true, // Enforced unconditionally
                'structured_result' => $res,
                'processing_duration_ms' => isset($res['processing_duration_ms']) ? (float) $res['processing_duration_ms'] : null,
                'request_id' => $requestId,
                'triggered_by_user_id' => $actor?->id,
            ]);
        } catch (AiServiceException $e) {
            return AiAnalysis::create([
                'report_id' => $report->id,
                'analysis_type' => 'MULTIMODAL_TRIAGE',
                'analysis_status' => 'FAILED',
                'schema_version' => '1.0',
                'model_name' => 'ai-service-unavailable',
                'model_version' => 'unavailable',
                'severity_recommendation' => 'UNKNOWN',
                'confidence_score' => null,
                'confidence_type' => 'UNCALIBRATED',
                'requires_human_review' => true,
                'structured_result' => null,
                'request_id' => $requestId,
                'error_code' => $e->errorCode,
                'error_message' => $e->getMessage(),
                'triggered_by_user_id' => $actor?->id,
            ]);
        }
    }

    protected function runDeduplication(
        Report $report,
        string $sanitizedTitle,
        string $sanitizedDescription,
        string $requestId,
    ): void {
        try {
            $windowHours = (int) config('ai.duplicate_window_hours', 72);
            $radiusKm = (float) config('ai.duplicate_radius_km', 25.0);
            $latDelta = $radiusKm / 111.0;
            $lonDelta = $radiusKm / 111.0;

            $refTime = $report->created_at ?? now();

            $candidates = Report::query()
                ->where('id', '!=', $report->id)
                ->whereBetween('latitude', [$report->latitude - $latDelta, $report->latitude + $latDelta])
                ->whereBetween('longitude', [$report->longitude - $lonDelta, $report->longitude + $lonDelta])
                ->whereBetween('created_at', [
                    $refTime->copy()->subHours($windowHours),
                    $refTime->copy()->addHours($windowHours),
                ])
                ->with(['category', 'privacyRecord', 'aiEmbeddings' => fn ($q) => $q->latest('generated_at')])
                ->limit(30)
                ->get();

            $candidatePayloads = $candidates->map(function (Report $cand): array {
                $candCatModel = $cand->relationLoaded('category') ? $cand->getRelation('category') : null;
                $candCatStr = $candCatModel instanceof Category
                    ? $candCatModel->slug
                    : $cand->getRawOriginal('category');
                $candCatStr = is_string($candCatStr) ? $candCatStr : null;
                $priv = $cand->privacyRecord;
                $candTitle = ($priv !== null && $priv->sanitized_title !== null)
                    ? $priv->sanitized_title
                    : $this->fallbackSanitizer->redactText((string) $cand->title);
                $candDesc = ($priv !== null && $priv->sanitized_description !== null)
                    ? $priv->sanitized_description
                    : $this->fallbackSanitizer->redactText((string) $cand->description);
                $latestEmbedding = $cand->aiEmbeddings->first();

                return [
                    'report_id' => (string) $cand->id,
                    'title' => $candTitle,
                    'description' => $candDesc,
                    'category' => $candCatStr,
                    'latitude' => (float) $cand->latitude,
                    'longitude' => (float) $cand->longitude,
                    'created_at' => ($cand->created_at ?? now())->toIso8601String(),
                    'embedding_vector' => $latestEmbedding?->embedding_vector,
                ];
            })->values()->all();

            $sourceCatModel = $report->category()->first();
            $sourceCatStr = $sourceCatModel !== null
                ? $sourceCatModel->slug
                : $report->getRawOriginal('category');
            $sourceCatStr = is_string($sourceCatStr) ? $sourceCatStr : null;

            $res = $this->aiClient->detectDuplicates([
                'source_report' => [
                    'report_id' => (string) $report->id,
                    'title' => $sanitizedTitle,
                    'description' => $sanitizedDescription,
                    'category' => $sourceCatStr,
                    'latitude' => (float) $report->latitude,
                    'longitude' => (float) $report->longitude,
                    'created_at' => $refTime->toIso8601String(),
                ],
                'candidates' => $candidatePayloads,
            ], $requestId);

            DB::transaction(function () use ($report, $res): void {
                $embeddingModel = (string) ($res['embedding_model'] ?? 'unknown');
                $modelVersion = (string) ($res['model_version'] ?? 'unknown');
                $vector = is_array($res['source_embedding'] ?? null) ? $res['source_embedding'] : [];

                if ($vector !== []) {
                    AiEmbedding::updateOrCreate(
                        [
                            'report_id' => $report->id,
                            'embedding_model' => $embeddingModel,
                            'model_version' => $modelVersion,
                        ],
                        [
                            'dimensions' => (int) ($res['dimensions'] ?? count($vector)),
                            'content_hash' => (string) ($res['source_content_hash'] ?? ''),
                            'is_pretrained_ml' => (bool) ($res['is_pretrained_ml'] ?? false),
                            'embedding_vector' => $vector,
                            'generated_at' => now(),
                        ]
                    );
                }

                $potentialDuplicates = is_array($res['potential_duplicates'] ?? null) ? $res['potential_duplicates'] : [];
                foreach ($potentialDuplicates as $candRes) {
                    if (! is_array($candRes) || ! isset($candRes['report_id'])) {
                        continue;
                    }
                    $candidateReportId = (int) $candRes['report_id'];
                    if ($candidateReportId <= 0 || $candidateReportId === $report->id) {
                        continue;
                    }

                    $recommendation = (string) ($candRes['recommendation'] ?? 'UNRELATED');
                    if ($recommendation === 'UNRELATED' && (float) ($candRes['duplicate_probability'] ?? 0.0) < 0.35) {
                        continue;
                    }

                    AiDuplicateCandidate::updateOrCreate(
                        [
                            'source_report_id' => $report->id,
                            'candidate_report_id' => $candidateReportId,
                        ],
                        [
                            'semantic_similarity' => (float) ($candRes['semantic_similarity'] ?? 0.0),
                            'geospatial_score' => isset($candRes['geospatial_score']) ? (float) $candRes['geospatial_score'] : null,
                            'temporal_score' => isset($candRes['temporal_score']) ? (float) $candRes['temporal_score'] : null,
                            'category_score' => isset($candRes['category_score']) ? (float) $candRes['category_score'] : null,
                            'distance_meters' => (float) ($candRes['distance_meters'] ?? 0.0),
                            'time_difference_minutes' => (float) ($candRes['time_difference_minutes'] ?? 0.0),
                            'duplicate_probability' => (float) ($candRes['duplicate_probability'] ?? 0.0),
                            'recommendation' => $recommendation,
                            'explanation' => $candRes['explanation'] ?? null,
                            'model_version' => $modelVersion,
                        ]
                    );
                }
            });
        } catch (\Throwable $e) {
            Log::warning('AI deduplication skipped due to error', [
                'report_id' => $report->id,
                'request_id' => $requestId,
                'exception' => $e::class,
            ]);
        }
    }

    /**
     * @return array{0: string|null, 1: string|null}
     */
    protected function encodeFirstEvidenceImage(Report $report): array
    {
        $maxBytes = (int) config('ai.max_image_bytes', 5242880);

        foreach ($report->evidence as $ev) {
            $rawRel = $ev->storage_key ?? $ev->file_path;
            if (! is_string($rawRel) || $rawRel === '') {
                continue;
            }
            $rel = ltrim(str_replace('/storage/', '', $rawRel), '/');
            if (! Storage::disk('public')->exists($rel)) {
                continue;
            }
            $size = Storage::disk('public')->size($rel);
            if ($size <= 0 || $size > $maxBytes) {
                continue;
            }
            $contents = Storage::disk('public')->get($rel);
            if (! is_string($contents) || $contents === '') {
                continue;
            }

            $stripped = $this->imageStripper->strip($contents);
            if ($stripped === null) {
                continue;
            }

            return [base64_encode($stripped), $ev->original_filename];
        }

        return [null, null];
    }
}
