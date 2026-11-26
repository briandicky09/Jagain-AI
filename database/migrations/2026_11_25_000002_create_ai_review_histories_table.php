<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_review_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_analysis_id')->constrained('ai_analyses')->cascadeOnDelete();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision', 32); // AGREED, DISAGREED, NEEDS_RECHECK
            $table->string('overridden_severity', 24)->nullable();
            $table->text('feedback')->nullable();
            $table->timestamps();

            $table->index(['ai_analysis_id', 'created_at']);
            $table->index(['report_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_review_histories');
    }
};
