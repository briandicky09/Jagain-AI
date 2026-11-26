export type AiSeverityRecommendation =
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL'
    | 'UNKNOWN';

export type AiAnalysisStatus = 'COMPLETED' | 'DEGRADED' | 'FAILED';

export type AiConfidenceType =
    | 'MODEL_REPORTED'
    | 'CALIBRATED'
    | 'SIMILARITY_SCORE'
    | 'RULE_BASED'
    | 'UNCALIBRATED';

export type AiReviewDecision = 'AGREED' | 'DISAGREED' | 'NEEDS_RECHECK';

export type AiDuplicateRecommendation =
    | 'LIKELY_DUPLICATE'
    | 'POSSIBLE_DUPLICATE'
    | 'UNRELATED'
    | 'INSUFFICIENT_INFORMATION';

export type AiDuplicateAdminDecision =
    | 'PENDING'
    | 'CONFIRMED_DUPLICATE'
    | 'REJECTED';

export interface AiStructuredTextAnalysis {
    potential_category: string;
    fire_indicators: string[];
    vegetation_or_land_types: string[];
    weather_conditions: string[];
    urgency_indicators: string[];
    smoke_mentioned: boolean;
    flames_mentioned: boolean;
    missing_information: string[];
    inconsistencies: string[];
}

export interface AiStructuredImageAnalysis {
    analyzed: boolean;
    adapter_status: string;
    model_name: string;
    model_version: string;
    smoke_detected: boolean;
    flame_detected: boolean;
    burned_vegetation_detected: boolean;
    forest_or_plantation_detected: boolean;
    appears_unrelated: boolean;
    image_quality: 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
    visual_scores?: {
        smoke_plume: number;
        active_flames: number;
        burned_vegetation: number;
        forest_or_plantation: number;
        unrelated_scene: number;
    } | null;
    width_px?: number | null;
    height_px?: number | null;
    observation_note: string;
    limitations: string;
}

export interface AiStructuredConsistency {
    text_image_consistent: boolean | null;
    consistency_status: string;
    notes: string;
}

export interface AiTriageStructuredResult {
    analysis_version: string;
    schema_version: string;
    report_id: string;
    incident_category: string;
    severity_recommendation: AiSeverityRecommendation;
    severity_rationale: string[];
    summary: string;
    text_analysis: AiStructuredTextAnalysis;
    image_analysis: AiStructuredImageAnalysis;
    consistency: AiStructuredConsistency;
    verification_flags: string[];
    confidence: number;
    confidence_type: AiConfidenceType;
    confidence_explanation: string;
    requires_human_review: boolean;
    model_name: string;
    model_version: string;
    processing_duration_ms: number;
}

export interface AiReviewHistoryItem {
    id: number;
    ai_analysis_id: number;
    report_id: number;
    reviewer_user_id: number;
    decision: AiReviewDecision;
    overridden_severity: AiSeverityRecommendation | null;
    feedback: string | null;
    created_at: string;
    reviewer?: {
        id: number;
        name: string;
    } | null;
}

export interface AiAnalysisRecord {
    id: number;
    report_id: number;
    analysis_type: string;
    analysis_status: AiAnalysisStatus;
    schema_version: string;
    model_name: string;
    model_version: string;
    severity_recommendation: AiSeverityRecommendation;
    confidence_score: number | null;
    confidence_type: AiConfidenceType;
    requires_human_review: boolean;
    structured_result: AiTriageStructuredResult | null;
    processing_duration_ms: number | null;
    request_id: string | null;
    error_code: string | null;
    error_message: string | null;
    created_at: string;
    triggered_by?: {
        id: number;
        name: string;
    } | null;
    reviews?: AiReviewHistoryItem[];
}

export interface AiDuplicateDecisionItem {
    id: number;
    decision: 'CONFIRMED_DUPLICATE' | 'REJECTED';
    reason: string;
    created_at: string;
    decider?: {
        id: number;
        name: string;
    } | null;
}

export interface AiDuplicateCandidateRecord {
    id: number;
    source_report_id: number;
    candidate_report_id: number;
    semantic_similarity: number;
    geospatial_score: number | null;
    temporal_score: number | null;
    category_score: number | null;
    distance_meters: number;
    time_difference_minutes: number;
    duplicate_probability: number;
    recommendation: AiDuplicateRecommendation;
    explanation: string | null;
    model_version: string | null;
    admin_decision: AiDuplicateAdminDecision;
    decision_reason: string | null;
    decided_at: string | null;
    candidate_report?: {
        id: number;
        tracking_code?: string;
        report_number?: string;
        title: string;
        report_status: string;
        latitude: number;
        longitude: number;
        created_at: string;
        location_description?: string | null;
    } | null;
    decisions?: AiDuplicateDecisionItem[];
}

export interface AiPrivacyRecordSummary {
    id: number;
    pii_detected: boolean;
    redaction_applied: boolean;
    entity_counts: Record<string, number> | null;
    detector_version: string;
    processed_at: string | null;
}

export interface PublicPrivacyProtection {
    sanitized: boolean;
    redaction_applied: boolean;
    detector_version: string;
    processed_at: string | null;
}
