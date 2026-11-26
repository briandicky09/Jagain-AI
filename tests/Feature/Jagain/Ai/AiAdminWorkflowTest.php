<?php

use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\AiAnalysis;
use App\Models\AiDuplicateCandidate;
use App\Models\AiDuplicateDecision;
use App\Models\AiReviewHistory;
use App\Models\AuditLog;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use Illuminate\Support\Facades\Http;

test('non-admin users cannot trigger AI analysis, review AI outputs, or decide duplicates', function () {
    $community = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $agency = User::factory()->create(['role' => UserRole::AGENCY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $community->id,
        'category_id' => $category->id,
        'title' => 'Asap di gambut',
        'description' => 'Asap terlihat dari jalan poros desa.',
        'latitude' => -0.1,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Rasau Jaya',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $analysis = AiAnalysis::create([
        'report_id' => $report->id,
        'analysis_type' => 'MULTIMODAL_TRIAGE',
        'analysis_status' => 'COMPLETED',
        'schema_version' => '1.0',
        'model_name' => 'jagain-test',
        'model_version' => '1.0.0',
        'severity_recommendation' => 'MEDIUM',
        'confidence_type' => 'RULE_BASED',
        'requires_human_review' => true,
    ]);

    foreach ([$community, $agency] as $actor) {
        $this->actingAs($actor)
            ->post(route('admin.reports.ai.analyze', $report))
            ->assertForbidden();

        $this->actingAs($actor)
            ->post(route('admin.reports.ai.review', [$report, $analysis]), ['decision' => 'AGREED'])
            ->assertForbidden();
    }
});

test('admin can run AI analysis, record disagreement review, and decide duplicate without modifying original reports', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');

    $admin = User::factory()->create(['role' => UserRole::ADMIN]);
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut', 'is_active' => true]);

    $source = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Asap di Rasau Jaya Km 14',
        'description' => 'Asap tebal di lahan gambut dekat jalan.',
        'latitude' => -0.1558,
        'longitude' => 109.3872,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Rasau Jaya Km 14',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $candidateReport = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Kebakaran gambut Rasau Jaya',
        'description' => 'Asap pekat di sekitar Km 14 Rasau Jaya.',
        'latitude' => -0.1570,
        'longitude' => 109.3880,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Parit H Ali Rasau Jaya',
        'report_status' => ReportStatus::UNDER_REVIEW,
    ]);

    Http::fake([
        'http://127.0.0.1:8001/api/v1/privacy/redact' => Http::response([
            'schema_version' => '1.0',
            'detector_version' => 'jagain-pii-guardrail-v1.0',
            'pii_detected' => false,
            'redaction_applied' => false,
            'sanitized_title' => $source->title,
            'sanitized_description' => $source->description,
            'sanitized_location_description' => $source->location_description,
            'entity_counts' => [],
            'processing_duration_ms' => 1.5,
        ], 200),
        'http://127.0.0.1:8001/api/v1/triage/analyze' => Http::response([
            'analysis_version' => '1.0',
            'schema_version' => '1.0',
            'report_id' => $source->tracking_code,
            'incident_category' => 'PEATLAND_FIRE',
            'severity_recommendation' => 'HIGH',
            'severity_rationale' => ['Lahan gambut (+2)'],
            'summary' => 'Asap di lahan gambut.',
            'text_analysis' => [
                'potential_category' => 'PEATLAND_FIRE',
                'fire_indicators' => ['smoke_mentioned'],
                'vegetation_or_land_types' => ['lahan_gambut'],
                'weather_conditions' => [],
                'urgency_indicators' => [],
                'smoke_mentioned' => true,
                'flames_mentioned' => false,
                'missing_information' => [],
                'inconsistencies' => [],
            ],
            'image_analysis' => [
                'analyzed' => false,
                'adapter_status' => 'NO_IMAGE_PROVIDED',
                'model_name' => 'clip',
                'model_version' => 'v1',
                'smoke_detected' => false,
                'flame_detected' => false,
                'burned_vegetation_detected' => false,
                'forest_or_plantation_detected' => false,
                'appears_unrelated' => false,
                'image_quality' => 'UNAVAILABLE',
                'observation_note' => 'Tidak ada foto.',
                'limitations' => 'Hanya teks.',
            ],
            'consistency' => [
                'text_image_consistent' => null,
                'consistency_status' => 'NOT_EVALUATED',
                'notes' => 'Tidak ada foto.',
            ],
            'verification_flags' => ['LOCATION_REQUIRES_VERIFICATION'],
            'confidence' => 0.75,
            'confidence_type' => 'RULE_BASED',
            'confidence_explanation' => 'Rule-based.',
            'requires_human_review' => true,
            'model_name' => 'jagain-triage',
            'model_version' => '1.0.0',
            'processing_duration_ms' => 3.0,
        ], 200),
        'http://127.0.0.1:8001/api/v1/deduplication/analyze' => Http::response([
            'schema_version' => '1.0',
            'source_report' => (string) $source->id,
            'embedding_model' => 'paraphrase-multilingual-MiniLM-L12-v2',
            'model_version' => 'st-v1',
            'dimensions' => 384,
            'is_pretrained_ml' => true,
            'source_embedding' => array_fill(0, 384, 0.05),
            'source_content_hash' => str_repeat('b', 64),
            'potential_duplicates' => [[
                'report_id' => (string) $candidateReport->id,
                'semantic_similarity' => 0.91,
                'geospatial_score' => 0.95,
                'temporal_score' => 0.98,
                'category_score' => 1.0,
                'distance_meters' => 160.0,
                'time_difference_minutes' => 5.0,
                'duplicate_probability' => 0.94,
                'score_type' => 'SIMILARITY_SCORE',
                'recommendation' => 'LIKELY_DUPLICATE',
                'explanation' => 'Sangat mirip secara semantik dan berdekatan 160 m.',
            ]],
            'processing_duration_ms' => 15.0,
        ], 200),
    ]);

    $this->actingAs($admin);

    // 1. Trigger AI analysis
    $this->post(route('admin.reports.ai.analyze', $source))->assertRedirect();

    $analysis = AiAnalysis::where('report_id', $source->id)->latest()->first();
    expect($analysis)->not->toBeNull();
    // Official report status MUST remain SUBMITTED
    expect($source->fresh()->report_status)->toBe(ReportStatus::SUBMITTED);

    // 2. Record disagreement review
    $this->post(route('admin.reports.ai.review', [$source, $analysis]), [
        'decision' => 'DISAGREED',
        'overridden_severity' => 'MEDIUM',
        'feedback' => 'Setelah cek lokasi, asap hanya pembakaran kecil terkendali.',
    ])->assertRedirect();

    expect(AiReviewHistory::where('ai_analysis_id', $analysis->id)->where('decision', 'DISAGREED')->exists())->toBeTrue();
    expect(AuditLog::where('action', 'AI_ANALYSIS_REVIEWED')->exists())->toBeTrue();

    // 3. Confirm duplicate relationship without deleting/merging original reports
    $candidate = AiDuplicateCandidate::where('source_report_id', $source->id)->first();
    expect($candidate)->not->toBeNull();

    $this->post(route('admin.reports.ai.duplicate-decision', [$source, $candidate]), [
        'decision' => 'CONFIRMED_DUPLICATE',
        'reason' => 'Merujuk pada titik asap gambut yang sama di Km 14.',
    ])->assertRedirect();

    expect($candidate->fresh()->admin_decision)->toBe('CONFIRMED_DUPLICATE');
    expect(AiDuplicateDecision::where('ai_duplicate_candidate_id', $candidate->id)->count())->toBe(1);
    expect(Report::whereIn('id', [$source->id, $candidateReport->id])->count())->toBe(2);
    expect(AuditLog::where('action', 'AI_DUPLICATE_DECISION')->exists())->toBeTrue();

    // 4. Severity override without feedback reason must be rejected
    $this->post(route('admin.reports.ai.review', [$source, $analysis]), [
        'decision' => 'AGREED',
        'overridden_severity' => 'LOW',
        'feedback' => '',
    ])->assertSessionHasErrors(['feedback']);
});
