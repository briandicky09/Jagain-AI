<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $report_id
 * @property string $analysis_type
 * @property string $analysis_status
 * @property string $schema_version
 * @property string $model_name
 * @property string $model_version
 * @property string $severity_recommendation
 * @property float|null $confidence_score
 * @property string $confidence_type
 * @property bool $requires_human_review
 * @property array<string, mixed>|null $structured_result
 * @property float|null $processing_duration_ms
 * @property string|null $request_id
 * @property string|null $error_code
 * @property string|null $error_message
 * @property int|null $triggered_by_user_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiAnalysis extends Model
{
    /** @use HasFactory<Factory<self>> */
    use HasFactory;

    protected $fillable = [
        'report_id',
        'analysis_type',
        'analysis_status',
        'schema_version',
        'model_name',
        'model_version',
        'severity_recommendation',
        'confidence_score',
        'confidence_type',
        'requires_human_review',
        'structured_result',
        'processing_duration_ms',
        'request_id',
        'error_code',
        'error_message',
        'triggered_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'confidence_score' => 'float',
            'requires_human_review' => 'boolean',
            'structured_result' => 'array',
            'processing_duration_ms' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Report, $this>
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }

    /**
     * @return HasMany<AiReviewHistory, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(AiReviewHistory::class, 'ai_analysis_id')->latest();
    }
}
