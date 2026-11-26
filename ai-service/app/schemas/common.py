from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SeverityRecommendation(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class ConfidenceType(StrEnum):
    MODEL_REPORTED = "MODEL_REPORTED"
    CALIBRATED = "CALIBRATED"
    SIMILARITY_SCORE = "SIMILARITY_SCORE"
    RULE_BASED = "RULE_BASED"
    UNCALIBRATED = "UNCALIBRATED"


class ImageQuality(StrEnum):
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    UNAVAILABLE = "UNAVAILABLE"


class IncidentCategoryGuess(StrEnum):
    PEATLAND_FIRE = "PEATLAND_FIRE"
    FOREST_FIRE = "FOREST_FIRE"
    PLANTATION_FIRE = "PLANTATION_FIRE"
    BRUSH_FIRE = "BRUSH_FIRE"
    LAND_FIRE = "LAND_FIRE"
    NON_WILDFIRE = "NON_WILDFIRE"
    UNCLEAR = "UNCLEAR"


class DuplicateRecommendation(StrEnum):
    LIKELY_DUPLICATE = "LIKELY_DUPLICATE"
    POSSIBLE_DUPLICATE = "POSSIBLE_DUPLICATE"
    UNRELATED = "UNRELATED"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"


class PiiEntityType(StrEnum):
    PERSON_NAME = "PERSON_NAME"
    PHONE = "PHONE"
    NIK = "NIK"
    EMAIL = "EMAIL"
    RESIDENTIAL_ADDRESS = "RESIDENTIAL_ADDRESS"


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., min_length=1, max_length=64)
    message: str = Field(..., min_length=1, max_length=500)
    request_id: str = Field(..., min_length=1, max_length=128)
    details: dict[str, Any] | None = None


class ModelStatusInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    backend: str
    status: str
    is_pretrained_ml: bool
    details: str | None = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    environment: str
    models: dict[str, ModelStatusInfo] | None = None
    telemetry: dict[str, Any] | None = None
