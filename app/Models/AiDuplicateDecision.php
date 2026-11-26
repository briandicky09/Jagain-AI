<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $ai_duplicate_candidate_id
 * @property int $decided_by_user_id
 * @property string $decision
 * @property string $reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiDuplicateDecision extends Model
{
    protected $fillable = [
        'ai_duplicate_candidate_id',
        'decided_by_user_id',
        'decision',
        'reason',
    ];

    /**
     * @return BelongsTo<AiDuplicateCandidate, $this>
     */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(AiDuplicateCandidate::class, 'ai_duplicate_candidate_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }
}
