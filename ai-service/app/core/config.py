from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the JAGAIN AI microservice."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_app_name: str = "JAGAIN AI Microservice"
    ai_env: Literal["development", "test", "production"] = "development"
    ai_log_level: str = "INFO"
    ai_service_secret: str = Field(default="change-me-local-shared-secret", min_length=8)

    ai_embedding_backend: Literal["sentence_transformer", "lightweight"] = "sentence_transformer"
    ai_embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    ai_vision_backend: Literal["clip", "siglip", "unavailable"] = "clip"
    ai_vision_model: str = "openai/clip-vit-base-patch32"
    ai_preload_models: bool = False

    ai_ner_backend: Literal["heuristic", "transformers"] = "heuristic"
    ai_ner_model: str = "cahya/bert-base-indonesian-NER"

    ai_max_image_bytes: int = Field(default=5 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    ai_max_request_bytes: int = Field(default=10 * 1024 * 1024, ge=4096, le=25 * 1024 * 1024)
    ai_rate_limit_per_minute: int = Field(default=120, ge=10, le=5000)

    database_url: str | None = None

    # Deduplication weights & thresholds
    ai_dedup_weight_semantic: float = Field(default=0.50, ge=0.0, le=1.0)
    ai_dedup_weight_geo: float = Field(default=0.30, ge=0.0, le=1.0)
    ai_dedup_weight_time: float = Field(default=0.15, ge=0.0, le=1.0)
    ai_dedup_weight_category: float = Field(default=0.05, ge=0.0, le=1.0)
    ai_dedup_likely_threshold: float = Field(default=0.78, ge=0.0, le=1.0)
    ai_dedup_possible_threshold: float = Field(default=0.55, ge=0.0, le=1.0)
    ai_dedup_max_radius_meters: float = Field(default=25000.0, gt=0.0)
    ai_dedup_max_time_minutes: float = Field(default=4320.0, gt=0.0)

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ai_env == "production":
            secret = self.ai_service_secret.strip()
            weak_secrets = {
                "change-me-local-shared-secret",
                "changeme",
                "secret",
                "password",
                "default",
            }
            if len(secret) < 32 or secret.lower() in weak_secrets:
                raise ValueError(
                    "AI_SERVICE_SECRET must be at least 32 non-default characters in production."
                )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
