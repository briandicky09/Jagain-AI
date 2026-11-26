from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ImageQuality


class VisionObservationScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    smoke_plume: float = Field(..., ge=0.0, le=1.0)
    active_flames: float = Field(..., ge=0.0, le=1.0)
    burned_vegetation: float = Field(..., ge=0.0, le=1.0)
    forest_or_plantation: float = Field(..., ge=0.0, le=1.0)
    unrelated_scene: float = Field(..., ge=0.0, le=1.0)


class ImageAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analyzed: bool
    adapter_status: str = Field(..., min_length=1, max_length=64)
    model_name: str = Field(..., min_length=1, max_length=200)
    model_version: str = Field(..., min_length=1, max_length=64)
    smoke_detected: bool = False
    flame_detected: bool = False
    burned_vegetation_detected: bool = False
    forest_or_plantation_detected: bool = False
    appears_unrelated: bool = False
    image_quality: ImageQuality = ImageQuality.UNAVAILABLE
    visual_scores: VisionObservationScores | None = None
    width_px: int | None = Field(default=None, ge=1)
    height_px: int | None = Field(default=None, ge=1)
    observation_note: str = Field(..., min_length=1, max_length=500)
    limitations: str = Field(..., min_length=1, max_length=500)


class VisionAnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="1.0", max_length=16)
    result: ImageAnalysisResult
    processing_duration_ms: float = Field(..., ge=0.0)
