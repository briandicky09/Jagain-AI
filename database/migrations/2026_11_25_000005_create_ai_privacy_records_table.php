<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_privacy_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->unique()->constrained('reports')->cascadeOnDelete();
            $table->boolean('pii_detected')->default(false)->index();
            $table->boolean('redaction_applied')->default(false);
            $table->json('entity_counts')->nullable(); // Only aggregate counts per entity type, never raw PII
            $table->string('sanitized_title', 500)->nullable();
            $table->text('sanitized_description')->nullable();
            $table->text('sanitized_location_description')->nullable();
            $table->string('detector_version', 64);
            $table->string('request_id', 128)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_privacy_records');
    }
};
