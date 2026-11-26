<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->string('embedding_model', 200);
            $table->string('model_version', 64);
            $table->unsignedInteger('dimensions')->default(384);
            $table->string('content_hash', 64)->index();
            $table->boolean('is_pretrained_ml')->default(true);
            $table->json('embedding_vector');
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->unique(['report_id', 'embedding_model', 'model_version'], 'ai_embeddings_report_model_unique');
        });

        // Optional pgvector enhancement when running on PostgreSQL with vector extension available
        if (DB::getDriverName() === 'pgsql') {
            try {
                DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
                DB::statement('ALTER TABLE ai_embeddings ADD COLUMN IF NOT EXISTS vector_pg vector(384)');
                DB::statement('CREATE INDEX IF NOT EXISTS ai_embeddings_vector_pg_idx ON ai_embeddings USING hnsw (vector_pg vector_cosine_ops)');
            } catch (Throwable) {
                // Gracefully retain JSON vector storage when pgvector extension is unavailable
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_embeddings');
    }
};
