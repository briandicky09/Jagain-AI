<?php

namespace App\Models;

use App\Enums\FireCondition;
use App\Enums\ReportStatus;
use App\Services\Ai\LocalPiiFallbackSanitizer;
use Carbon\CarbonImmutable;
use Database\Factories\ReportFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $tracking_code
 * @property string $report_number
 * @property int|null $created_by_user_id
 * @property int|null $category_id
 * @property string|null $category
 * @property string $title
 * @property string $description
 * @property float $latitude
 * @property float $longitude
 * @property string|null $province
 * @property string|null $regency_city
 * @property string|null $location_description
 * @property Carbon|CarbonImmutable|null $reported_occurrence_at
 * @property ReportStatus|string $report_status
 * @property FireCondition|string $fire_condition
 * @property string|null $fire_condition_source
 * @property Carbon|CarbonImmutable|null $fire_condition_observed_at
 * @property string|null $actual_fire_condition
 * @property string $visibility
 * @property bool $is_simulated
 * @property int $lock_version
 * @property string|null $admin_notes
 * @property string|null $information_requested
 * @property string|null $additional_information
 * @property string|null $close_reason
 * @property string|null $reporter_name
 * @property string|null $reporter_phone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Evidence> $evidence
 * @property-read Collection<int, ReportStatusHistory> $statusHistories
 */
class Report extends Model
{
    /** @use HasFactory<ReportFactory> */
    use HasFactory;

    protected $fillable = [
        'tracking_code',
        'report_number',
        'created_by_user_id',
        'category_id',
        'category',
        'title',
        'description',
        'latitude',
        'longitude',
        'province',
        'regency_city',
        'location_description',
        'reported_occurrence_at',
        'report_status',
        'fire_condition',
        'fire_condition_source',
        'fire_condition_observed_at',
        'actual_fire_condition',
        'visibility',
        'is_simulated',
        'lock_version',
        'admin_notes',
        'information_requested',
        'additional_information',
        'close_reason',
        'reporter_name',
        'reporter_phone',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'reported_occurrence_at' => 'datetime',
            'fire_condition_observed_at' => 'datetime',
            'is_simulated' => 'boolean',
            'lock_version' => 'integer',
            'report_status' => ReportStatus::class,
            'fire_condition' => FireCondition::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Report $report) {
            if (empty($report->tracking_code) && empty($report->report_number)) {
                $code = self::generateTrackingCode();
                $report->tracking_code = $code;
                $report->report_number = $code;
            } elseif (empty($report->tracking_code)) {
                $report->tracking_code = $report->report_number;
            } elseif (empty($report->report_number)) {
                $report->report_number = $report->tracking_code;
            }

            if (! isset($report->lock_version)) {
                $report->lock_version = 1;
            }

            if (empty($report->category) && ! empty($report->category_id)) {
                $cat = Category::find($report->category_id) ?? ReportCategory::find($report->category_id);
                $report->category = $cat?->slug ?? $cat?->name ?? 'umum';
            } elseif (empty($report->category)) {
                $report->category = 'umum';
            }
        });

        static::saved(function () {
            Cache::forget('public_homepage_data_v3');
            Cache::forget('public_map_default_payload_v3');
        });

        static::deleted(function () {
            Cache::forget('public_homepage_data_v3');
            Cache::forget('public_map_default_payload_v3');
        });
    }

    public static function generateTrackingCode(): string
    {
        $prefix = 'JGN-'.date('Ym').'-';
        do {
            $code = $prefix.strtoupper(Str::random(5));
        } while (self::where('tracking_code', $code)->orWhere('report_number', $code)->exists());

        return $code;
    }

    public static function generateReportNumber(): string
    {
        return self::generateTrackingCode();
    }

    public function getReportNumberAttribute(): ?string
    {
        return $this->attributes['report_number'] ?? $this->attributes['tracking_code'] ?? null;
    }

    public function getTrackingCodeAttribute(): ?string
    {
        return $this->attributes['tracking_code'] ?? $this->attributes['report_number'] ?? null;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->createdByUser();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->createdByUser();
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return class_exists(Category::class)
            ? $this->belongsTo(Category::class, 'category_id')
            : $this->belongsTo(ReportCategory::class, 'category_id');
    }

    public function getCategoryAttribute(): mixed
    {
        if ($this->relationLoaded('category')) {
            $cat = $this->getRelation('category');
            if ($cat) {
                return $cat;
            }
        }

        if (! empty($this->attributes['category_id'])) {
            $cat = Category::find($this->attributes['category_id']) ?? ReportCategory::find($this->attributes['category_id']);
            if ($cat) {
                $this->setRelation('category', $cat);

                return $cat;
            }
        }

        return $this->attributes['category'] ?? null;
    }

    /**
     * @return HasMany<Evidence, $this>
     */
    public function evidence(): HasMany
    {
        return $this->hasMany(Evidence::class, 'report_id');
    }

    /**
     * @return HasMany<ReportStatusHistory, $this>
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ReportStatusHistory::class, 'report_id')->orderBy('created_at', 'desc');
    }

    /**
     * @return HasMany<Assignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'report_id')->orderBy('created_at', 'desc');
    }

    /**
     * @return HasOne<Assignment, $this>
     */
    public function latestAssignment(): HasOne
    {
        return $this->hasOne(Assignment::class, 'report_id')->latestOfMany();
    }

    /**
     * @return HasMany<AiAnalysis, $this>
     */
    public function aiAnalyses(): HasMany
    {
        return $this->hasMany(AiAnalysis::class, 'report_id')->latest();
    }

    /**
     * @return HasOne<AiAnalysis, $this>
     */
    public function latestAiAnalysis(): HasOne
    {
        return $this->hasOne(AiAnalysis::class, 'report_id')->latestOfMany();
    }

    /**
     * @return HasMany<AiEmbedding, $this>
     */
    public function aiEmbeddings(): HasMany
    {
        return $this->hasMany(AiEmbedding::class, 'report_id');
    }

    /**
     * @return HasMany<AiDuplicateCandidate, $this>
     */
    public function duplicateCandidates(): HasMany
    {
        return $this->hasMany(AiDuplicateCandidate::class, 'source_report_id')
            ->orderByDesc('duplicate_probability');
    }

    /**
     * @return HasOne<AiPrivacyRecord, $this>
     */
    public function privacyRecord(): HasOne
    {
        return $this->hasOne(AiPrivacyRecord::class, 'report_id');
    }

    /**
     * Scope for public viewing (excludes RESTRICTED or PRIVATE reports).
     *
     * @param  Builder<$this>  $query
     */
    public function scopePubliclyVisible(Builder $query): void
    {
        $query->where('visibility', 'PUBLIC');
    }

    /**
     * Safely format for public view without any PII (reporter_name/reporter_phone are stripped).
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        $statusVal = $this->report_status instanceof ReportStatus ? $this->report_status->value : (string) $this->report_status;
        $statusLabel = $this->report_status instanceof ReportStatus ? $this->report_status->label() : (ReportStatus::tryFrom($statusVal)?->label() ?? $statusVal);

        $fireVal = $this->fire_condition instanceof FireCondition ? $this->fire_condition->value : (string) ($this->fire_condition ?? 'UNKNOWN');
        $fireLabel = $this->fire_condition instanceof FireCondition ? $this->fire_condition->label() : (FireCondition::tryFrom($fireVal)?->label() ?? $fireVal);

        $catObj = $this->category;
        $categoryData = null;
        if (is_object($catObj)) {
            $categoryData = [
                'id' => $catObj->id,
                'name' => $catObj->name,
                'slug' => $catObj->slug,
            ];
        } elseif (is_string($catObj) && ! empty($catObj)) {
            $categoryData = [
                'id' => $this->category_id ?? 0,
                'name' => ucfirst(str_replace(['-', '_'], ' ', $catObj)),
                'slug' => $catObj,
            ];
        }

        // Severity level categorization: RINGAN, SEDANG, BERAT
        $haystack = strtolower(($this->title ?? '').' '.($this->description ?? ''));
        $severity = 'SEDANG';
        $severityLabel = 'Sedang';

        if (
            str_contains($haystack, '[berat]') ||
            str_contains($haystack, 'tingkat keparahan berat') ||
            str_contains($haystack, 'kritis') ||
            str_contains($haystack, 'gambut dalam') ||
            $fireVal === 'OBSERVED_ACTIVE'
        ) {
            $severity = 'BERAT';
            $severityLabel = 'Berat';
        } elseif (
            str_contains($haystack, '[ringan]') ||
            str_contains($haystack, 'tingkat keparahan ringan') ||
            str_contains($haystack, 'terkendali') ||
            str_contains($haystack, 'asap sisa') ||
            str_contains($haystack, 'asap tipis') ||
            in_array($fireVal, ['OBSERVED_EXTINGUISHED', 'OBSERVED_CONTAINED'])
        ) {
            $severity = 'RINGAN';
            $severityLabel = 'Ringan';
        } else {
            $severity = 'SEDANG';
            $severityLabel = 'Sedang';
        }

        $privacyRecord = $this->relationLoaded('privacyRecord') ? $this->getRelation('privacyRecord') : null;
        if ($privacyRecord instanceof AiPrivacyRecord) {
            $publicTitle = $privacyRecord->sanitized_title ?? (string) $this->title;
            $publicDescription = $privacyRecord->sanitized_description ?? (string) $this->description;
            $publicLocation = $privacyRecord->sanitized_location_description ?? $this->location_description;
            $privacyProtection = [
                'sanitized' => true,
                'redaction_applied' => $privacyRecord->redaction_applied,
                'detector_version' => $privacyRecord->detector_version,
                'processed_at' => $privacyRecord->processed_at?->toIso8601String(),
            ];
        } else {
            $sanitizer = app(LocalPiiFallbackSanitizer::class);
            $sanitized = $sanitizer->sanitizeReportFields(
                (string) $this->title,
                (string) $this->description,
                $this->location_description,
            );
            $publicTitle = $sanitized['sanitized_title'];
            $publicDescription = $sanitized['sanitized_description'];
            $publicLocation = $sanitized['sanitized_location_description'];
            $privacyProtection = [
                'sanitized' => true,
                'redaction_applied' => $sanitized['redaction_applied'],
                'detector_version' => $sanitized['detector_version'],
                'processed_at' => null,
            ];
        }

        return [
            'id' => $this->id,
            'tracking_code' => $this->tracking_code,
            'report_number' => $this->report_number,
            'title' => $publicTitle,
            'description' => $publicDescription,
            'category' => $categoryData,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'province' => $this->province,
            'regency_city' => $this->regency_city,
            'location_description' => $publicLocation,
            'privacy_protection' => $privacyProtection,
            'reported_occurrence_at' => $this->reported_occurrence_at?->toIso8601String(),
            'report_status' => $statusVal,
            'status_label' => $statusLabel,
            'fire_condition' => $fireVal,
            'fire_condition_label' => $fireLabel,
            'fire_condition_source' => $this->fire_condition_source,
            'fire_condition_observed_at' => $this->fire_condition_observed_at?->toIso8601String(),
            'severity' => $severity,
            'severity_label' => $severityLabel,
            'is_simulated' => $this->is_simulated,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'evidence' => $this->relationLoaded('evidence')
                ? $this->evidence->where('visibility', 'PUBLIC')->map(fn ($ev) => [
                    'id' => $ev->id,
                    'file_path' => $ev->url ?: $ev->file_path,
                    'caption' => is_string($ev->caption)
                        ? app(LocalPiiFallbackSanitizer::class)->redactText($ev->caption)
                        : $ev->caption,
                    'media_type' => $ev->media_type,
                ])->values()->all()
                : [],
            'status_history' => $this->relationLoaded('statusHistories')
                ? $this->statusHistories->map(fn ($h) => [
                    'id' => $h->id,
                    'from_status' => $h->from_status instanceof ReportStatus ? $h->from_status->value : $h->from_status,
                    'to_status' => $h->to_status instanceof ReportStatus ? $h->to_status->value : $h->to_status,
                    'reason' => is_string($h->reason)
                        ? app(LocalPiiFallbackSanitizer::class)->redactText($h->reason)
                        : $h->reason,
                    'note' => is_string($h->note)
                        ? app(LocalPiiFallbackSanitizer::class)->redactText($h->note)
                        : $h->note,
                    'created_at' => $h->created_at?->toIso8601String(),
                ])->values()->all()
                : [],
            'active_agency' => ($this->relationLoaded('latestAssignment') && $this->latestAssignment?->relationLoaded('agency') && $this->latestAssignment?->agency) || ($this->relationLoaded('latestAssignment') && $this->latestAssignment?->agency) ? [
                'id' => $this->latestAssignment->agency->id,
                'name' => $this->latestAssignment->agency->name,
                'jurisdiction' => $this->latestAssignment->agency->jurisdiction,
            ] : null,
        ];
    }
}
