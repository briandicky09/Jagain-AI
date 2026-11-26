<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_evaluation_runs', function (Blueprint $table) {
            $table->id();
            $table->string('run_uuid', 64)->unique();
            $table->string('module', 40)->default('ALL')->index();
            $table->string('dataset_name', 200);
            $table->string('dataset_version', 32);
            $table->unsignedInteger('dataset_size')->default(0);
            $table->boolean('is_simulated_dataset')->default(true);
            $table->json('model_manifest')->nullable();
            $table->json('metrics')->nullable();
            $table->json('hardware_info')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_evaluation_runs');
    }
};
