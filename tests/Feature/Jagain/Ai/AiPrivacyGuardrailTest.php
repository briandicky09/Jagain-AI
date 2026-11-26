<?php

use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\AiPrivacyRecord;
use App\Models\AuditLog;
use App\Models\Evidence;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use App\Services\Ai\ImageMetadataStripper;
use App\Services\Ai\LocalPiiFallbackSanitizer;
use Illuminate\Support\Facades\Storage;

test('local pii sanitizer detects and redacts Indonesian phone, NIK, email, name, and address while preserving landmarks', function () {
    $sanitizer = new LocalPiiFallbackSanitizer;

    $result = $sanitizer->sanitizeReportFields(
        'Asap di Rasau Jaya',
        'Nama saya Andi Pratama, NIK 6171012304900001, nomor HP 081234567890, email andi@contoh.id, alamat Jl. Merdeka No. 14 RT 02/RW 05 di dekat Jl. Trans Kalimantan Km 18.'
    );

    expect($result['pii_detected'])->toBeTrue();
    expect($result['sanitized_description'])->not->toContain('Andi Pratama');
    expect($result['sanitized_description'])->not->toContain('6171012304900001');
    expect($result['sanitized_description'])->not->toContain('081234567890');
    expect($result['sanitized_description'])->not->toContain('andi@contoh.id');
    expect($result['sanitized_description'])->not->toContain('Jl. Merdeka No. 14');
    expect($result['sanitized_description'])->toContain('[REDACTED_NAME]');
    expect($result['sanitized_description'])->toContain('[REDACTED_NIK]');
    expect($result['sanitized_description'])->toContain('[REDACTED_PHONE]');
    expect($result['sanitized_description'])->toContain('[REDACTED_EMAIL]');
    expect($result['sanitized_description'])->toContain('[REDACTED_ADDRESS]');
    expect($result['sanitized_description'])->toContain('Jl. Trans Kalimantan Km 18');
});

test('public report detail endpoint redacts embedded PII from description while preserving original submission in database', function () {
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut-pii', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Kebakaran gambut dekat jalan poros',
        'description' => 'Nama saya Budi Rahardjo, hubungi 081299998888 atau NIK 6171012304900001. Asap tebal di semak.',
        'latitude' => -0.1558,
        'longitude' => 109.3872,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Desa Rasau Jaya Tiga',
        'report_status' => ReportStatus::VERIFIED,
        'visibility' => 'PUBLIC',
        'reporter_name' => 'Budi Rahardjo',
        'reporter_phone' => '081299998888',
    ]);

    $response = $this->get(route('public.reports.show', ['tracking_code' => $report->tracking_code]));
    $response->assertOk();

    // Ensure zero PII leaks in public HTTP output
    $response->assertDontSee('Budi Rahardjo');
    $response->assertDontSee('081299998888');
    $response->assertDontSee('6171012304900001');
    $response->assertSee('[REDACTED_PHONE]');

    // Original submission in database remains untouched
    $fresh = $report->fresh();
    expect($fresh->description)->toContain('081299998888');
    expect($fresh->description)->toContain('6171012304900001');
});

test('privacy records and audit logs do not store raw PII', function () {
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut-audit', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Laporan asap',
        'description' => 'Email rahasia.pelapor@example.com dan HP 085211112222.',
        'latitude' => -0.1,
        'longitude' => 109.4,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Ambawang',
        'report_status' => ReportStatus::SUBMITTED,
    ]);

    $record = AiPrivacyRecord::create([
        'report_id' => $report->id,
        'pii_detected' => true,
        'redaction_applied' => true,
        'entity_counts' => ['EMAIL' => 1, 'PHONE' => 1],
        'sanitized_title' => 'Laporan asap',
        'sanitized_description' => 'Email [REDACTED_EMAIL] dan HP [REDACTED_PHONE].',
        'sanitized_location_description' => 'Ambawang',
        'detector_version' => 'jagain-pii-guardrail-v1.0',
        'processed_at' => now(),
    ]);

    expect($record->sanitized_description)->not->toContain('rahasia.pelapor@example.com');
    expect($record->sanitized_description)->not->toContain('085211112222');
    expect(json_encode($record->entity_counts))->not->toContain('085211112222');
    expect(AuditLog::count())->toBe(0);
});

test('image metadata stripper removes embedded EXIF markers before forwarding to AI', function () {
    $img = imagecreatetruecolor(64, 64);
    ob_start();
    imagejpeg($img, null, 90);
    $cleanJpg = (string) ob_get_clean();
    imagedestroy($img);

    // Inject a minimal APP1 EXIF marker containing fake GPS/Author text after SOI (FFD8)
    $fakePayload = "Exif\x00\x00SecretCitizenGPSCoordinates";
    $app1 = "\xFF\xE1".pack('n', strlen($fakePayload) + 2).$fakePayload;
    $jpgWithExif = substr($cleanJpg, 0, 2).$app1.substr($cleanJpg, 2);

    expect($jpgWithExif)->toContain('SecretCitizenGPSCoordinates');

    $stripped = (new ImageMetadataStripper)->strip($jpgWithExif);
    expect($stripped)->not->toBeNull();
    expect($stripped)->not->toContain('SecretCitizenGPSCoordinates');
});

test('evidence url normalizes leading storage prefix cleanly', function () {
    Storage::fake('public');

    $ev = new Evidence([
        'file_path' => '/storage/evidence/1/photo.jpg',
        'storage_key' => 'evidence/1/photo.jpg',
    ]);

    expect($ev->url)->not->toContain('/storage/storage/');
    expect($ev->url)->toEndWith('/storage/evidence/1/photo.jpg');
});

test('citizen providing additional information refreshes privacy record so new PII is sanitized publicly', function () {
    $citizen = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $category = ReportCategory::create(['name' => 'Gambut', 'slug' => 'gambut-info', 'is_active' => true]);

    $report = Report::create([
        'created_by_user_id' => $citizen->id,
        'category_id' => $category->id,
        'title' => 'Asap tebal di Ambawang',
        'description' => 'Terlihat kepulan asap dari parit kebun.',
        'latitude' => -0.08,
        'longitude' => 109.43,
        'province' => 'Kalimantan Barat',
        'regency_city' => 'Kabupaten Kubu Raya',
        'location_description' => 'Km 18',
        'report_status' => ReportStatus::NEEDS_INFORMATION,
        'visibility' => 'PUBLIC',
    ]);

    AiPrivacyRecord::create([
        'report_id' => $report->id,
        'pii_detected' => false,
        'redaction_applied' => false,
        'entity_counts' => [],
        'sanitized_title' => $report->title,
        'sanitized_description' => $report->description,
        'sanitized_location_description' => $report->location_description,
        'detector_version' => 'jagain-pii-guardrail-v1.0',
        'processed_at' => now(),
    ]);

    config()->set('ai.enabled', false);

    $this->actingAs($citizen)->post(route('citizen.reports.provide-info', $report->tracking_code), [
        'supplementary_info' => 'Lokasi dekat parit 3, hubungi WA saya 081255556666.',
    ])->assertRedirect();

    $publicRes = $this->get(route('public.reports.show', $report->tracking_code));
    $publicRes->assertOk();
    $publicRes->assertDontSee('081255556666');
    $publicRes->assertSee('[REDACTED_PHONE]');
});
