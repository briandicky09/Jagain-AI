<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_duplicate_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('candidate_report_id')->constrained('reports')->cascadeOnDelete();
            $table->decimal('semantic_similarity', 5, 4);
            $table->decimal('geospatial_score', 5, 4)->nullable();
            $table->decimal('temporal_score', 5, 4)->nullable();
            $table->decimal('category_score', 5, 4)->nullable();
            $table->float('distance_meters');
            $table->float('time_difference_minutes');
            $table->decimal('duplicate_probability', 5, 4);
            $table->string('recommendation', 40)->index(); // LIKELY_DUPLICATE, POSSIBLE_DUPLICATE, UNRELATED, INSUFFICIENT_INFORMATION
            $table->text('explanation')->nullable();
            $table->string('model_version', 64)->nullable();
            $table->string('admin_decision', 32)->default('PENDING')->index(); // PENDING, CONFIRMED_DUPLICATE, REJECTED
            $table->foreignId('decided_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('decision_reason')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->unique(['source_report_id', 'candidate_report_id'], 'ai_dup_pair_unique');
            $table->index(['source_report_id', 'duplicate_probability']);
        });

        Schema::create('ai_duplicate_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_duplicate_candidate_id')->constrained('ai_duplicate_candidates')->cascadeOnDelete();
            $table->foreignId('decided_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision', 32); // CONFIRMED_DUPLICATE, REJECTED
            $table->text('reason');
            $table->timestamps();

            $table->index(['ai_duplicate_candidate_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_duplicate_decisions');
        Schema::dropIfExists('ai_duplicate_candidates');
    }
};
