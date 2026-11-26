<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $report_id
 * @property bool $pii_detected
 * @property bool $redaction_applied
 * @property array<string, int>|null $entity_counts
 * @property string|null $sanitized_title
 * @property string|null $sanitized_description
 * @property string|null $sanitized_location_description
 * @property string $detector_version
 * @property string|null $request_id
 * @property Carbon|null $processed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiPrivacyRecord extends Model
{
    protected $fillable = [
        'report_id',
        'pii_detected',
        'redaction_applied',
        'entity_counts',
        'sanitized_title',
        'sanitized_description',
        'sanitized_location_description',
        'detector_version',
        'request_id',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'pii_detected' => 'boolean',
            'redaction_applied' => 'boolean',
            'entity_counts' => 'array',
            'processed_at' => 'datetime',
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
