<?php

use App\Enums\UserRole;
use App\Models\AiEvaluationRun;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('only admin can access AI intelligence and evaluation dashboard', function () {
    $community = User::factory()->create(['role' => UserRole::COMMUNITY]);
    $agency = User::factory()->create(['role' => UserRole::AGENCY]);
    $admin = User::factory()->create(['role' => UserRole::ADMIN]);

    $this->actingAs($community)->get(route('admin.ai.dashboard'))->assertForbidden();
    $this->actingAs($agency)->get(route('admin.ai.dashboard'))->assertForbidden();

    Http::fake([
        'http://127.0.0.1:8001/api/v1/health' => Http::response([
            'status' => 'ok',
            'service' => 'JAGAIN AI Microservice',
            'environment' => 'test',
            'models' => [],
            'telemetry' => ['total_inferences' => 0],
        ], 200),
    ]);

    $this->actingAs($admin)
        ->get(route('admin.ai.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/ai/dashboard')
            ->has('serviceHealth')
            ->has('stats')
        );
});

test('admin can execute evaluation benchmark and persist measured results', function () {
    config()->set('ai.enabled', true);
    config()->set('ai.base_url', 'http://127.0.0.1:8001');

    $admin = User::factory()->create(['role' => UserRole::ADMIN]);

    Http::fake([
        'http://127.0.0.1:8001/api/v1/evaluation/run' => Http::response([
            'schema_version' => '1.0',
            'run_uuid' => 'eval-uuid-001',
            'executed_at' => now()->toIso8601String(),
            'dataset_name' => 'JAGAIN Curated Benchmark',
            'dataset_version' => '1.0.0',
            'is_simulated_dataset' => true,
            'split' => 'test',
            'model_manifest' => ['embedding' => ['name' => 'MiniLM', 'status' => 'loaded']],
            'hardware_info' => ['accelerator' => 'CPU'],
            'modules' => [
                'triage' => ['measured' => true, 'dataset_size' => 30, 'f1_score' => 0.91],
                'privacy' => ['measured' => true, 'dataset_size' => 26, 'f1_score' => 0.98],
            ],
            'notes' => ['Simulated dataset'],
        ], 200),
    ]);

    $this->actingAs($admin)
        ->post(route('admin.ai.evaluate'), ['split' => 'test'])
        ->assertRedirect();

    $run = AiEvaluationRun::where('run_uuid', 'eval-uuid-001')->first();
    expect($run)->not->toBeNull();
    expect($run->dataset_size)->toBe(56);
    expect($run->is_simulated_dataset)->toBeTrue();
    expect($run->metrics['triage']['f1_score'])->toBe(0.91);
});
