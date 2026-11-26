<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $source_report_id
 * @property int $candidate_report_id
 * @property float $semantic_similarity
 * @property float|null $geospatial_score
 * @property float|null $temporal_score
 * @property float|null $category_score
 * @property float $distance_meters
 * @property float $time_difference_minutes
 * @property float $duplicate_probability
 * @property string $recommendation
 * @property string|null $explanation
 * @property string|null $model_version
 * @property string $admin_decision
 * @property int|null $decided_by_user_id
 * @property string|null $decision_reason
 * @property Carbon|null $decided_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiDuplicateCandidate extends Model
{
    protected $fillable = [
        'source_report_id',
        'candidate_report_id',
        'semantic_similarity',
        'geospatial_score',
        'temporal_score',
        'category_score',
        'distance_meters',
        'time_difference_minutes',
        'duplicate_probability',
        'recommendation',
        'explanation',
        'model_version',
        'admin_decision',
        'decided_by_user_id',
        'decision_reason',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'semantic_similarity' => 'float',
            'geospatial_score' => 'float',
            'temporal_score' => 'float',
            'category_score' => 'float',
            'distance_meters' => 'float',
            'time_difference_minutes' => 'float',
            'duplicate_probability' => 'float',
            'decided_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Report, $this>
     */
    public function sourceReport(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'source_report_id');
    }

    /**
     * @return BelongsTo<Report, $this>
     */
    public function candidateReport(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'candidate_report_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }

    /**
     * @return HasMany<AiDuplicateDecision, $this>
     */
    public function decisions(): HasMany
    {
        return $this->hasMany(AiDuplicateDecision::class, 'ai_duplicate_candidate_id')->latest();
    }
}
