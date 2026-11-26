from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import (
    ConfidenceType,
    IncidentCategoryGuess,
    SeverityRecommendation,
)
from app.schemas.vision import ImageAnalysisResult


class TriageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=3, max_length=250)
    description: str = Field(..., min_length=5, max_length=5000)
    category: str | None = Field(default=None, max_length=100)
    location_description: str | None = Field(default=None, max_length=1000)
    additional_information: str | None = Field(default=None, max_length=3000)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    reported_occurrence_at: datetime | None = None
    has_evidence_image: bool = False
    image_base64: str | None = Field(default=None, max_length=8_000_000)
    image_filename: str | None = Field(default=None, max_length=255)

    @field_validator("title", "description")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank.")
        return cleaned


class TextAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    potential_category: IncidentCategoryGuess
    fire_indicators: list[str] = Field(default_factory=list, max_length=20)
    vegetation_or_land_types: list[str] = Field(default_factory=list, max_length=10)
    weather_conditions: list[str] = Field(default_factory=list, max_length=10)
    urgency_indicators: list[str] = Field(default_factory=list, max_length=10)
    smoke_mentioned: bool = False
    flames_mentioned: bool = False
    missing_information: list[str] = Field(default_factory=list, max_length=15)
    inconsistencies: list[str] = Field(default_factory=list, max_length=10)


class ConsistencyResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text_image_consistent: bool | None = None
    consistency_status: str = Field(..., min_length=1, max_length=64)
    notes: str = Field(..., min_length=1, max_length=600)


class TriageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_version: str = Field(default="1.0", max_length=16)
    schema_version: str = Field(default="1.0", max_length=16)
    report_id: str = Field(..., min_length=1, max_length=64)
    incident_category: IncidentCategoryGuess
    severity_recommendation: SeverityRecommendation
    severity_rationale: list[str] = Field(..., min_length=1, max_length=15)
    summary: str = Field(..., min_length=5, max_length=1000)
    text_analysis: TextAnalysisResult
    image_analysis: ImageAnalysisResult
    consistency: ConsistencyResult
    verification_flags: list[str] = Field(default_factory=list, max_length=15)
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_type: ConfidenceType
    confidence_explanation: str = Field(..., min_length=5, max_length=500)
    requires_human_review: bool = True
    model_name: str = Field(..., min_length=1, max_length=200)
    model_version: str = Field(..., min_length=1, max_length=64)
    processing_duration_ms: float = Field(..., ge=0.0)
