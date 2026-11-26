<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $ai_analysis_id
 * @property int $report_id
 * @property int $reviewer_user_id
 * @property string $decision
 * @property string|null $overridden_severity
 * @property string|null $feedback
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiReviewHistory extends Model
{
    protected $fillable = [
        'ai_analysis_id',
        'report_id',
        'reviewer_user_id',
        'decision',
        'overridden_severity',
        'feedback',
    ];

    /**
     * @return BelongsTo<AiAnalysis, $this>
     */
    public function analysis(): BelongsTo
    {
        return $this->belongsTo(AiAnalysis::class, 'ai_analysis_id');
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
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }
}
