import type {
    AiAnalysisStatus,
    AiConfidenceType,
    AiDuplicateAdminDecision,
    AiDuplicateRecommendation,
    AiReviewDecision,
    AiSeverityRecommendation,
} from '@/types/ai';

/**
 * Pusat istilah antarmuka JAGAIN AI agar konsisten dan mudah dipahami
 * oleh masyarakat, petugas OPD, administrator operasional, dan evaluator AI.
 */

export const AI_SEVERITY_LABELS: Record<AiSeverityRecommendation, string> = {
    CRITICAL: 'Perkiraan Tingkat Keparahan: Kritis',
    HIGH: 'Perkiraan Tingkat Keparahan: Tinggi',
    MEDIUM: 'Perkiraan Tingkat Keparahan: Sedang',
    LOW: 'Perkiraan Tingkat Keparahan: Rendah',
    UNKNOWN: 'Tingkat Keparahan Belum Dapat Ditentukan',
};

export const AI_SEVERITY_SHORT_LABELS: Record<AiSeverityRecommendation, string> = {
    CRITICAL: 'Kritis',
    HIGH: 'Tinggi',
    MEDIUM: 'Sedang',
    LOW: 'Rendah',
    UNKNOWN: 'Belum Dapat Ditentukan',
};

export const AI_CATEGORY_LABELS: Record<string, string> = {
    PEATLAND_FIRE: 'Kebakaran Lahan Gambut',
    FOREST_FIRE: 'Kebakaran Hutan',
    PLANTATION_FIRE: 'Kebakaran Lahan Perkebunan',
    BRUSH_FIRE: 'Kebakaran Semak & Ilalang',
    LAND_FIRE: 'Kebakaran Lahan',
    NON_WILDFIRE: 'Kemungkinan Bukan Kebakaran Hutan/Lahan',
    UNCLEAR: 'Belum Dapat Dikelompokkan',
};

export const AI_CONFIDENCE_TYPE_LABELS: Record<AiConfidenceType, string> = {
    RULE_BASED: 'berdasarkan kelengkapan petunjuk dalam laporan',
    MODEL_REPORTED: 'berdasarkan perkiraan model AI',
    CALIBRATED: 'berdasarkan perhitungan terkalibrasi',
    SIMILARITY_SCORE: 'berdasarkan tingkat kemiripan laporan',
    UNCALIBRATED: 'bersifat perkiraan awal',
};

export const AI_ANALYSIS_STATUS_LABELS: Record<AiAnalysisStatus, string> = {
    COMPLETED: 'Selesai Dianalisis',
    DEGRADED: 'Selesai Sebagian',
    FAILED: 'Analisis Belum Berhasil',
};

export const AI_REVIEW_DECISION_LABELS: Record<AiReviewDecision, string> = {
    AGREED: 'Rekomendasi Sesuai',
    DISAGREED: 'Dikoreksi Admin',
    NEEDS_RECHECK: 'Perlu Diperiksa Ulang',
};

export const AI_IMAGE_QUALITY_LABELS: Record<string, string> = {
    GOOD: 'Baik & Jelas',
    FAIR: 'Cukup Jelas',
    POOR: 'Kurang Jelas / Buram',
    UNAVAILABLE: 'Tidak Tersedia',
};

export const AI_VISION_ADAPTER_LABELS: Record<string, string> = {
    CLIP_ZEROSHOT_READY: 'Analisis Foto Aktif',
    SIGLIP_ZEROSHOT_READY: 'Analisis Foto Aktif',
    UNAVAILABLE: 'Analisis Foto Tidak Aktif',
    MODEL_LOAD_FAILED: 'Analisis Foto Sedang Gangguan',
    NO_IMAGE: 'Tidak Ada Foto',
};

export const AI_DUPLICATE_RECOMMENDATION_LABELS: Record<
    AiDuplicateRecommendation,
    string
> = {
    LIKELY_DUPLICATE: 'Ditemukan laporan lain yang sangat mirip',
    POSSIBLE_DUPLICATE: 'Ditemukan laporan lain yang mirip',
    UNRELATED: 'Tidak berkaitan dengan laporan ini',
    INSUFFICIENT_INFORMATION: 'Informasi belum cukup untuk dibandingkan',
};

export const AI_DUPLICATE_ADMIN_DECISION_LABELS: Record<
    AiDuplicateAdminDecision,
    string
> = {
    PENDING: 'Menunggu Keputusan Admin',
    CONFIRMED_DUPLICATE: 'Dikonfirmasi Laporan Serupa',
    REJECTED: 'Bukan Laporan Serupa',
};

export const AI_PII_ENTITY_LABELS: Record<string, string> = {
    PERSON_NAME: 'Nama Pelapor',
    PHONE: 'Nomor Telepon',
    NIK: 'NIK / Nomor KTP',
    EMAIL: 'Alamat Email',
    RESIDENTIAL_ADDRESS: 'Alamat Rumah',
};

export const AI_VERIFICATION_FLAG_LABELS: Record<string, string> = {
    LOCATION_REQUIRES_VERIFICATION:
        'Koordinat dan lokasi kejadian tetap wajib diperiksa oleh petugas',
    POTENTIAL_NON_WILDFIRE_OR_TEST:
        'Perlu dicek apakah ini laporan uji coba atau bukan kebakaran hutan/lahan',
    INSUFFICIENT_DETAILS_FOR_TRIAGE:
        'Keterangan kejadian masih minim — perlu pemeriksaan manual lebih lanjut',
    PEATLAND_RISK_PRIORITY:
        'Indikasi area lahan gambut (api berisiko menjalar di bawah permukaan)',
    NEAR_SETTLEMENT_ALERT:
        'Lokasi berdekatan dengan permukiman warga atau jalan umum',
    IMAGE_APPEARS_UNRELATED:
        'Foto yang diunggah tampak tidak berkaitan dengan kebakaran hutan/lahan',
    POOR_IMAGE_QUALITY:
        'Foto kurang jelas atau resolusi rendah — perlu pemeriksaan manual',
    TEXT_IMAGE_INCONSISTENCY:
        'Isi cerita laporan dan foto bukti perlu dicocokkan langsung oleh admin',
    MISSING_CONTEXT_FIELDS:
        'Masih ada keterangan lokasi atau kondisi yang perlu dilengkapi pelapor',
};

export const AI_FIRE_INDICATOR_LABELS: Record<string, string> = {
    smoke_mentioned: 'Menyebutkan Asap',
    flames_mentioned: 'Menyebutkan Nyala Api',
    embers_mentioned: 'Menyebutkan Bara Api',
    ash_or_char_mentioned: 'Menyebutkan Abu / Bekas Terbakar',
    rapid_spread_mentioned: 'Menyebutkan Api Cepat Meluas',
    near_settlement_mentioned: 'Dekat Permukiman / Jalan',
    visibility_or_health_impact: 'Asap Mengganggu Pandangan / Pernapasan',
    peatland_mentioned: 'Menyebutkan Lahan Gambut',
    forest_mentioned: 'Menyebutkan Area Hutan',
    settlement_near: 'Dekat Permukiman',
    spread_risk: 'Berisiko Meluas',
    urgent_wind: 'Kondisi Angin Kencang',
};

export const AI_MISSING_INFO_LABELS: Record<string, string> = {
    fire_extent: 'perkiraan luas area terbakar',
    occurrence_time: 'waktu kejadian',
    specific_landmark: 'patokan lokasi sekitar',
    evidence_photo: 'foto bukti kejadian',
    wildfire_visual_or_sensory_details: 'rincian kondisi asap/api di lokasi',
};

export const AI_MODEL_MODULE_LABELS: Record<string, string> = {
    vision: 'Analisis Foto (Vision)',
    embedding: 'Deteksi Laporan Serupa (Teks)',
    ner: 'Perlindungan Data Pribadi (PII)',
};

export const AI_MODEL_STATUS_LABELS: Record<string, string> = {
    loaded: 'Aktif',
    lazy_ready: 'Siap Digunakan',
    error: 'Gangguan',
    unavailable: 'Tidak Aktif',
};

export const SATELLITE_CONFIDENCE_LABELS: Record<string, string> = {
    high: 'Tinggi',
    nominal: 'Sedang',
    low: 'Rendah',
};

export const OPERATIONAL_UPDATE_TYPE_LABELS: Record<string, string> = {
    PATROL: 'Patroli Pengecekan Lokasi',
    CONTAINMENT: 'Pembuatan Sekat Bakar',
    EXTINGUISHING: 'Pemadaman Aktif',
    STATUS_CHECK: 'Pendinginan & Pemantauan Asap',
    GENERAL_UPDATE: 'Pembaruan Lapangan Umum',
};

export const FIRE_CONDITION_LABELS: Record<string, string> = {
    UNKNOWN: 'Belum Dicek di Lapangan',
    REPORTED_ACTIVE: 'Dilaporkan Ada Api Aktif',
    OBSERVED_ACTIVE: 'Api Masih Aktif (Cek Lapangan)',
    OBSERVED_CONTAINED: 'Terkendali / Sekat Dibuat',
    OBSERVED_EXTINGUISHED: 'Api Padam / Sisa Asap',
};

export function getOperationalUpdateTypeLabel(updateType?: string | null): string {
    if (!updateType) return 'Pembaruan Lapangan';
    return (
        OPERATIONAL_UPDATE_TYPE_LABELS[updateType] ??
        updateType.replace(/_/g, ' ')
    );
}

export function getFireConditionLabel(condition?: string | null): string {
    if (!condition) return 'Belum Dicek di Lapangan';
    return FIRE_CONDITION_LABELS[condition] ?? condition.replace(/_/g, ' ');
}

export function getAiCategoryLabel(category?: string | null): string {
    if (!category) return 'Belum Dapat Dikelompokkan';
    return AI_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

export function getAiVerificationFlagLabel(flag: string): string {
    return AI_VERIFICATION_FLAG_LABELS[flag] ?? flag.replace(/_/g, ' ');
}

export function getAiFireIndicatorLabel(indicator: string): string {
    return AI_FIRE_INDICATOR_LABELS[indicator] ?? indicator.replace(/_/g, ' ');
}

export function getAiMissingInfoLabel(field: string): string {
    return AI_MISSING_INFO_LABELS[field] ?? field.replace(/_/g, ' ');
}

export function getAiImageQualityLabel(quality?: string | null): string {
    if (!quality) return 'Tidak Tersedia';
    return AI_IMAGE_QUALITY_LABELS[quality] ?? quality;
}

export function getAiVisionAdapterLabel(status?: string | null): string {
    if (!status) return 'Analisis Foto Tidak Aktif';
    return AI_VISION_ADAPTER_LABELS[status] ?? 'Status Analisis Foto';
}

export function getAiPiiEntityLabel(entityType: string): string {
    return AI_PII_ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, ' ');
}

export function getSatelliteConfidenceLabel(level?: string | null): string {
    if (!level) return 'Sedang';
    const key = level.trim().toLowerCase();
    return SATELLITE_CONFIDENCE_LABELS[key] ?? level;
}

export function formatPercentScore(score?: number | null): string {
    if (typeof score !== 'number' || Number.isNaN(score)) return '-';
    return `${Math.round(score * 100)}%`;
}

export function formatWibDateTime(iso?: string | null): string {
    if (!iso) return '-';
    try {
        return (
            new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(iso)) + ' WIB'
        );
    } catch {
        return iso;
    }
}

export function formatAiErrorMessage(
    errorCode?: string | null,
    errorMessage?: string | null,
): string {
    if (errorCode === 'AI_CONNECTION_ERROR') {
        return 'Layanan AI sedang tidak merespons atau melebihi batas waktu tunggu.';
    }
    if (errorCode === 'AI_DISABLED') {
        return 'Layanan analisis AI saat ini sedang dinonaktifkan.';
    }
    if (errorMessage && !errorMessage.includes('HTTP 500')) {
        return errorMessage;
    }
    return 'Terjadi kendala sementara saat menghubungi layanan AI. Anda tetap dapat memeriksa dan memverifikasi laporan secara manual.';
}
