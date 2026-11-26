<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->string('analysis_type', 40)->default('MULTIMODAL_TRIAGE')->index();
            $table->string('analysis_status', 32)->default('COMPLETED')->index(); // COMPLETED, DEGRADED, FAILED
            $table->string('schema_version', 16)->default('1.0');
            $table->string('model_name', 200);
            $table->string('model_version', 64);
            $table->string('severity_recommendation', 24)->default('UNKNOWN')->index();
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->string('confidence_type', 32)->default('RULE_BASED');
            $table->boolean('requires_human_review')->default(true);
            $table->json('structured_result')->nullable();
            $table->float('processing_duration_ms')->nullable();
            $table->string('request_id', 128)->nullable()->index();
            $table->string('error_code', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['report_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_analyses');
    }
};
