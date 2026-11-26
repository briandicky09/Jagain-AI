<?php

use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\AiAnalysis;
use App\Models\AiDuplicateCandidate;
use App\Models\AuditLog;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use App\Services\Ai\AiServiceClient;
use App\Services\Ai\AiServiceException;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\Http;

test('ai service client fails closed when service secret is empty without breaking citizen submission', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.service_secret', '');

    $client = app(AiServiceClient::class);
    expect($client->health())->toBe(['status' => 'misconfigured']);

    $thrown = false;
    try {
        $client->redactPii(['description' => 'Asap tebal']);
    } catch (AiServiceException $e) {
        $thrown = true;
        expect($e->errorCode)->toBe('AI_MISCONFIGURED');
    }
    expect($thrown)->toBeTrue();

    config()->set('ai.auto_analyze_on_submit', true);
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut-fail-closed', 'is_active' => true]);

    $this->actingAs($citizen)->post(route('citizen.reports.store'), [
        'category_id' => $category->id,
        'title' => 'Asap tebal saat secret kosong',
        'description' => 'Asap tebal di pinggir jalan poros Rasau Jaya.',
        'latitude' => -0.1,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Km 14 Rasau Jaya',
        'safety_acknowledged' => true,
    ])->assertRedirect();

    expect(Report::where('title', 'Asap tebal saat secret kosong')->exists())->toBeTrue();
});

test('public web responses include defensive security headers', function () {
    $response = $this->get(route('home'));

    $response->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
});

test('public report endpoint denies private and restricted reports with 404', function () {
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Hutan', 'slug' => 'hutan-vis', 'is_active' => true]);

    foreach (['PRIVATE', 'RESTRICTED'] as $visibility) {
        $report = Report::create([
            'created_by_user_id' => $citizen->id,
            'category_id' => $category->id,
            'title' => "Laporan {$visibility}",
            'description' => 'Laporan terbatas yang tidak boleh diakses publik.',
            'latitude' => -0.1,
            'longitude' => 109.4,
            'province' => 'Kalimantan Barat',
            'regency_city' => 'Kabupaten Kubu Raya',
            'location_description' => 'Kubu Raya',
            'report_status' => ReportStatus::VERIFIED,
            'visibility' => $visibility,
        ]);

        $this->get(route('public.reports.show', $report->tracking_code))->assertNotFound();
    }
});

test('guests are redirected and non-admin users receive 403 on all admin AI endpoints', function () {
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $agency = User::factory()->create(['role' => UserRole::AGENCY]);
    $category = ReportCategory::create(['name' => 'Semak', 'slug' => 'semak-auth', 'is_active' => true]);

    $source = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Laporan sumber',
        'description' => 'Deskripsi asap sumber laporan.',
        'latitude' => -0.1,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Ambawang',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $other = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Laporan kandidat',
        'description' => 'Deskripsi asap kandidat laporan.',
        'latitude' => -0.101,
        'longitude' => 109.401,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Ambawang',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $analysis = AiAnalysis::create([
        'report_id' => $source->id,
        'analysis_type' => 'MULTIMODAL_TRIAGE',
        'analysis_status' => 'COMPLETED',
        'schema_version' => '1.0',
        'model_name' => 'jagain-test',
        'model_version' => '1.0.0',
        'severity_recommendation' => 'LOW',
        'confidence_type' => 'RULE_BASED',
        'requires_human_review' => true,
    ]);

    $candidate = AiDuplicateCandidate::create([
        'source_report_id' => $source->id,
        'candidate_report_id' => $other->id,
        'semantic_similarity' => 0.85,
        'distance_meters' => 120.0,
        'time_difference_minutes' => 10.0,
        'duplicate_probability' => 0.88,
        'recommendation' => 'LIKELY_DUPLICATE',
        'admin_decision' => 'PENDING',
    ]);

    $this->get(route('admin.ai.dashboard'))->assertRedirect(route('login'));
    $this->post(route('admin.ai.evaluate'))->assertRedirect(route('login'));
    $this->post(route('admin.reports.ai.analyze', $source))->assertRedirect(route('login'));
    $this->post(route('admin.reports.ai.review', [$source, $analysis]))->assertRedirect(route('login'));
    $this->post(route('admin.reports.ai.duplicate-decision', [$source, $candidate]))->assertRedirect(route('login'));

    foreach ([$citizen, $agency] as $actor) {
        $this->actingAs($actor)->get(route('admin.ai.dashboard'))->assertForbidden();
        $this->actingAs($actor)->post(route('admin.ai.evaluate'))->assertForbidden();
        $this->actingAs($actor)->post(route('admin.reports.ai.analyze', $source))->assertForbidden();
        $this->actingAs($actor)->post(route('admin.reports.ai.review', [$source, $analysis]), ['decision' => 'AGREED'])->assertForbidden();
        $this->actingAs($actor)->post(route('admin.reports.ai.duplicate-decision', [$source, $candidate]), ['decision' => 'REJECTED', 'reason' => 'Bukan duplikat'])->assertForbidden();
    }
});

test('audit log service recursively redacts secrets, tokens, and PII keys', function () {
    $admin = User::factory()->create(['role' => UserRole::ADMIN]);

    $log = app(AuditLogService::class)->log(
        actor: $admin,
        action: 'SECURITY_REDACTION_CHECK',
        entityType: 'Report',
        entityId: 999,
        before: [
            'status' => 'SUBMITTED',
            'reporter_name' => 'Rahasia Warga',
            'nested' => [
                'ai_service_secret' => 'top-secret-value',
                'token' => 'bearer-xyz',
                'nik' => '6171012304900001',
            ],
        ],
        after: [
            'status' => 'UNDER_REVIEW',
            'api_key' => 'key-123',
        ],
        reason: 'Audit redaction test',
    );

    $stored = AuditLog::findOrFail($log->id);
    expect($stored->before_snapshot['reporter_name'])->toBe('[REDACTED]');
    expect($stored->before_snapshot['nested']['ai_service_secret'])->toBe('[REDACTED]');
    expect($stored->before_snapshot['nested']['token'])->toBe('[REDACTED]');
    expect($stored->before_snapshot['nested']['nik'])->toBe('[REDACTED]');
    expect($stored->before_snapshot['status'])->toBe('SUBMITTED');
    expect($stored->after_snapshot['api_key'])->toBe('[REDACTED]');
});

test('admin ai evaluate error message does not expose raw internal exception text', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');
    $admin = User::factory()->create(['role' => UserRole::ADMIN]);

    Http::fake([
        '*' => Http::response('INTERNAL_STACK_TRACE_SECRET_123', 500),
    ]);

    $response = $this->actingAs($admin)->post(route('admin.ai.evaluate'), ['split' => 'test']);
    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect((string) session('error'))->not->toContain('INTERNAL_STACK_TRACE_SECRET_123');
    expect((string) session('error'))->not->toContain('HTTP 500');
});
