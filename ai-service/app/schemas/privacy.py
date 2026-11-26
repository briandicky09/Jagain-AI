from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import PiiEntityType


class PiiEntitySpan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_type: PiiEntityType
    start: int = Field(..., ge=0)
    end: int = Field(..., ge=1)
    detector: str = Field(..., min_length=1, max_length=64)
    confidence: float = Field(..., ge=0.0, le=1.0)
    replacement_token: str = Field(..., min_length=3, max_length=64)


class PrivacyRedactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str | None = Field(default=None, max_length=64)
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=6000)
    location_description: str | None = Field(default=None, max_length=1000)


class PrivacyRedactResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="1.0", max_length=16)
    detector_version: str = Field(..., min_length=1, max_length=64)
    pii_detected: bool
    redaction_applied: bool
    sanitized_title: str
    sanitized_description: str
    sanitized_location_description: str | None = None
    entity_counts: dict[str, int]
    spans_title: list[PiiEntitySpan] = Field(default_factory=list)
    spans_description: list[PiiEntitySpan] = Field(default_factory=list)
    spans_location: list[PiiEntitySpan] = Field(default_factory=list)
    processing_duration_ms: float = Field(..., ge=0.0)
