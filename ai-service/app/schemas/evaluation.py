from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class EvaluationRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    modules: list[Literal["triage", "deduplication", "privacy", "vision"]] = Field(
        default_factory=lambda: ["triage", "deduplication", "privacy", "vision"]
    )
    split: Literal["all", "dev", "test"] = "test"


class EvaluationReportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="1.0", max_length=16)
    run_uuid: str
    executed_at: str
    dataset_name: str
    dataset_version: str
    is_simulated_dataset: bool = True
    split: str
    model_manifest: dict[str, Any]
    hardware_info: dict[str, Any]
    modules: dict[str, Any]
    notes: list[str] = Field(default_factory=list)
