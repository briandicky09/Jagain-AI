<?php

use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Jobs\AnalyzeReportJob;
use App\Models\Agency;
use App\Models\AgencyMembership;
use App\Models\Assignment;
use App\Models\ExternalObservation;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use App\Services\Ai\ReportAiOrchestrator;
use App\Services\AssignmentService;
use App\Services\ReportTransitionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

test('citizen submission queues AnalyzeReportJob and notifies admins', function () {
    Queue::fake();

    config()->set('ai.enabled', true);
    config()->set('ai.auto_analyze_on_submit', true);
    config()->set('ai.queue_enabled', true);

    $admin = User::factory()->create([
        'role' => UserRole::ADMIN->value,
        'email_verified_at' => now(),
    ]);

    $citizen = User::factory()->create([
        'role' => UserRole::COMMUNITY->value,
        'email_verified_at' => now(),
    ]);

    $category = ReportCategory::create([
        'name' => 'Lahan Gambut',
        'slug' => 'lahan-gambut',
        'description' => 'Kebakaran gambut',
        'is_active' => true,
    ]);

    $response = $this->actingAs($citizen)->post('/lapor', [
        'title' => 'Asap tebal lahan gambut Rasau',
        'description' => 'Terlihat asap tebal dan api kecil di sekitar parit gambut warga.',
        'category_id' => $category->id,
        'latitude' => -0.1832,
        'longitude' => 109.3871,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kubu Raya',
        'location_description' => 'Dekat parit sekunder Rasau Jaya',
        'safety_acknowledged' => true,
    ]);

    $response->assertRedirect();

    Queue::assertPushed(AnalyzeReportJob::class);
    expect($admin->fresh()->notifications()->count())->toBe(1);
    expect($admin->fresh()->notifications()->first()->data['event_type'])->toBe('NEW_REPORT');
});

test('workflow notifications fire across transitions, assignments, OPD responses, and respect read isolation', function () {
    $admin = User::factory()->create([
        'role' => UserRole::ADMIN->value,
        'email_verified_at' => now(),
    ]);

    $citizen = User::factory()->create([
        'role' => UserRole::COMMUNITY->value,
        'email_verified_at' => now(),
    ]);

    $opdUser = User::factory()->create([
        'role' => UserRole::AGENCY->value,
        'email_verified_at' => now(),
    ]);

    $agency = Agency::create([
        'name' => 'BPBD Kalbar',
        'agency_type' => 'BPBD',
        'jurisdiction' => 'Kalimantan Barat',
        'is_active' => true,
    ]);

    AgencyMembership::create([
        'user_id' => $opdUser->id,
        'agency_id' => $agency->id,
        'role_in_agency' => 'OPERATOR',
        'membership_status' => 'ACTIVE',
    ]);

    $category = ReportCategory::create([
        'name' => 'Semak Belukar',
        'slug' => 'semak-belukar',
        'is_active' => true,
    ]);

    $report = Report::create([
        'tracking_code' => 'JGN-202611-NTF01',
        'report_number' => 'JGN-202611-NTF01',
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Api di batas kebun sawit',
        'description' => 'Kebakaran semak di pinggir jalan desa sepanjang 50 meter.',
        'latitude' => -0.2,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Mempawah',
        'location_description' => 'Pinggir jalan poros desa',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $transition = app(ReportTransitionService::class);
    $transition->transition($report, ReportStatus::UNDER_REVIEW, $admin, 'Mulai peninjauan');
    $transition->transition($report, ReportStatus::VERIFIED, $admin, 'Lokasi tervalidasi');

    expect($citizen->fresh()->unreadNotifications()->count())->toBe(2);

    $assignment = app(AssignmentService::class)->assign($report->fresh(), $agency, $admin, 'Segera cek lokasi');
    expect($opdUser->fresh()->unreadNotifications()->count())->toBe(1);
    expect($opdUser->fresh()->notifications()->first()->data['event_type'])->toBe('AGENCY_ASSIGNED');

    app(AssignmentService::class)->respondToAssignment($assignment, $opdUser, true);
    expect($admin->fresh()->unreadNotifications()->count())->toBe(1);
    expect($admin->fresh()->notifications()->first()->data['event_type'])->toBe('OPD_RESPONSE');

    // Cross-user isolation: citizen cannot mark OPD notification as read
    $opdNotifId = $opdUser->fresh()->notifications()->first()->id;
    $this->actingAs($citizen)->post("/notifications/{$opdNotifId}/read")->assertNotFound();

    // OPD marks own notification as read
    $this->actingAs($opdUser)->post("/notifications/{$opdNotifId}/read")->assertRedirect();
    expect($opdUser->fresh()->unreadNotifications()->count())->toBe(0);

    // Citizen marks all as read
    $this->actingAs($citizen)->post('/notifications/read-all')->assertRedirect();
    expect($citizen->fresh()->unreadNotifications()->count())->toBe(0);
});

test('AnalyzeReportJob invokes orchestrator safely when report exists', function () {
    $citizen = User::factory()->create([
        'role' => UserRole::COMMUNITY->value,
        'email_verified_at' => now(),
    ]);

    $report = Report::create([
        'tracking_code' => 'JGN-202611-JOB01',
        'report_number' => 'JGN-202611-JOB01',
        'created_by_user_id' => $citizen->id,
        'title' => 'Laporan uji antrean AI',
        'description' => 'Asap terlihat di tepi hutan gambut sejak siang.',
        'latitude' => -0.1,
        'longitude' => 109.5,
        'province' => 'Kalimantan Barat',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $mock = Mockery::mock(ReportAiOrchestrator::class);
    $mock->shouldReceive('analyzeReport')->once();
    app()->instance(ReportAiOrchestrator::class, $mock);

    (new AnalyzeReportJob($report->id, $citizen->id))->handle($mock);
});

test('jagain:sync-firms command ingests CSV hotspots cleanly and skips when key is unset', function () {
    config()->set('services.nasa_firms.map_key', '');
    $this->artisan('jagain:sync-firms')->assertExitCode(0);
    expect(ExternalObservation::count())->toBe(0);

    config()->set('services.nasa_firms.map_key', 'test-firms-key');
    $csv = implode("\n", [
        'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
        '-0.18320,109.38710,335.6,0.4,0.4,2026-11-28,0615,N,VIIRS,h,2.0NRT,295.1,18.4,D',
        '-1.20000,113.80000,322.1,0.5,0.5,2026-11-28,0620,N,VIIRS,nominal,2.0NRT,291.0,9.2,D',
    ]);

    Http::fake([
        'firms.modaps.eosdis.nasa.gov/*' => Http::response($csv, 200),
    ]);

    $this->artisan('jagain:sync-firms')->assertExitCode(0);
    expect(ExternalObservation::where('is_simulated', false)->count())->toBe(2);

    // Re-running deduplicates via external_record_id
    $this->artisan('jagain:sync-firms')->assertExitCode(0);
    expect(ExternalObservation::where('is_simulated', false)->count())->toBe(2);
});

test('printable report summary enforces RBAC for admin and assigned OPD', function () {
    $admin = User::factory()->create(['role' => UserRole::ADMIN->value, 'email_verified_at' => now()]);
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY->value, 'email_verified_at' => now()]);
    $opdUser = User::factory()->create(['role' => UserRole::AGENCY->value, 'email_verified_at' => now()]);
    $otherOpd = User::factory()->create(['role' => UserRole::AGENCY->value, 'email_verified_at' => now()]);

    $agencyA = Agency::create(['name' => 'BPBD Kalbar', 'agency_type' => 'BPBD', 'jurisdiction' => 'Kalimantan Barat', 'is_active' => true]);
    $agencyB = Agency::create(['name' => 'BPBD Kalteng', 'agency_type' => 'BPBD', 'jurisdiction' => 'Kalimantan Tengah', 'is_active' => true]);

    AgencyMembership::create(['user_id' => $opdUser->id, 'agency_id' => $agencyA->id, 'role_in_agency' => 'OPERATOR', 'membership_status' => 'ACTIVE']);
    AgencyMembership::create(['user_id' => $otherOpd->id, 'agency_id' => $agencyB->id, 'role_in_agency' => 'OPERATOR', 'membership_status' => 'ACTIVE']);

    $report = Report::create([
        'tracking_code' => 'JGN-202611-PRT01',
        'report_number' => 'JGN-202611-PRT01',
        'created_by_user_id' => $citizen->id,
        'title' => 'Laporan cetak resmi',
        'description' => 'Titik api terdeteksi pada lahan gambut dekat parit.',
        'latitude' => -0.15,
        'longitude' => 109.45,
        'province' => 'Kalimantan Barat',
        'report_status' => ReportStatus::DISPATCHED,
    ]);

    $assignment = Assignment::create([
        'report_id' => $report->id,
        'agency_id' => $agencyA->id,
        'assigned_by_user_id' => $admin->id,
        'assignment_status' => 'ASSIGNED',
        'assigned_at' => now(),
    ]);

    $this->actingAs($admin)->get("/admin/reports/{$report->id}/print")
        ->assertOk()
        ->assertSee('Berita Acara Ringkasan Laporan')
        ->assertSee('JGN-202611-PRT01');

    $this->actingAs($citizen)->get("/admin/reports/{$report->id}/print")->assertForbidden();

    $this->actingAs($opdUser)->get("/opd/tugas/{$assignment->id}/print")
        ->assertOk()
        ->assertSee('JGN-202611-PRT01');

    $this->actingAs($otherOpd)->get("/opd/tugas/{$assignment->id}/print")->assertForbidden();
});
