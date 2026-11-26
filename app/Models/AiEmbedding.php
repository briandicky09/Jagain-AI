<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $report_id
 * @property string $embedding_model
 * @property string $model_version
 * @property int $dimensions
 * @property string $content_hash
 * @property bool $is_pretrained_ml
 * @property array<int, float> $embedding_vector
 * @property Carbon|null $generated_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiEmbedding extends Model
{
    protected $fillable = [
        'report_id',
        'embedding_model',
        'model_version',
        'dimensions',
        'content_hash',
        'is_pretrained_ml',
        'embedding_vector',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'dimensions' => 'integer',
            'is_pretrained_ml' => 'boolean',
            'embedding_vector' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Report, $this>
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}
