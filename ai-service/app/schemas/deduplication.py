from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ConfidenceType, DuplicateRecommendation


class EmbeddingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str = Field(..., min_length=1, max_length=64)
    text: str = Field(..., min_length=3, max_length=6000)


class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="1.0", max_length=16)
    report_id: str
    embedding_model: str
    model_version: str
    dimensions: int = Field(..., ge=8, le=4096)
    content_hash: str
    is_pretrained_ml: bool
    vector: list[float] = Field(..., min_length=8)
    processing_duration_ms: float = Field(..., ge=0.0)


class CandidateReportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=250)
    description: str = Field(..., min_length=1, max_length=5000)
    category: str | None = Field(default=None, max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    created_at: datetime
    embedding_vector: list[float] | None = None


class DeduplicationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_report: CandidateReportInput
    candidates: list[CandidateReportInput] = Field(default_factory=list, max_length=100)
    likely_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    possible_threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class DuplicateCandidateResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str
    semantic_similarity: float = Field(..., ge=0.0, le=1.0)
    geospatial_score: float = Field(..., ge=0.0, le=1.0)
    temporal_score: float = Field(..., ge=0.0, le=1.0)
    category_score: float = Field(..., ge=0.0, le=1.0)
    distance_meters: float = Field(..., ge=0.0)
    time_difference_minutes: float = Field(..., ge=0.0)
    duplicate_probability: float = Field(..., ge=0.0, le=1.0)
    score_type: ConfidenceType = ConfidenceType.RULE_BASED
    recommendation: DuplicateRecommendation
    explanation: str = Field(..., min_length=5, max_length=600)


class DeduplicationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="1.0", max_length=16)
    source_report: str
    embedding_model: str
    model_version: str
    dimensions: int
    is_pretrained_ml: bool
    source_embedding: list[float]
    source_content_hash: str
    potential_duplicates: list[DuplicateCandidateResult]
    processing_duration_ms: float = Field(..., ge=0.0)
