<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $run_uuid
 * @property string $module
 * @property string $dataset_name
 * @property string $dataset_version
 * @property int $dataset_size
 * @property bool $is_simulated_dataset
 * @property array<string, mixed>|null $model_manifest
 * @property array<string, mixed>|null $metrics
 * @property array<string, mixed>|null $hardware_info
 * @property string|null $notes
 * @property int|null $triggered_by_user_id
 * @property Carbon|null $executed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class AiEvaluationRun extends Model
{
    protected $fillable = [
        'run_uuid',
        'module',
        'dataset_name',
        'dataset_version',
        'dataset_size',
        'is_simulated_dataset',
        'model_manifest',
        'metrics',
        'hardware_info',
        'notes',
        'triggered_by_user_id',
        'executed_at',
    ];

    protected function casts(): array
    {
        return [
            'dataset_size' => 'integer',
            'is_simulated_dataset' => 'boolean',
            'model_manifest' => 'array',
            'metrics' => 'array',
            'hardware_info' => 'array',
            'executed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }
}
