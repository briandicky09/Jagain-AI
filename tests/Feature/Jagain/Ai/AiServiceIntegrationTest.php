<?php

use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\AiAnalysis;
use App\Models\AiPrivacyRecord;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use App\Services\Ai\ReportAiOrchestrator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Support\Facades\Http;

test('orchestrator sends authenticated request with sanitized text and persists structured analysis', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');
    config()->set('ai.service_secret', 'integration-test-secret');

    $user = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $admin = User::factory()->create(['role' => UserRole::ADMIN]);
    $category = ReportCategory::create(['name' => 'Lahan Gambut', 'slug' => 'lahan-gambut', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $user->id,
        'category_id' => $category->id,
        'title' => 'Asap pekat di Rasau Jaya',
        'description' => 'Nama saya Andi Pratama, HP 081234567890. Terlihat asap tebal di gambut.',
        'latitude' => -0.1558,
        'longitude' => 109.3872,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Desa Rasau Jaya Tiga',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    Http::fake([
        'http://127.0.0.1:8001/api/v1/privacy/redact' => Http::response([
            'schema_version' => '1.0',
            'detector_version' => 'jagain-pii-guardrail-v1.0',
            'pii_detected' => true,
            'redaction_applied' => true,
            'sanitized_title' => 'Asap pekat di Rasau Jaya',
            'sanitized_description' => 'Nama saya [REDACTED_NAME], HP [REDACTED_PHONE]. Terlihat asap tebal di gambut.',
            'sanitized_location_description' => 'Desa Rasau Jaya Tiga',
            'entity_counts' => ['PERSON_NAME' => 1, 'PHONE' => 1],
            'processing_duration_ms' => 2.5,
        ], 200),
        'http://127.0.0.1:8001/api/v1/triage/analyze' => Http::response([
            'analysis_version' => '1.0',
            'schema_version' => '1.0',
            'report_id' => $report->tracking_code,
            'incident_category' => 'PEATLAND_FIRE',
            'severity_recommendation' => 'HIGH',
            'severity_rationale' => ['Lahan gambut (+2)', 'Asap tebal (+1)'],
            'summary' => 'Ringkasan triase AI pada lahan gambut.',
            'text_analysis' => [
                'potential_category' => 'PEATLAND_FIRE',
                'fire_indicators' => ['smoke_mentioned'],
                'vegetation_or_land_types' => ['lahan_gambut'],
                'weather_conditions' => [],
                'urgency_indicators' => ['risiko_api_bawah_permukaan_gambut'],
                'smoke_mentioned' => true,
                'flames_mentioned' => false,
                'missing_information' => ['fire_extent'],
                'inconsistencies' => [],
            ],
            'image_analysis' => [
                'analyzed' => false,
                'adapter_status' => 'NO_IMAGE_PROVIDED',
                'model_name' => 'openai/clip-vit-base-patch32',
                'model_version' => 'clip-zeroshot-v1',
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
            'confidence' => 0.80,
            'confidence_type' => 'RULE_BASED',
            'confidence_explanation' => 'Skor kelengkapan aturan.',
            'requires_human_review' => true,
            'model_name' => 'jagain-multimodal-triage-rules+clip',
            'model_version' => '1.0.0',
            'processing_duration_ms' => 4.2,
        ], 200),
        'http://127.0.0.1:8001/api/v1/deduplication/analyze' => Http::response([
            'schema_version' => '1.0',
            'source_report' => (string) $report->id,
            'embedding_model' => 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
            'model_version' => 'st-v1',
            'dimensions' => 384,
            'is_pretrained_ml' => true,
            'source_embedding' => array_fill(0, 384, 0.05),
            'source_content_hash' => str_repeat('a', 64),
            'potential_duplicates' => [],
            'processing_duration_ms' => 11.4,
        ], 200),
    ]);

    $analysis = app(ReportAiOrchestrator::class)->analyzeReport($report, $admin);

    expect($analysis->analysis_status)->toBe('COMPLETED');
    expect($analysis->severity_recommendation)->toBe('HIGH');
    expect($analysis->requires_human_review)->toBeTrue();
    expect($report->fresh()->report_status)->toBe(ReportStatus::SUBMITTED);

    Http::assertSent(function (HttpClientRequest $req): bool {
        if ($req->url() === 'http://127.0.0.1:8001/api/v1/triage/analyze') {
            $body = $req->data();

            return $req->hasHeader('X-AI-Service-Secret', 'integration-test-secret')
                && $req->hasHeader('X-Request-ID')
                && ! str_contains((string) ($body['description'] ?? ''), 'Andi Pratama')
                && ! str_contains((string) ($body['description'] ?? ''), '081234567890');
        }

        return true;
    });

    $privacy = AiPrivacyRecord::where('report_id', $report->id)->first();
    expect($privacy)->not->toBeNull();
    expect($privacy->pii_detected)->toBeTrue();
});

test('orchestrator handles ai service timeout and invalid schema without breaking core workflow', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');
    config()->set('ai.retry_times', 0);

    $user = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Semak Belukar', 'slug' => 'semak', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $user->id,
        'category_id' => $category->id,
        'title' => 'Asap di semak belukar',
        'description' => 'Terlihat asap tebal di pinggir jalan, kontak 081234567890.',
        'latitude' => -0.1,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Km 18 Ambawang',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    Http::fake([
        'http://127.0.0.1:8001/api/v1/privacy/redact' => fn () => throw new ConnectionException('Timeout'),
        'http://127.0.0.1:8001/api/v1/triage/analyze' => Http::response(['invalid' => 'payload'], 200),
        'http://127.0.0.1:8001/api/v1/deduplication/analyze' => Http::response([], 503),
    ]);

    $analysis = app(ReportAiOrchestrator::class)->analyzeReport($report, $user);

    expect($analysis)->toBeInstanceOf(AiAnalysis::class);
    expect($analysis->analysis_status)->toBe('FAILED');
    expect($analysis->error_code)->toBe('AI_SCHEMA_MISMATCH');
    expect($report->fresh()->report_status)->toBe(ReportStatus::SUBMITTED);

    // Fallback sanitizer still protected privacy record even when AI service timed out
    $privacy = AiPrivacyRecord::where('report_id', $report->id)->first();
    expect($privacy)->not->toBeNull();
    expect($privacy->sanitized_description)->not->toContain('081234567890');
    expect($privacy->sanitized_description)->toContain('[REDACTED_PHONE]');
});

test('citizen report submission succeeds even when auto_analyze_on_submit is enabled and AI service is unreachable', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.auto_analyze_on_submit', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');
    config()->set('ai.retry_times', 0);

    Http::fake([
        '*' => fn () => throw new ConnectionException('Service down'),
    ]);

    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Perkebunan', 'slug' => 'perkebunan', 'is_active' => true]);

    $this->actingAs($citizen);

    $response = $this->post(route('citizen.reports.store'), [
        'category_id' => $category->id,
        'title' => 'Asap kebun sawit saat layanan AI mati',
        'description' => 'Terlihat kepulan asap di area kebun sawit warga.',
        'latitude' => -0.05,
        'longitude' => 109.35,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Desa Punggur Besar',
        'safety_acknowledged' => true,
    ]);

    $report = Report::where('title', 'Asap kebun sawit saat layanan AI mati')->first();
    expect($report)->not->toBeNull();
    $response->assertRedirect(route('citizen.reports.show', ['tracking_code' => $report->tracking_code]));
});
